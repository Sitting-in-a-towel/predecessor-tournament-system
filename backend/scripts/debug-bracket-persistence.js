const postgres = require('../services/postgresql');

async function debugBracketPersistence() {
  try {
    console.log('🔍 DEBUGGING BRACKET PERSISTENCE ISSUES...\n');
    
    // Check current tournament and bracket state
    const result = await postgres.query(`
      SELECT 
        t.name as tournament_name,
        t.id as tournament_id,
        tb.id as bracket_id,
        tb.is_published,
        tb.created_at,
        tb.updated_at,
        LENGTH(tb.bracket_data::text) as bracket_size,
        (tb.bracket_data->>'type') as bracket_type
      FROM tournaments t
      LEFT JOIN tournament_brackets tb ON tb.tournament_id = t.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);
    
    console.log('=== TOURNAMENT BRACKET STATUS ===');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Tournament: ${row.tournament_name}`);
      console.log(`   Tournament ID: ${row.tournament_id}`);
      console.log(`   Bracket ID: ${row.bracket_id || 'NONE'}`);
      console.log(`   Published: ${row.is_published || 'N/A'}`);
      console.log(`   Bracket Type: ${row.bracket_type || 'N/A'}`);
      console.log(`   Data Size: ${row.bracket_size || 0} characters`);
      console.log(`   Created: ${row.created_at || 'Never'}`);
      console.log(`   Updated: ${row.updated_at || 'Never'}`);
      
      if (row.is_published && !row.bracket_id) {
        console.log('   🚨 CRITICAL: Tournament marked as published but NO bracket data!');
      }
      
      console.log('');
    });
    
    // Check if there are orphaned bracket entries
    console.log('=== CHECKING FOR ORPHANED BRACKETS ===');
    const orphanedBrackets = await postgres.query(`
      SELECT tb.*, t.name as tournament_name
      FROM tournament_brackets tb
      LEFT JOIN tournaments t ON tb.tournament_id = t.id
      WHERE t.id IS NULL
    `);
    
    if (orphanedBrackets.rows.length > 0) {
      console.log(`Found ${orphanedBrackets.rows.length} orphaned bracket entries:`);
      orphanedBrackets.rows.forEach(bracket => {
        console.log(`  Bracket ID: ${bracket.id}`);
        console.log(`  Tournament ID: ${bracket.tournament_id} (NOT FOUND)`);
        console.log(`  Published: ${bracket.is_published}`);
        console.log(`  Created: ${bracket.created_at}`);
      });
    } else {
      console.log('✅ No orphaned brackets found');
    }
    
    // Check for drafts referencing tournaments
    console.log('\n=== CHECKING DRAFT MATCH REFERENCES ===');
    const draftMatches = await postgres.query(`
      SELECT 
        ds.draft_id,
        ds.tournament_id,
        t.name as tournament_name,
        tb.is_published as bracket_published,
        ds.created_at
      FROM draft_sessions ds
      LEFT JOIN tournaments t ON ds.tournament_id = t.id
      LEFT JOIN tournament_brackets tb ON tb.tournament_id = t.id
      ORDER BY ds.created_at DESC
      LIMIT 3
    `);
    
    console.log('Recent draft sessions:');
    draftMatches.rows.forEach(draft => {
      console.log(`  Draft: ${draft.draft_id}`);
      console.log(`  Tournament: ${draft.tournament_name || 'NOT FOUND'}`);
      console.log(`  Bracket Published: ${draft.bracket_published || 'NO BRACKET'}`);
      console.log(`  Created: ${draft.created_at}`);
      
      if (!draft.tournament_name) {
        console.log('  🚨 CRITICAL: Draft references non-existent tournament!');
      }
      
      console.log('');
    });
    
    console.log('🎯 SUMMARY OF ISSUES TO INVESTIGATE:');
    let issues = [];
    
    // Check for published tournaments without brackets
    const publishedWithoutBrackets = result.rows.filter(row => row.is_published && !row.bracket_id);
    if (publishedWithoutBrackets.length > 0) {
      issues.push(`${publishedWithoutBrackets.length} published tournaments missing bracket data`);
    }
    
    // Check for orphaned brackets
    if (orphanedBrackets.rows.length > 0) {
      issues.push(`${orphanedBrackets.rows.length} orphaned bracket entries`);
    }
    
    // Check for drafts with missing tournament references
    const orphanedDrafts = draftMatches.rows.filter(draft => !draft.tournament_name);
    if (orphanedDrafts.length > 0) {
      issues.push(`${orphanedDrafts.length} draft sessions with invalid tournament references`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious data integrity issues found');
    } else {
      issues.forEach(issue => console.log(`❌ ${issue}`));
    }
    
  } catch (error) {
    console.error('Error debugging bracket persistence:', error.message);
  }
  process.exit(0);
}

debugBracketPersistence();