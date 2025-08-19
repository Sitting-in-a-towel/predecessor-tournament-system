#!/usr/bin/env node
/**
 * Comprehensive ID Flow Debugging Script
 * 
 * This script analyzes the dual ID system throughout the codebase
 * and identifies inconsistencies that cause the bracket/draft issues.
 */

const postgresService = require('../services/postgresql');
const fs = require('fs').promises;
const path = require('path');

class IDFlowDebugger {
  constructor() {
    this.issues = [];
    this.recommendations = [];
    this.dbStats = {
      tournaments: { total: 0, withBrackets: 0, withDrafts: 0 },
      teams: { total: 0, registered: 0 },
      users: { total: 0, captains: 0 }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '📍';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async analyzeDatabase() {
    this.log('=== DATABASE ID ANALYSIS ===', 'info');
    
    try {
      // Analyze tournaments table
      const tournamentsQuery = `
        SELECT 
          id,
          tournament_id,
          name,
          CASE 
            WHEN id::text = tournament_id::text THEN 'CONSISTENT'
            ELSE 'INCONSISTENT'
          END as id_consistency
        FROM tournaments
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const tournaments = await postgresService.query(tournamentsQuery);
      this.dbStats.tournaments.total = tournaments.rows.length;
      
      this.log(`Found ${tournaments.rows.length} tournaments:`);
      tournaments.rows.forEach(t => {
        const status = t.id === t.tournament_id ? '✅' : '❌';
        this.log(`  ${status} ${t.name}: id=${t.id.substring(0,8)}... tournament_id=${t.tournament_id?.substring(0,8) || 'NULL'}...`);
        
        if (t.id !== t.tournament_id) {
          this.issues.push({
            type: 'ID_MISMATCH',
            table: 'tournaments',
            record: t.name,
            issue: `Primary key 'id' (${t.id}) doesn't match 'tournament_id' (${t.tournament_id})`
          });
        }
      });

      // Check bracket relationships
      const bracketQuery = `
        SELECT 
          tb.tournament_id,
          t.id as tournament_pk_id,
          t.tournament_id as tournament_public_id,
          t.name,
          CASE 
            WHEN tb.tournament_id = t.id THEN 'CORRECT_PK'
            WHEN tb.tournament_id = t.tournament_id THEN 'USING_PUBLIC_ID' 
            ELSE 'BROKEN_RELATIONSHIP'
          END as relationship_status
        FROM tournament_brackets tb
        LEFT JOIN tournaments t ON tb.tournament_id = t.id
        ORDER BY tb.created_at DESC
        LIMIT 5
      `;
      
      const brackets = await postgresService.query(bracketQuery);
      this.dbStats.tournaments.withBrackets = brackets.rows.length;
      
      this.log(`\nFound ${brackets.rows.length} tournament brackets:`);
      brackets.rows.forEach(b => {
        const status = b.relationship_status === 'CORRECT_PK' ? '✅' : '❌';
        this.log(`  ${status} ${b.name}: ${b.relationship_status}`);
        
        if (b.relationship_status !== 'CORRECT_PK') {
          this.issues.push({
            type: 'BROKEN_FOREIGN_KEY',
            table: 'tournament_brackets',
            record: b.name,
            issue: `Bracket references tournament incorrectly: ${b.relationship_status}`
          });
        }
      });

      // Check draft relationships  
      const draftQuery = `
        SELECT 
          ds.tournament_id,
          t.id as tournament_pk_id,
          t.tournament_id as tournament_public_id,
          t.name,
          CASE 
            WHEN ds.tournament_id = t.id THEN 'CORRECT_PK'
            WHEN ds.tournament_id = t.tournament_id THEN 'USING_PUBLIC_ID'
            ELSE 'BROKEN_RELATIONSHIP'
          END as relationship_status
        FROM draft_sessions ds
        LEFT JOIN tournaments t ON ds.tournament_id = t.id
        ORDER BY ds.created_at DESC
        LIMIT 5
      `;
      
      const drafts = await postgresService.query(draftQuery);
      this.dbStats.tournaments.withDrafts = drafts.rows.length;
      
      this.log(`\nFound ${drafts.rows.length} draft sessions:`);
      drafts.rows.forEach(d => {
        const status = d.relationship_status === 'CORRECT_PK' ? '✅' : '❌';
        this.log(`  ${status} ${d.name}: ${d.relationship_status}`);
        
        if (d.relationship_status !== 'CORRECT_PK') {
          this.issues.push({
            type: 'BROKEN_FOREIGN_KEY',
            table: 'draft_sessions',
            record: d.name,
            issue: `Draft references tournament incorrectly: ${d.relationship_status}`
          });
        }
      });

      // Analyze teams table
      const teamsQuery = `
        SELECT 
          id,
          team_id,
          team_name,
          captain_id,
          CASE 
            WHEN captain_id IS NOT NULL THEN 'HAS_CAPTAIN'
            ELSE 'NO_CAPTAIN'
          END as captain_status
        FROM teams
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const teams = await postgresService.query(teamsQuery);
      this.dbStats.teams.total = teams.rows.length;
      
      this.log(`\nFound ${teams.rows.length} teams:`);
      teams.rows.forEach(t => {
        const status = t.captain_status === 'HAS_CAPTAIN' ? '✅' : '❌';
        this.log(`  ${status} ${t.team_name}: id=${t.id.substring(0,8)}... team_id=${t.team_id} captain=${t.captain_id?.substring(0,8) || 'NULL'}...`);
      });

      // Check team registrations
      const registrationQuery = `
        SELECT 
          tr.team_id as registration_team_ref,
          t.id as team_pk_id,
          t.team_id as team_public_id,
          t.team_name,
          tn.name as tournament_name,
          CASE 
            WHEN tr.team_id = t.id THEN 'CORRECT_PK'
            WHEN tr.team_id = t.team_id THEN 'USING_PUBLIC_ID'
            ELSE 'BROKEN_RELATIONSHIP'
          END as relationship_status
        FROM tournament_registrations tr
        LEFT JOIN teams t ON tr.team_id = t.id
        LEFT JOIN tournaments tn ON tr.tournament_id = tn.id
        ORDER BY tr.registered_at DESC
        LIMIT 5
      `;
      
      try {
        const registrations = await postgresService.query(registrationQuery);
        this.dbStats.teams.registered = registrations.rows.length;
        
        this.log(`\nFound ${registrations.rows.length} team registrations:`);
        registrations.rows.forEach(r => {
          const status = r.relationship_status === 'CORRECT_PK' ? '✅' : '❌';
          this.log(`  ${status} ${r.team_name} in ${r.tournament_name}: ${r.relationship_status}`);
          
          if (r.relationship_status !== 'CORRECT_PK') {
            this.issues.push({
              type: 'BROKEN_FOREIGN_KEY',
              table: 'tournament_registrations',
              record: `${r.team_name} -> ${r.tournament_name}`,
              issue: `Registration references team incorrectly: ${r.relationship_status}`
            });
          }
        });
      } catch (err) {
        this.log('tournament_registrations table not found - this explains registration issues!', 'warning');
        this.issues.push({
          type: 'MISSING_TABLE',
          table: 'tournament_registrations',
          record: 'N/A',
          issue: 'Table does not exist - registrations cannot work'
        });
      }

    } catch (error) {
      this.log(`Database analysis failed: ${error.message}`, 'error');
    }
  }

  async analyzeCodePatterns() {
    this.log('\n=== CODE PATTERN ANALYSIS ===', 'info');
    
    const filesToCheck = [
      'backend/routes/brackets.js',
      'backend/routes/drafts.js', 
      'backend/routes/tournaments.js',
      'backend/routes/teams.js',
      'frontend/src/components/Admin/TournamentManagement.js',
      'frontend/src/components/Tournament/TournamentDrafts.js'
    ];

    for (const filePath of filesToCheck) {
      try {
        const fullPath = path.resolve(__dirname, '..', '..', filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        this.analyzeFileForIDPatterns(filePath, content);
      } catch (error) {
        this.log(`Could not analyze ${filePath}: ${error.message}`, 'warning');
      }
    }
  }

  analyzeFileForIDPatterns(filePath, content) {
    const patterns = {
      // Database queries that might be problematic
      'WHERE tournament_id = \\$\\d+': 'Uses tournament_id in WHERE clause',
      'WHERE id = \\$\\d+': 'Uses id in WHERE clause', 
      '\\.tournament_id': 'References tournament_id field',
      '\\.team_id': 'References team_id field',
      '\\.user_id': 'References user_id field',
      
      // API validation patterns
      'isUUID\\(\\)': 'Validates as UUID',
      'notEmpty\\(\\)': 'Validates as non-empty string',
      
      // Frontend ID usage
      'team\\.id': 'Uses team.id in frontend',
      'team\\.team_id': 'Uses team.team_id in frontend',
      'tournament\\.id': 'Uses tournament.id in frontend',
      'tournament\\.tournament_id': 'Uses tournament.tournament_id in frontend'
    };

    const lines = content.split('\n');
    let foundPatterns = {};

    lines.forEach((line, index) => {
      Object.entries(patterns).forEach(([regex, description]) => {
        if (new RegExp(regex).test(line)) {
          if (!foundPatterns[description]) {
            foundPatterns[description] = [];
          }
          foundPatterns[description].push({
            line: index + 1,
            code: line.trim()
          });
        }
      });
    });

    if (Object.keys(foundPatterns).length > 0) {
      this.log(`\n📁 ${filePath}:`);
      Object.entries(foundPatterns).forEach(([pattern, occurrences]) => {
        this.log(`  🔍 ${pattern}: ${occurrences.length} occurrences`);
        occurrences.slice(0, 2).forEach(occ => {
          this.log(`    Line ${occ.line}: ${occ.code}`);
        });
        if (occurrences.length > 2) {
          this.log(`    ... and ${occurrences.length - 2} more`);
        }
      });
    }
  }

  async generateRecommendations() {
    this.log('\n=== RECOMMENDATIONS ===', 'info');
    
    // Analyze the issues found
    const hasIDMismatches = this.issues.some(i => i.type === 'ID_MISMATCH');
    const hasBrokenFKs = this.issues.some(i => i.type === 'BROKEN_FOREIGN_KEY');
    const hasMissingTables = this.issues.some(i => i.type === 'MISSING_TABLE');

    if (hasIDMismatches) {
      this.recommendations.push({
        priority: 'HIGH',
        action: 'STANDARDIZE_IDS',
        description: 'Make tournaments.id and tournaments.tournament_id consistent',
        implementation: 'Run migration script to sync ID fields'
      });
    }

    if (hasBrokenFKs) {
      this.recommendations.push({
        priority: 'CRITICAL', 
        action: 'FIX_FOREIGN_KEYS',
        description: 'Update all foreign key relationships to use correct ID format',
        implementation: 'Update bracket and draft queries to use proper tournament.id references'
      });
    }

    if (hasMissingTables) {
      this.recommendations.push({
        priority: 'CRITICAL',
        action: 'CREATE_MISSING_TABLES', 
        description: 'Create tournament_registrations table',
        implementation: 'Run table creation script with proper foreign key constraints'
      });
    }

    // API validation recommendations
    this.recommendations.push({
      priority: 'MEDIUM',
      action: 'STANDARDIZE_VALIDATION',
      description: 'Make API validation consistent with actual ID formats used',
      implementation: 'Update express-validator rules to match frontend ID usage patterns'
    });

    // Frontend consistency recommendations  
    this.recommendations.push({
      priority: 'LOW',
      action: 'FRONTEND_CONSISTENCY',
      description: 'Standardize frontend ID field usage',
      implementation: 'Use team.team_id and tournament.tournament_id consistently for display'
    });

    this.log('\n🎯 RECOMMENDED ACTIONS (in order of priority):');
    this.recommendations
      .sort((a, b) => {
        const priority = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
        return priority[a.priority] - priority[b.priority];
      })
      .forEach((rec, index) => {
        this.log(`\n${index + 1}. ${rec.action} (${rec.priority} Priority)`);
        this.log(`   📋 ${rec.description}`);
        this.log(`   🔧 ${rec.implementation}`);
      });
  }

  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.resolve(__dirname, `id-flow-analysis-${timestamp}.md`);
    
    let report = `# ID Flow Analysis Report
