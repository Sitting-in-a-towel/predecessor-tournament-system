const postgresService = require('../services/postgresql');

async function testPostgreSQLService() {
  console.log('🔧 Testing PostgreSQL Service directly...\n');
  
  try {
    // Test basic connection
    console.log('1. Testing basic query...');
    const basicTest = await postgresService.query('SELECT NOW() as current_time');
    console.log('✅ Basic query works:', basicTest.rows[0].current_time);
    
    // Test tournament query
    console.log('\n2. Testing tournament query...');
    const tournaments = await postgresService.query(`
      SELECT id, tournament_id, name FROM tournaments 
      WHERE name ILIKE '%test tournament 101%'
    `);
    console.log(`✅ Found ${tournaments.rows.length} tournaments`);
    
    if (tournaments.rows.length > 0) {
      const tournament = tournaments.rows[0];
      console.log(`   Tournament: ${tournament.name}`);
      console.log(`   DB ID: ${tournament.id}`);
      console.log(`   Tournament ID: ${tournament.tournament_id}`);
      
      // Test teams query
      console.log('\n3. Testing teams query...');
      const teams = await postgresService.query(`
        SELECT id, team_name, tournament_id FROM teams 
        WHERE tournament_id = $1
      `, [tournament.id]);
      console.log(`✅ Found ${teams.rows.length} teams directly`);
      
      // Test the service method
      console.log('\n4. Testing getTeamsByTournament service method...');
      const serviceTeams = await postgresService.getTeamsByTournament(tournament.tournament_id);
      console.log(`✅ Service method returned ${serviceTeams.length} teams`);
      
      if (serviceTeams.length > 0) {
        console.log('Service teams:');
        serviceTeams.forEach(team => {
          console.log(`  - ${team.team_name} (Captain: ${team.captain_username}) - ${team.player_count} players`);
        });
      }
    }
    
    console.log('\n🎉 PostgreSQL service is working correctly!');
    
  } catch (error) {
    console.log('\n❌ PostgreSQL service error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testPostgreSQLService();