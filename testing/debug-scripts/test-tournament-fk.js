const postgresService = require('./services/postgresql');

async function testForeignKey() {
  try {
    console.log('🔍 Testing tournament foreign key relationships...\n');
    
    // Get tournament info
    const tournament = await postgresService.query(
      'SELECT id, tournament_id, name FROM tournaments WHERE name = $1',
      ['test admin panel']
    );
    
    if (tournament.rows.length === 0) {
      console.log('❌ Tournament "test admin panel" not found');
      process.exit(1);
    }
    
    const t = tournament.rows[0];
    console.log('Tournament data:');
    console.log(`- id (UUID PK): ${t.id}`);
    console.log(`- tournament_id (display): ${t.tournament_id}`);
    console.log(`- name: ${t.name}`);
    
    // Get teams
    const teams = await postgresService.query('SELECT id, team_id, team_name FROM teams LIMIT 3');
    console.log(`\n📝 Found ${teams.rows.length} teams to register`);
    
    if (teams.rows.length > 0) {
      // Test registration using the correct UUID primary key (id), not tournament_id
      const team = teams.rows[0];
      console.log(`\n🎯 Testing registration for: ${team.team_name} (${team.team_id})`);
      
      try {
        // Get the team captain as the registered_by user
        const captain = await postgresService.query(
          'SELECT captain_id FROM teams WHERE id = $1',
          [team.id]
        );
        
        const captainId = captain.rows[0]?.captain_id;
        if (!captainId) {
          console.log('❌ No captain found for team');
          return;
        }
        
        await postgresService.query(`
          INSERT INTO tournament_registrations (tournament_id, team_id, registered_by, status, checked_in)
          VALUES ($1, $2, $3, 'registered', false)
          ON CONFLICT (tournament_id, team_id) DO NOTHING
          RETURNING id
        `, [t.id, team.id, captainId]); // Using correct captain_id for registered_by
        
        console.log('✅ Registration successful! Using tournament.id (UUID PK)');
        
        // Now test the check-in endpoint
        console.log('\n🧪 Testing check-in status endpoint...');
        const checkResult = await postgresService.query(`
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
        `, [t.id]);
        
        console.log(`📊 Check-in status results: ${checkResult.rows.length} teams`);
        checkResult.rows.forEach(team => {
          console.log(`- ${team.team_name} (Captain: ${team.captain_username})`);
          console.log(`  Status: ${team.status}, Checked In: ${team.checked_in}`);
        });
        
        console.log(`\n🚀 Success! Now the check-in endpoints should work with tournament UUID: ${t.tournament_id}`);
        
      } catch (error) {
        console.log('❌ Registration failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testForeignKey();