Generated: ${new Date().toISOString()}

## Summary
- Total Issues Found: ${this.issues.length}
- Critical Issues: ${this.issues.filter(i => ['MISSING_TABLE', 'BROKEN_FOREIGN_KEY'].includes(i.type)).length}
- Recommendations: ${this.recommendations.length}

## Database Statistics
- Tournaments: ${this.dbStats.tournaments.total} total, ${this.dbStats.tournaments.withBrackets} with brackets, ${this.dbStats.tournaments.withDrafts} with drafts
- Teams: ${this.dbStats.teams.total} total, ${this.dbStats.teams.registered} registered
- Users: ${this.dbStats.users.total} total, ${this.dbStats.users.captains} captains

## Issues Found
`;

    this.issues.forEach((issue, index) => {
      report += `
### ${index + 1}. ${issue.type} - ${issue.table}
**Record:** ${issue.record}
**Issue:** ${issue.issue}
`;
    });

    report += `
## Recommendations
`;

    this.recommendations.forEach((rec, index) => {
      report += `
### ${index + 1}. ${rec.action} (${rec.priority} Priority)
**Description:** ${rec.description}
**Implementation:** ${rec.implementation}
`;
    });

    report += `
## Next Steps
1. Review this analysis with the development team
2. Implement recommendations in priority order
3. Test each fix thoroughly before proceeding to the next
4. Re-run this analysis after each fix to verify improvements

