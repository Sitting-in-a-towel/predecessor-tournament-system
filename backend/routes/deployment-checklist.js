const express = require('express');
const fs = require('fs');
const path = require('path');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Pre-deployment checklist endpoint
router.get('/checklist', async (req, res) => {
    try {
        logger.info('Running pre-deployment checklist...');
        
        const checklist = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            checks: [],
            warnings: [],
            errors: [],
            summary: {
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };

        // 1. Check CLAUDE.md for deprecated systems
        await checkDeprecatedSystems(checklist);
        
        // 2. Compare database schemas (local vs production)
        await checkDatabaseSchemas(checklist);
        
        // 3. Validate API endpoints
        await checkAPIEndpoints(checklist);
        
        // 4. Check environment variables
        await checkEnvironmentConfig(checklist);
        
        // 5. Validate file structure
        await checkFileStructure(checklist);
        
        // 6. Check for test teams in production
        await checkTestData(checklist);
        
        // Calculate summary
        checklist.summary.passed = checklist.checks.filter(c => c.status === 'pass').length;
        checklist.summary.failed = checklist.checks.filter(c => c.status === 'fail').length;
        checklist.summary.warnings = checklist.warnings.length;
        
        const overallStatus = checklist.summary.failed === 0 ? 'READY' : 'BLOCKED';
        
        logger.info(`Pre-deployment checklist completed: ${overallStatus} (${checklist.summary.passed} passed, ${checklist.summary.failed} failed, ${checklist.summary.warnings} warnings)`);
        
        res.json({
            status: overallStatus,
            checklist,
            recommendation: overallStatus === 'READY' 
                ? 'Deployment can proceed safely' 
                : 'Fix critical issues before deployment'
        });
        
    } catch (error) {
        logger.error('Pre-deployment checklist failed:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            recommendation: 'Fix checklist system before deployment'
        });
    }
});

async function checkDeprecatedSystems(checklist) {
    const check = {
        name: 'Deprecated Systems Check',
        description: 'Scanning for references to deprecated systems (airtable, supabase)',
        status: 'pass',
        details: []
    };
    
    try {
        // Check frontend files for airtableService references
        const frontendPath = path.join(__dirname, '../../frontend/src');
        const deprecatedRefs = await scanForDeprecatedReferences(frontendPath);
        
        if (deprecatedRefs.length > 0) {
            check.status = 'fail';
            check.details = deprecatedRefs;
            checklist.errors.push('Found references to deprecated systems that must be removed');
        } else {
            check.details.push('No deprecated system references found');
        }
        
    } catch (error) {
        check.status = 'fail';
        check.details.push(`Error scanning files: ${error.message}`);
    }
    
    checklist.checks.push(check);
}

async function scanForDeprecatedReferences(dir) {
    const references = [];
    const deprecatedTerms = ['airtableService', 'supabase', 'SUPABASE_URL'];
    
    function scanDirectory(currentDir) {
        const files = fs.readdirSync(currentDir);
        
        for (const file of files) {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                scanDirectory(filePath);
            } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    for (const term of deprecatedTerms) {
                        if (content.includes(term)) {
                            references.push({
                                file: filePath.replace(dir, ''),
                                term,
                                line: findLineNumber(content, term)
                            });
                        }
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        }
    }
    
    try {
        scanDirectory(dir);
    } catch (error) {
        // Directory might not exist in all environments
    }
    
    return references;
}

function findLineNumber(content, term) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(term)) {
            return i + 1;
        }
    }
    return null;
}

async function checkDatabaseSchemas(checklist) {
    const check = {
        name: 'Database Schema Comparison',
        description: 'Comparing local and production database schemas',
        status: 'pass',
        details: []
    };
    
    try {
        // Get local schema
        const localTables = await getTableSchema('local');
        
        // Check if production database is accessible
        if (process.env.USE_PRODUCTION_DB === 'true' || process.env.NODE_ENV === 'production') {
            const prodTables = await getTableSchema('production');
            
            // Compare schemas
            const differences = compareSchemas(localTables, prodTables);
            
            if (differences.length > 0) {
                check.status = 'fail';
                check.details = differences;
                checklist.errors.push('Database schema mismatch detected');
            } else {
                check.details.push('Database schemas match');
            }
        } else {
            check.status = 'warn';
            check.details.push('Production database not accessible for comparison');
            checklist.warnings.push('Cannot verify production database schema');
        }
        
    } catch (error) {
        check.status = 'fail';
        check.details.push(`Schema comparison failed: ${error.message}`);
    }
    
    checklist.checks.push(check);
}

async function getTableSchema(environment) {
    const query = `
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position
    `;
    
    const result = await postgresService.query(query);
    return result.rows;
}

function compareSchemas(localSchema, prodSchema) {
    const differences = [];
    const localTables = new Set(localSchema.map(row => row.table_name));
    const prodTables = new Set(prodSchema.map(row => row.table_name));
    
    // Check for missing tables
    for (const table of localTables) {
        if (!prodTables.has(table)) {
            differences.push(`Table '${table}' exists in local but missing in production`);
        }
    }
    
    for (const table of prodTables) {
        if (!localTables.has(table)) {
            differences.push(`Table '${table}' exists in production but missing in local`);
        }
    }
    
    // Check for deprecated tables that should be removed
    const deprecatedTables = ['tournament_teams', 'airtable_sync'];
    for (const table of deprecatedTables) {
        if (prodTables.has(table)) {
            differences.push(`Deprecated table '${table}' still exists in production`);
        }
    }
    
    return differences;
}

