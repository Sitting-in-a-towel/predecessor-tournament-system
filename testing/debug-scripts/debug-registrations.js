const postgresService = require('./services/postgresql');

async function checkRegistrations() {
  try {
    console.log('=== CHECKING TOURNAMENT REGISTRATIONS ===');
    
    // Check registrations for the tournament
    const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0';
    const registrations = await postgresService.query(`
      SELECT tr.id as registration_id, tr.team_id, t.team_name, t.id as team_uuid
      FROM tournament_registrations tr
      INNER JOIN teams t ON tr.team_id = t.id
      WHERE tr.tournament_id = $1
    `, [tournamentId]);
    
    console.log(`\nRegistrations for tournament ${tournamentId}:`);
    if (registrations.rows.length === 0) {
      console.log('❌ NO REGISTRATIONS FOUND - This is the problem!');
    } else {
      registrations.rows.forEach((reg, i) => {
        console.log(`${i+1}. Registration ID: ${reg.registration_id}`);
        console.log(`   Team UUID: ${reg.team_uuid}`);
        console.log(`   Team Name: ${reg.team_name}`);
        console.log('');
      });
    }
    
    // Check what the frontend might be sending
    console.log('=== WHAT FRONTEND LIKELY SENDS ===');
    const teams = await postgresService.query('SELECT id, team_name FROM teams LIMIT 5');
    console.log('Frontend probably sends team UUIDs like:');
    teams.rows.forEach((team, i) => {
      console.log(`${i+1}. ${team.id} (${team.team_name})`);
    });
    
    console.log('\n=== THE MISMATCH ===');
    console.log('❌ Backend expects: registration.id from tournament_registrations table');
    console.log('❌ Frontend sends: team.id from teams table');
    console.log('✅ Solution: Fix the lookup logic or fix the frontend IDs');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkRegistrations();