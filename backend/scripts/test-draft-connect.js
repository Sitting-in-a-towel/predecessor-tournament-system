const postgres = require('../services/postgresql');
const axios = require('axios');

async function testDraftConnect() {
  try {
    // Get the most recent draft
    const result = await postgres.query('SELECT * FROM draft_sessions ORDER BY created_at DESC LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('No draft sessions found');
      return;
    }
    
    const draft = result.rows[0];
    console.log(`Testing draft connect for: ${draft.draft_id}`);
    console.log(`Current status: ${draft.status}`);
    console.log(`Team1 connected: ${draft.team1_connected}`);
    console.log(`Team2 connected: ${draft.team2_connected}`);
    
    // Test the connect endpoint (without auth - expect 401)
    try {
      console.log('\n🧪 Testing connect endpoint (no auth)...');
      const response = await axios.post(`http://localhost:3001/api/draft/${draft.draft_id}/connect`);
      console.log('Unexpected success:', response.data);
    } catch (error) {
      console.log(`Expected auth error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
    
    // Check if the draft has valid team captain IDs
    console.log('\n🔍 Checking draft team captain data...');
    console.log(`Team1 Captain ID: ${draft.team1_captain_id}`);
    console.log(`Team2 Captain ID: ${draft.team2_captain_id}`);
    
    if (draft.team1_captain_id) {
      const captain1 = await postgres.query('SELECT discord_username FROM users WHERE id = $1', [draft.team1_captain_id]);
      console.log(`Team1 Captain: ${captain1.rows[0]?.discord_username || 'NOT FOUND'}`);
    }
    
    if (draft.team2_captain_id) {
      const captain2 = await postgres.query('SELECT discord_username FROM users WHERE id = $1', [draft.team2_captain_id]);
      console.log(`Team2 Captain: ${captain2.rows[0]?.discord_username || 'NOT FOUND'}`);
    }
    
    // Check the draft connection logic requirements
    console.log('\n📋 Connection Requirements Check:');
    console.log(`✓ Draft exists: ${!!draft.draft_id}`);
    console.log(`✓ Has team1 captain: ${!!draft.team1_captain_id}`);
    console.log(`✓ Has team2 captain: ${!!draft.team2_captain_id}`);
    console.log(`✓ Status allows connection: ${draft.status !== 'Completed'}`);
    
    // Check if there's a mismatch between draft phase and connection status
    if (draft.current_phase?.includes('Ban') || draft.current_phase?.includes('Pick')) {
      if (!draft.team1_connected || !draft.team2_connected) {
        console.log('\n🚨 ISSUE DETECTED:');
        console.log('Draft is in Ban/Pick phase but teams are not marked as connected!');
        console.log('This suggests the connection endpoint failed silently or was skipped.');
        
        // Offer to fix the connection status
        console.log('\n🔧 Would need to manually update connection status or debug why connect failed.');
      } else {
        console.log('\n✅ Connection status matches draft phase');
      }
    }
    
  } catch (error) {
    console.error('Error testing draft connect:', error);
  }
  process.exit(0);
}

testDraftConnect();