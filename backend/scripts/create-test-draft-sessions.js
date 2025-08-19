const axios = require('axios');

// Script to create test draft sessions for production testing
async function createTestDraftSessions() {
  console.log('🎯 CREATING TEST DRAFT SESSIONS...\n');
  
  const API_BASE = 'https://predecessor-tournament-api.onrender.com/api';
  
  try {
    // Get tournaments
    console.log('1. Getting tournaments...');
    const tournamentsRes = await axios.get(`${API_BASE}/tournaments`);
    const tournaments = tournamentsRes.data;
    
    if (tournaments.length === 0) {
      console.log('❌ No tournaments found. Create a tournament first!');
      return;
    }
    
    const tournament = tournaments[0];
    console.log(`Using tournament: ${tournament.name} (ID: ${tournament.id})`);
    
    // Get team registrations for this tournament
    console.log('\n2. Getting team registrations...');
    const regRes = await axios.get(`${API_BASE}/tournaments/${tournament.id}/registrations`);
    const registrations = regRes.data;
    
    if (registrations.length < 2) {
      console.log('❌ Need at least 2 team registrations to create a draft session!');
      console.log(`Found only ${registrations.length} registrations`);
      return;
    }
    
    console.log(`Found ${registrations.length} team registrations`);
    
    // Create draft sessions for pairs of teams
    const draftSessions = [];
    for (let i = 0; i < registrations.length - 1; i += 2) {
      const team1Reg = registrations[i];
      const team2Reg = registrations[i + 1];
      
      console.log(`\n3. Creating draft session: ${team1Reg.team_name} vs ${team2Reg.team_name}`);
      
      const draftSessionData = {
        tournament_id: tournament.id,
        team1_id: team1Reg.id, // Registration ID, not team ID
        team2_id: team2Reg.id, // Registration ID, not team ID
        team1_captain_id: team1Reg.registered_by, // User who registered the team
        team2_captain_id: team2Reg.registered_by, // User who registered the team
        match_id: `match_${Date.now()}_${i}`,
        status: 'waiting',
        draft_configuration: {
          timer_enabled: true,
          timer_strategy: '30s_per_round',
          bonus_time: 'disabled',
          coin_toss_enabled: true,
          ban_count: 2,
          strategy: 'restricted_no_mirror'
        },
        session_state: {
          captains_present: false,
          current_phase: 'waiting',
          current_turn: null,
          timer_remaining: null
        },
        draft_result: {
          team1_picks: [],
          team2_picks: [],
          team1_bans: [],
          team2_bans: [],
          completed: false
        }
      };
      
      try {
        const createRes = await axios.post(`${API_BASE}/draft/sessions`, draftSessionData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Created draft session: ${createRes.data.id}`);
        draftSessions.push(createRes.data);
        
      } catch (createError) {
        console.log(`❌ Error creating draft session:`, createError.response?.data || createError.message);
        
        // Try direct database insertion as fallback
        console.log('Trying direct database approach...');
        try {
          const directCreateRes = await axios.post(`${API_BASE}/draft/create-test-session`, {
            tournamentId: tournament.id,
            team1RegId: team1Reg.id,
            team2RegId: team2Reg.id,
            team1Name: team1Reg.team_name,
            team2Name: team2Reg.team_name
          });
          console.log('✅ Created via direct method');
        } catch (directError) {
          console.log('❌ Direct method also failed:', directError.message);
        }
      }
    }
    
    console.log(`\n🎉 Process complete! Created ${draftSessions.length} draft sessions.`);
    console.log('Now check your tournament draft tab - it should show the created drafts!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
}

createTestDraftSessions();