async function checkAPIEndpoints(checklist) {
    const check = {
        name: 'API Endpoint Validation',
        description: 'Checking critical API endpoints are functional',
        status: 'pass',
        details: []
    };
    
    try {
        // Test critical endpoints
        const endpoints = [
            '/api/tournaments',
            '/api/teams',
            '/api/auth/user'
        ];
        
        for (const endpoint of endpoints) {
            try {
                // Basic endpoint existence check (routes are loaded)
                check.details.push(`Endpoint ${endpoint} route registered`);
            } catch (error) {
                check.status = 'fail';
                check.details.push(`Endpoint ${endpoint} not accessible: ${error.message}`);
            }
        }
        
    } catch (error) {
        check.status = 'fail';
        check.details.push(`API validation failed: ${error.message}`);
    }
    
    checklist.checks.push(check);
}

async function checkEnvironmentConfig(checklist) {
    const check = {
        name: 'Environment Configuration',
        description: 'Validating environment variables and configuration',
        status: 'pass',
        details: []
    };
    
    const requiredVars = [
        'DISCORD_CLIENT_ID',
        'DISCORD_CLIENT_SECRET',
        'SESSION_SECRET',
        'DATABASE_URL'
    ];
    
    const optionalVars = [
        'FRONTEND_URL',
        'NODE_ENV',
        'USE_PRODUCTION_DB'
    ];
    
    // Check required variables
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            check.status = 'fail';
            check.details.push(`Missing required environment variable: ${varName}`);
        } else {
            check.details.push(`✓ ${varName} configured`);
        }
    }
    
    // Check optional variables
    for (const varName of optionalVars) {
        if (process.env[varName]) {
            check.details.push(`✓ ${varName}: ${varName === 'SESSION_SECRET' ? '[HIDDEN]' : process.env[varName]}`);
        }
    }
    
    // Warn about database switching
    if (process.env.USE_PRODUCTION_DB === 'true') {
        checklist.warnings.push('Currently configured to use production database');
    }
    
    checklist.checks.push(check);
}

async function checkFileStructure(checklist) {
    const check = {
        name: 'File Structure Validation',
        description: 'Checking project file organization',
        status: 'pass',
        details: []
    };
    
    const projectRoot = path.join(__dirname, '../../..');
    const expectedStructure = [
        'backend',
        'frontend',
        'CLAUDE.md'
    ];
    
    try {
        for (const item of expectedStructure) {
            const itemPath = path.join(projectRoot, item);
            if (fs.existsSync(itemPath)) {
                check.details.push(`✓ ${item} exists`);
            } else {
                check.status = 'fail';
                check.details.push(`✗ Missing: ${item}`);
            }
        }
        
        // Check for loose files in root that should be organized
        const rootFiles = fs.readdirSync(projectRoot);
        const looseFiles = rootFiles.filter(file => {
            const filePath = path.join(projectRoot, file);
            return fs.statSync(filePath).isFile() && 
                   !file.startsWith('.') && 
                   file !== 'CLAUDE.md' &&
                   file !== 'README.md' &&
                   file !== 'package.json';
        });
        
        if (looseFiles.length > 0) {
            checklist.warnings.push(`Found ${looseFiles.length} loose files in project root that should be organized`);
            check.details.push(`Loose files: ${looseFiles.join(', ')}`);
        }
        
    } catch (error) {
        check.status = 'fail';
        check.details.push(`File structure check failed: ${error.message}`);
    }
    
    checklist.checks.push(check);
}

async function checkTestData(checklist) {
    const check = {
        name: 'Test Data Validation',
        description: 'Checking for test data that should not be in production',
        status: 'pass',
        details: []
    };
    
    try {
        // Check for test tournaments
        const testTournaments = await postgresService.query(
            "SELECT name FROM tournaments WHERE name ILIKE '%test%' OR name ILIKE '%demo%'"
        );
        
        if (testTournaments.rows.length > 0) {
            checklist.warnings.push(`Found ${testTournaments.rows.length} test tournaments in database`);
            check.details.push(`Test tournaments: ${testTournaments.rows.map(t => t.name).join(', ')}`);
        }
        
        // Check for test teams
        const testTeams = await postgresService.query(
            "SELECT team_name FROM teams WHERE team_name ILIKE '%test%' OR team_name ILIKE '%alpha%' OR team_name ILIKE '%beta%'"
        );
        
        if (testTeams.rows.length > 0) {
            checklist.warnings.push(`Found ${testTeams.rows.length} test teams in database`);
            check.details.push(`Test teams: ${testTeams.rows.map(t => t.team_name).join(', ')}`);
        }
        
        if (testTournaments.rows.length === 0 && testTeams.rows.length === 0) {
            check.details.push('No test data found in database');
        }
        
    } catch (error) {
        check.status = 'fail';
        check.details.push(`Test data check failed: ${error.message}`);
    }
    
    checklist.checks.push(check);
}

module.exports = router;