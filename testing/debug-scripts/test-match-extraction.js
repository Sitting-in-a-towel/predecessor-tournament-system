const axios = require('axios');

// This simulates what the frontend does
function extractMatchesFromBracket(bracketData) {
  console.log('🔍 EXTRACTING MATCHES FROM BRACKET');
  console.log('Bracket type:', bracketData?.type);
  
  const matches = [];
  
  if (bracketData?.type === 'Single Elimination' && bracketData.rounds) {
    console.log(`Found ${bracketData.rounds.length} rounds`);
    
    bracketData.rounds.forEach((round, roundIndex) => {
      console.log(`\nProcessing round ${roundIndex + 1} (${round.name}):`);
      
      if (round.matches && Array.isArray(round.matches)) {
        console.log(`  ${round.matches.length} matches in this round`);
        
        round.matches.forEach((match, matchIndex) => {
          console.log(`\n  Match ${matchIndex + 1} (${match.id}):`);
          console.log(`    Team1: ${match.team1?.team_name || 'null'} (${match.team1?.team_id || 'null'})`);
          console.log(`    Team2: ${match.team2?.team_name || 'null'} (${match.team2?.team_id || 'null'})`);
          console.log(`    Winner: ${match.winner?.team_name || 'none'}`);
          console.log(`    Status: ${match.status || 'unknown'}`);
          
          // Check if match is available for draft
          const hasValidTeams = match.team1 && match.team2 && 
            match.team1.team_name && match.team2.team_name && 
            match.team1.team_name !== 'bye' && match.team2.team_name !== 'bye';
          
          const hasPublishedResults = match.winner || match.status === 'completed';
          
          console.log(`    Has valid teams: ${hasValidTeams}`);
          console.log(`    Has published results: ${hasPublishedResults}`);
          
          if (hasValidTeams && !hasPublishedResults) {
            const processedMatch = {
              id: match.id,
              team1: match.team1.team_name,
              team2: match.team2.team_name,
              roundName: round.name || `Round ${roundIndex + 1}`,
              bracketType: 'SE'
            };
            
            matches.push(processedMatch);
            console.log(`    ✅ Added to available matches`);
          } else {
            console.log(`    ❌ Filtered out`);
          }
        });
      }
    });
  }
  
  console.log(`\n🎯 EXTRACTION COMPLETE: ${matches.length} available matches`);
  matches.forEach((match, i) => {
    console.log(`${i + 1}. ${match.roundName}: ${match.team1} vs ${match.team2}`);
  });
  
  return matches;
}

async function testMatchExtraction() {
  try {
    console.log('📊 Testing match extraction with real bracket data...\n');
    
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0';
    const response = await axios.get(`http://localhost:3001/api/tournaments/${tournamentId}/bracket`);
    
    if (response.data.bracket?.bracket_data) {
      const matches = extractMatchesFromBracket(response.data.bracket.bracket_data);
      
      if (matches.length > 0) {
        console.log('\n✅ SUCCESS: Matches available for draft creation!');
      } else {
        console.log('\n❌ ISSUE: No matches available for draft creation');
      }
    } else {
      console.log('❌ No bracket data found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMatchExtraction();