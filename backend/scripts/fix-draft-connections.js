const postgres = require('../services/postgresql');

async function fixDraftConnections() {
  try {
    console.log('🔧 Fixing draft connection issues...');
    
    // Find drafts that are in progress but teams aren't connected
    const problematicDrafts = await postgres.query(`
      SELECT draft_id, status, current_phase, team1_connected, team2_connected,
             team1_captain_id, team2_captain_id
      FROM draft_sessions 
      WHERE (current_phase LIKE '%Ban%' OR current_phase LIKE '%Pick%' OR status = 'In Progress')
      AND (team1_connected = FALSE OR team2_connected = FALSE)
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${problematicDrafts.rows.length} drafts with connection issues`);
    
    for (const draft of problematicDrafts.rows) {
      console.log(`\nFixing draft: ${draft.draft_id}`);
      console.log(`  Current state: ${draft.status} - ${draft.current_phase}`);
      console.log(`  Team1 connected: ${draft.team1_connected}`);
      console.log(`  Team2 connected: ${draft.team2_connected}`);
      
      // Update both teams as connected since they're already in draft phase
      await postgres.query(`
        UPDATE draft_sessions 
        SET team1_connected = TRUE,
            team2_connected = TRUE,
            both_teams_connected_at = COALESCE(both_teams_connected_at, NOW())
        WHERE draft_id = $1
      `, [draft.draft_id]);
      
      console.log('  ✅ Fixed: Both teams now marked as connected');
    }
    
    if (problematicDrafts.rows.length > 0) {
      console.log(`\n🎉 Fixed ${problematicDrafts.rows.length} draft connection issues!`);
      console.log('Teams should now be able to proceed with their draft sessions.');
    } else {
      console.log('\n✅ No connection issues found - all drafts are properly connected.');
    }
    
  } catch (error) {
    console.error('Error fixing draft connections:', error);
  }
  process.exit(0);
}

fixDraftConnections();