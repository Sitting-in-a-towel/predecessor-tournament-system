const postgres = require('../services/postgresql');

async function checkMatches() {
  try {
    const result = await postgres.query(`
      SELECT bracket_data FROM tournament_brackets 
      WHERE tournament_id = (SELECT id FROM tournaments WHERE name = 'test admin panel')
    `);
    
    const bracketData = result.rows[0].bracket_data;
    
    console.log('=== MATCH AVAILABILITY ANALYSIS ===\n');
    
    // Extract all matches from Round 1 (where teams are assigned)
    if (bracketData.rounds && bracketData.rounds[0]) {
      const round1 = bracketData.rounds[0];
      console.log(`Round 1 (${round1.name}) - ${round1.matches.length} matches:`);
      
      round1.matches.forEach((match, index) => {
        const hasTeams = match.team1 && match.team2 && 
                        match.team1 !== 'bye' && match.team2 !== 'bye';
        const isCompleted = match.winner || match.status === 'completed';
        const available = hasTeams && !isCompleted;
        
        const status = available ? '✅ AVAILABLE' : 
                      !hasTeams ? '❌ NO TEAMS' : 
                      '❌ COMPLETED';
        
        const team1Name = match.team1?.team_name || match.team1 || 'NULL';
        const team2Name = match.team2?.team_name || match.team2 || 'NULL';
        
        console.log(`  Match ${index + 1} (${match.id}): ${team1Name} vs ${team2Name} - ${status}`);
        
        if (isCompleted && match.winner) {
          console.log(`    Winner: ${match.winner.team_name}`);
        }
        if (match.status) {
          console.log(`    Status: ${match.status}`);
        }
      });
    }
    
    // Count available matches
    let totalAvailable = 0;
    if (bracketData.rounds && bracketData.rounds[0]) {
      totalAvailable = bracketData.rounds[0].matches.filter(match => {
        const hasTeams = match.team1 && match.team2 && 
                        match.team1 !== 'bye' && match.team2 !== 'bye';
        const isCompleted = match.winner || match.status === 'completed';
        return hasTeams && !isCompleted;
      }).length;
    }
    
    console.log(`\n🎯 SUMMARY: ${totalAvailable} matches are available for draft creation`);
    
    if (totalAvailable === 0) {
      console.log('\n⚠️  NO MATCHES AVAILABLE FOR DRAFTS');
      console.log('Reasons:');
      console.log('- Some matches are already completed (have winners)');
      console.log('- Other matches have null/TBD teams (waiting for previous rounds)');
      console.log('\nTo create drafts, you need:');
      console.log('1. Matches with both teams assigned');
      console.log('2. Matches that are not yet completed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkMatches();