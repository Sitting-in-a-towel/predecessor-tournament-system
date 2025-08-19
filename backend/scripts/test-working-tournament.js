const postgres = require('../services/postgresql');
const axios = require('axios');

async function test() {
  try {
    const result = await postgres.query("SELECT * FROM tournaments WHERE name = 'test admin panel'");
    const tournament = result.rows[0];
    console.log('Testing tournament:', tournament.name);
    console.log('ID:', tournament.id);
    
    const response = await axios.get(`http://localhost:3001/api/tournaments/${tournament.id}/bracket`);
    console.log('✅ Bracket API Success!');
    console.log('Has bracket:', response.data.has_bracket_data);
    console.log('Matches found:', response.data.matches.length);
    console.log('Tournament name:', response.data.tournament_name);
    
    if (response.data.matches.length > 0) {
      console.log('\nSample matches:');
      response.data.matches.slice(0, 3).forEach(match => {
        console.log(`  - ${match.team1_name || 'TBD'} vs ${match.team2_name || 'TBD'}`);
      });
    }

    // Test draft API too
    const draftResponse = await axios.get(`http://localhost:3001/api/draft?tournamentId=${tournament.id}`);
    console.log('\n✅ Draft API Success!');
    console.log('Drafts found:', draftResponse.data.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
  process.exit(0);
}

test();