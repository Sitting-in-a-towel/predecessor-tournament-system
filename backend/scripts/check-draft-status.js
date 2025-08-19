const postgres = require('../services/postgresql');

async function checkDraftStatus() {
  try {
    const result = await postgres.query('SELECT * FROM draft_sessions ORDER BY created_at DESC LIMIT 3');
    
    console.log('=== DRAFT SESSIONS STATUS ===\n');
    
    if (result.rows.length === 0) {
      console.log('No draft sessions found');
      return;
    }
    
    result.rows.forEach((draft, index) => {
      console.log(`${index + 1}. Draft ${draft.draft_id}:`);
      console.log(`   Status: ${draft.status}`);
      console.log(`   Phase: ${draft.current_phase}`);
      console.log(`   Team1 Connected: ${draft.team1_connected}`);
      console.log(`   Team2 Connected: ${draft.team2_connected}`);
      console.log(`   Team1 Captain: ${draft.team1_captain_id?.substring(0,8) || 'NULL'}...`);
      console.log(`   Team2 Captain: ${draft.team2_captain_id?.substring(0,8) || 'NULL'}...`);
      console.log(`   Created: ${draft.created_at}`);
      
      // Check if both should be connected
      const bothConnected = draft.team1_connected && draft.team2_connected;
      const readyToStart = bothConnected && (draft.status === 'Waiting' || draft.status === 'waiting');
      
      if (bothConnected) {
        console.log('   🟢 Both teams connected - should proceed to draft');
      } else {
        console.log('   🔴 Teams not connected - stuck in waiting');
      }
      
      if (readyToStart) {
        console.log('   ⚠️  ISSUE: Both connected but still in Waiting status');
      }
      
      console.log('');
    });
    
    // Check for connection issues
    const problematicDrafts = result.rows.filter(draft => {
      return (draft.team1_connected && draft.team2_connected) && 
             (draft.status === 'Waiting' || draft.status === 'waiting');
    });
    
    if (problematicDrafts.length > 0) {
      console.log('🚨 FOUND CONNECTION ISSUES:');
      console.log(`${problematicDrafts.length} drafts have both teams connected but are stuck in waiting`);
    }
    
  } catch (error) {
    console.error('Error checking draft status:', error);
  }
  process.exit(0);
}

checkDraftStatus();