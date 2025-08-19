const postgresService = require('./services/postgresql');

async function addTestData() {
  try {
    console.log('🏗️ Adding test data for check-in testing...\n');
    
    // Find a UUID tournament
    const tournaments = await postgresService.query(`
      SELECT tournament_id, name 
      FROM tournaments 
      WHERE tournament_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      LIMIT 1
    `);
    
    if (tournaments.rows.length === 0) {
      console.log('❌ No UUID format tournaments found');
      process.exit(1);
    }
    
    const tournament = tournaments.rows[0];
    console.log(`✅ Using tournament: ${tournament.name} (${tournament.tournament_id})`);
    
    // Get some teams
    const teams = await postgresService.query('SELECT id, team_id, team_name FROM teams LIMIT 5');
    console.log(`\n🏃 Found ${teams.rows.length} teams to register`);
    
    // Register teams to this tournament
    for (const team of teams.rows) {
      try {
        // Check if already registered
        const existing = await postgresService.query(
          'SELECT id FROM tournament_registrations WHERE tournament_id = $1 AND team_id = $2',
          [tournament.tournament_id, team.id]
        );
        
        if (existing.rows.length === 0) {
          await postgresService.query(`
            INSERT INTO tournament_registrations (
              tournament_id, team_id, registered_by, registration_date, status, checked_in
            ) VALUES ($1, $2, $3, NOW(), 'registered', false)
          `, [tournament.tournament_id, team.id, team.id]); // Using team.id as registered_by for now
          
          console.log(`✅ Registered: ${team.team_name} (${team.team_id})`);
        } else {
          console.log(`ℹ️ Already registered: ${team.team_name} (${team.team_id})`);
        }
      } catch (error) {
        console.log(`❌ Failed to register ${team.team_name}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 Test data added! Now testing check-in endpoints...');
    
    // Test the check-in status endpoint
    const checkInStatus = await postgresService.query(`
      SELECT 
        t.team_id,
        t.team_name,
        tr.status,
        tr.checked_in,
        tr.check_in_time,
        u.discord_username as captain_username,
        5 as player_count
      FROM tournament_registrations tr
      JOIN teams t ON tr.team_id = t.id
      JOIN users u ON t.captain_id = u.id
      WHERE tr.tournament_id = $1
      ORDER BY t.team_name
    `, [tournament.tournament_id]);
    
    console.log('\n📊 Current check-in status:');
    console.log(`Tournament: ${tournament.name}`);
    console.log(`Total registered teams: ${checkInStatus.rows.length}`);
    console.log(`Teams checked in: ${checkInStatus.rows.filter(t => t.checked_in).length}`);
    
    checkInStatus.rows.forEach(team => {
      console.log(`- ${team.team_name} (${team.captain_username}) - ${team.checked_in ? '✅ Checked In' : '⏳ Ready to Check In'}`);
    });
    
    console.log(`\n🚀 Ready to test! Tournament ID: ${tournament.tournament_id}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

addTestData();