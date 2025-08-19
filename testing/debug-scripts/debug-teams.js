const postgresService = require('./services/postgresql');

async function checkTeamRelationships() {
  try {
    console.log('=== CHECKING TEAM RELATIONSHIPS ===');
    
    // Check what teams exist
    const teams = await postgresService.query('SELECT id, team_id, team_name FROM teams LIMIT 10');
    console.log('\nTeams in database:');
    teams.rows.forEach((team, i) => {
      console.log(`${i+1}. ID: ${team.id} | team_id: ${team.team_id} | name: ${team.team_name}`);
    });
    
    // Check what team IDs are being used in drafts
    const draftTeams = await postgresService.query(`
      SELECT DISTINCT team1_id, team2_id 
      FROM draft_sessions 
      WHERE tournament_id = $1 
      LIMIT 5
    `, ['4fe28137-a1c3-426e-bfa0-1ae9c54f58a0']);
    
    console.log('\nTeam IDs in drafts:');
    draftTeams.rows.forEach((row, i) => {
      console.log(`${i+1}. Team1: ${row.team1_id} | Team2: ${row.team2_id}`);
    });
    
    // Test if the team UUIDs from drafts exist in teams table
    if (draftTeams.rows.length > 0) {
      const team1Id = draftTeams.rows[0].team1_id;
      const team2Id = draftTeams.rows[0].team2_id;
      
      console.log('\nTesting team lookups:');
      const team1 = await postgresService.query('SELECT * FROM teams WHERE id = $1', [team1Id]);
      const team2 = await postgresService.query('SELECT * FROM teams WHERE id = $1', [team2Id]);
      
      console.log(`Team1 (${team1Id}):`, team1.rows.length > 0 ? team1.rows[0].team_name : 'NOT FOUND');
      console.log(`Team2 (${team2Id}):`, team2.rows.length > 0 ? team2.rows[0].team_name : 'NOT FOUND');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTeamRelationships();