const axios = require('axios');

// Diagnostic script to check production data
async function diagnoseProductionData() {
  console.log('🔍 DIAGNOSING PRODUCTION DATA...\n');
  
  const API_BASE = 'https://predecessor-tournament-api.onrender.com/api';
  
  try {
    // Check tournaments
    console.log('1. Checking tournaments...');
    const tournamentsRes = await axios.get(`${API_BASE}/tournaments`);
    const tournaments = tournamentsRes.data;
    console.log(`Found ${tournaments.length} tournaments:`);
    tournaments.forEach(t => {
      console.log(`  - ${t.name} (ID: ${t.id})`);
    });
    
    if (tournaments.length === 0) {
      console.log('❌ NO TOURNAMENTS FOUND - You need to create a tournament first!');
      return;
    }
    
    // Check first tournament's registrations
    const firstTournament = tournaments[0];
    console.log(`\n2. Checking registrations for tournament: ${firstTournament.name}`);
    
    try {
      const regRes = await axios.get(`${API_BASE}/tournaments/${firstTournament.id}/registrations`);
      const registrations = regRes.data;
      console.log(`Found ${registrations.length} team registrations:`);
      registrations.forEach(r => {
        console.log(`  - Team: ${r.team_name} (Reg ID: ${r.id})`);
      });
      
      if (registrations.length === 0) {
        console.log('❌ NO TEAM REGISTRATIONS - Teams need to register for the tournament first!');
        return;
      }
      
    } catch (regError) {
      console.log('⚠️ Could not check registrations:', regError.message);
    }
    
    // Check draft sessions for this tournament
    console.log(`\n3. Checking draft sessions for tournament: ${firstTournament.name}`);
    try {
      const draftsRes = await axios.get(`${API_BASE}/draft?tournamentId=${firstTournament.id}`);
      const drafts = draftsRes.data;
      console.log(`Found ${drafts.length} draft sessions:`);
      drafts.forEach(d => {
        console.log(`  - ${d.team1_name} vs ${d.team2_name} (Status: ${d.status})`);
      });
      
      if (drafts.length === 0) {
        console.log('❌ NO DRAFT SESSIONS - This is why you see "no drafts found"!');
        console.log('💡 SOLUTION: You need to create draft sessions for your tournaments');
      }
      
    } catch (draftError) {
      console.log('❌ Error checking drafts:', draftError.message);
    }
    
    // Check teams
    console.log(`\n4. Checking teams...`);
    try {
      const teamsRes = await axios.get(`${API_BASE}/teams`);
      const teams = teamsRes.data;
      console.log(`Found ${teams.length} teams in total`);
      teams.slice(0, 3).forEach(t => {
        console.log(`  - ${t.team_name} (ID: ${t.id})`);
      });
      
    } catch (teamsError) {
      console.log('⚠️ Could not check teams:', teamsError.message);
    }
    
  } catch (error) {
    console.log('❌ Error connecting to production API:', error.message);
    console.log('Make sure the backend is running at:', API_BASE);
  }
}

diagnoseProductionData();