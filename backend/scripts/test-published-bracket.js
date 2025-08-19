const axios = require('axios');

async function testPublishedBracket() {
  try {
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0'; // test admin panel
    console.log('🧪 Testing bracket API for "test admin panel" tournament...');
    console.log(`Tournament ID: ${tournamentId}`);
    
    const response = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}/bracket`);
    
    console.log('\n✅ BRACKET API SUCCESS!');
    console.log(`Tournament Name: ${response.data.tournament_name}`);
    console.log(`Has Bracket Data: ${response.data.has_bracket_data}`);
    console.log(`Is Published: ${response.data.bracket?.is_published}`);
    console.log(`Matches Count: ${response.data.matches?.length || 0}`);
    
    if (response.data.bracket?.bracket_data) {
      const bracketData = response.data.bracket.bracket_data;
      console.log(`Bracket Type: ${bracketData.type}`);
      console.log(`Rounds: ${bracketData.rounds?.length || 0}`);
      console.log(`Total Teams: ${bracketData.totalTeams}`);
      
      if (bracketData.rounds && bracketData.rounds[0]) {
        console.log(`Round 1 Matches: ${bracketData.rounds[0].matches?.length || 0}`);
        
        // Show first few matches
        const matches = bracketData.rounds[0].matches || [];
        matches.slice(0, 3).forEach((match, index) => {
          const team1 = match.team1?.team_name || 'TBD';
          const team2 = match.team2?.team_name || 'TBD';
          console.log(`  Match ${index + 1}: ${team1} vs ${team2}`);
        });
      }
    } else {
      console.log('❌ NO BRACKET DATA FOUND!');
    }
    
    console.log('\n🔍 Raw response structure:');
    console.log('Keys:', Object.keys(response.data));
    if (response.data.bracket) {
      console.log('Bracket keys:', Object.keys(response.data.bracket));
    }
    
  } catch (error) {
    console.error('❌ BRACKET API FAILED!');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
  process.exit(0);
}

testPublishedBracket();