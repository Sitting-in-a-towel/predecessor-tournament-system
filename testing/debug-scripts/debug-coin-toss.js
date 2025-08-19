const axios = require('axios');

async function debugCoinToss() {
  console.log('\n=== DEBUGGING COIN TOSS ISSUE ===\n');
  
  try {
    // Step 1: Get a draft session that's in coin toss phase
    console.log('1. Checking current draft state...');
    const draftsResponse = await axios.get('http://localhost:4000/api/drafts?tournament_id=4fe28137-a1c3-426e-bfa0-1ae9c54f58a0');
    
    if (draftsResponse.data.length === 0) {
      console.log('   No drafts found - create one first');
      return;
    }
    
    const draft = draftsResponse.data[0];
    console.log(`   Draft ID: ${draft.draft_id}`);
    console.log(`   Status: ${draft.status}`);
    console.log(`   Phase: ${draft.current_phase}`);
    console.log(`   Team1 connected: ${draft.team1_connected}`);
    console.log(`   Team2 connected: ${draft.team2_connected}`);
    console.log(`   Team1 coin choice: ${draft.team1_coin_choice}`);
    console.log(`   Team2 coin choice: ${draft.team2_coin_choice}`);
    console.log(`   Coin toss result: ${draft.coin_toss_result}`);
    console.log(`   Coin toss winner: ${draft.coin_toss_winner}`);
    
    // Step 2: Simulate coin choices manually via database
    console.log('\n2. Simulating coin toss issue...');
    
    if (draft.current_phase === 'Coin Toss') {
      console.log('   Draft is in coin toss phase - good!');
      
      // Check what choices have been made
      if (!draft.team1_coin_choice && !draft.team2_coin_choice) {
        console.log('   No choices made yet - this is expected initial state');
      } else if (draft.team1_coin_choice && !draft.team2_coin_choice) {
        console.log(`   Team1 chose ${draft.team1_coin_choice}, Team2 hasn't chosen`);
        console.log('   This matches your description - Team1 chose heads, Team2 needs to choose tails');
      } else if (!draft.team1_coin_choice && draft.team2_coin_choice) {
        console.log(`   Team2 chose ${draft.team2_coin_choice}, Team1 hasn't chosen`);
      } else if (draft.team1_coin_choice && draft.team2_coin_choice) {
        console.log(`   Both teams chose: Team1=${draft.team1_coin_choice}, Team2=${draft.team2_coin_choice}`);
        if (!draft.coin_toss_result) {
          console.log('   ❌ ISSUE FOUND: Both teams chose but no coin flip executed!');
        } else {
          console.log('   ✅ Coin flip completed successfully');
        }
      }
      
      // Step 3: Test the exact condition from the code
      console.log('\n3. Testing coin flip trigger condition...');
      
      // Simulate team2 clicking "tails" when team1 already chose "heads"
      if (draft.team1_coin_choice === 'heads' && !draft.team2_coin_choice) {
        console.log('   Simulating Team2 clicking "tails"...');
        
        const team_role = "team2";
        const choice = "tails";
        const session = draft; // Use draft as session
        
        // Check the exact condition from the code
        const otherTeamHasChosen = (team_role == "team1" && session.team2_coin_choice) || 
                                  (team_role == "team2" && session.team1_coin_choice);
        
        console.log(`   team_role: ${team_role}`);
        console.log(`   choice: ${choice}`);
        console.log(`   session.team1_coin_choice: ${session.team1_coin_choice}`);
        console.log(`   session.team2_coin_choice: ${session.team2_coin_choice}`);
        console.log(`   Other team has chosen: ${otherTeamHasChosen}`);
        
        if (otherTeamHasChosen) {
          console.log('   ✅ Condition SHOULD trigger coin flip');
          console.log('   ➡️ The issue might be in the Phoenix LiveView event handling or database update');
        } else {
          console.log('   ❌ Condition would NOT trigger coin flip - this is the bug!');
        }
      }
    } else {
      console.log(`   Draft is in ${draft.current_phase} phase - not suitable for coin toss testing`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
  
  console.log('\n=== DEBUG COMPLETE ===\n');
}

debugCoinToss();