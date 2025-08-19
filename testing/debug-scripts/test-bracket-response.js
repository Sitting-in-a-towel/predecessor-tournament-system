const axios = require('axios');
const postgresService = require('./services/postgresql');

async function testBracketResponse() {
  try {
    console.log('🔍 Testing bracket API response...');
    
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0';
    const response = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}/bracket`, {
      withCredentials: true
    });
    
    console.log('\n📊 Bracket API Response:');
    console.log('Status:', response.status);
    console.log('Data structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.bracket?.bracket_data) {
      console.log('\n🔍 Bracket Data Analysis:');
      const bracketData = response.data.bracket.bracket_data;
      console.log('Type:', bracketData.type);
      console.log('Is Published:', response.data.bracket.is_published);
      
      // Check for different bracket structures
      console.log('\nChecking bracket structure...');
      console.log('Has rounds property:', !!bracketData.rounds);
      console.log('Has upperBracket property:', !!bracketData.upperBracket);
      console.log('Has lowerBracket property:', !!bracketData.lowerBracket);
      console.log('Has matches property:', !!bracketData.matches);
      
      // Log all properties
      console.log('\nAll bracket properties:', Object.keys(bracketData));
      
      if (bracketData.rounds) {
        console.log('\nRounds structure:');
        bracketData.rounds.forEach((round, i) => {
          console.log(`Round ${i + 1}:`, {
            matches: round.matches?.length || 0,
            keys: Object.keys(round)
          });
          if (round.matches && round.matches.length > 0) {
            console.log('Sample match:', round.matches[0]);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing bracket response:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testBracketResponse();