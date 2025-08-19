const postgres = require('../services/postgresql');
const axios = require('axios');

async function testDraftCreation() {
  try {
    // Get the tournament
    const tournamentResult = await postgres.query(`
      SELECT id, name FROM tournaments WHERE name = 'test admin panel'
    `);
    const tournament = tournamentResult.rows[0];
    
    console.log(`🎯 Testing draft creation for: ${tournament.name}`);
    console.log(`Tournament ID: ${tournament.id}`);
    
    // Get bracket data to find available matches
    const bracketResult = await postgres.query(`
      SELECT bracket_data FROM tournament_brackets WHERE tournament_id = $1
    `, [tournament.id]);
    
    const bracketData = bracketResult.rows[0].bracket_data;
    
    // Find an available match (has teams, not completed)
    let availableMatch = null;
    if (bracketData.rounds && bracketData.rounds[0]) {
      availableMatch = bracketData.rounds[0].matches.find(match => {
        const hasTeams = match.team1 && match.team2 && 
                        match.team1 !== 'bye' && match.team2 !== 'bye';
        const isCompleted = match.winner || match.status === 'completed';
        return hasTeams && !isCompleted;
      });
    }
    
    if (!availableMatch) {
      console.log('❌ No available matches found for testing');
      return;
    }
    
    console.log(`\n✅ Found available match: ${availableMatch.team1.team_name} vs ${availableMatch.team2.team_name}`);
    console.log(`Match ID: ${availableMatch.id}`);
    console.log(`Team 1 ID: ${availableMatch.team1.id}`);
    console.log(`Team 2 ID: ${availableMatch.team2.id}`);
    
    // Test the draft API endpoint that the frontend would call
    console.log('\n🧪 Testing draft API call (same as frontend would make)...');
    
    const draftPayload = {
      tournamentId: tournament.id,  // Using primary key like frontend does
      team1Id: availableMatch.team1.id,
      team2Id: availableMatch.team2.id
    };
    
    console.log('Draft creation payload:', draftPayload);
    
    try {
      const response = await axios.post('http://localhost:3001/api/draft', draftPayload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Draft creation SUCCESS!');
      console.log('Response:', response.data);
      
      // Now test fetching drafts for this tournament
      console.log('\n🔍 Testing draft retrieval...');
      const draftsResponse = await axios.get(`http://localhost:3001/api/draft?tournamentId=${tournament.id}`);
      
      console.log('✅ Draft retrieval SUCCESS!');
      console.log(`Found ${draftsResponse.data.length} drafts`);
      
      if (draftsResponse.data.length > 0) {
        console.log('Latest draft:', {
          id: draftsResponse.data[0].draft_id,
          team1: draftsResponse.data[0].team1_name,
          team2: draftsResponse.data[0].team2_name,
          status: draftsResponse.data[0].status
        });
      }
      
    } catch (error) {
      console.log('❌ Draft creation FAILED');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
      
      if (error.response?.status === 409) {
        console.log('ℹ️  This is expected - draft already exists for this match');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  process.exit(0);
}

testDraftCreation();