## Files Analyzed
- backend/routes/brackets.js
- backend/routes/drafts.js  
- backend/routes/tournaments.js
- backend/routes/teams.js
- frontend/src/components/Admin/TournamentManagement.js
- frontend/src/components/Tournament/TournamentDrafts.js
`;

    try {
      await fs.writeFile(reportPath, report);
      this.log(`\n📄 Full report saved to: ${reportPath}`, 'success');
    } catch (error) {
      this.log(`Failed to save report: ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🚀 Starting comprehensive ID flow analysis...', 'info');
    
    try {
      await this.analyzeDatabase();
      await this.analyzeCodePatterns();
      await this.generateRecommendations();
      await this.generateReport();
      
      this.log('\n✅ Analysis complete!', 'success');
      this.log(`Found ${this.issues.length} issues with ${this.recommendations.length} recommendations.`, 'info');
      
      if (this.issues.filter(i => ['MISSING_TABLE', 'BROKEN_FOREIGN_KEY'].includes(i.type)).length > 0) {
        this.log('⚠️  CRITICAL issues found - immediate action required!', 'warning');
      }
      
    } catch (error) {
      this.log(`Analysis failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the analysis if called directly
if (require.main === module) {
  const analyzer = new IDFlowDebugger();
  analyzer.run().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = IDFlowDebugger;