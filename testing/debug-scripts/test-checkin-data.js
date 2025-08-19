const postgresService = require('./services/postgresql');

async function checkData() {
  try {
    console.log('🏆 Checking tournament check-in data...\n');
    
    // Check tournaments that actually have registrations
    const tournamentsWithTeams = await postgresService.query(`
      SELECT t.tournament_id, t.name, t.status, COUNT(tr.id) as team_count
      FROM tournaments t
      JOIN tournament_registrations tr ON t.tournament_id::text = tr.tournament_id::text  
      GROUP BY t.tournament_id, t.name, t.status
      ORDER BY team_count DESC
    `);
    
    console.log('=== TOURNAMENTS WITH REGISTERED TEAMS ===');
    tournamentsWithTeams.rows.forEach(t => {
      console.log(`- ${t.name} (${t.tournament_id}) - Status: ${t.status} - Teams: ${t.team_count}`);
    });

    if (tournamentsWithTeams.rows.length > 0) {
      const tournamentId = tournamentsWithTeams.rows[0].tournament_id;
      console.log(`\n=== REGISTRATIONS FOR: ${tournamentsWithTeams.rows[0].name} ===`);
      
      // Check registrations for first tournament
      const registrations = await postgresService.query(`
        SELECT 
          t.team_name,
          t.team_id,
          tr.status,
          tr.checked_in,
          tr.check_in_time,
          u.discord_username as captain
        FROM tournament_registrations tr
        JOIN teams t ON tr.team_id = t.id
        JOIN users u ON t.captain_id = u.id
        WHERE tr.tournament_id = $1
        ORDER BY t.team_name
      `, [tournamentId]);
      
      if (registrations.rows.length > 0) {
        registrations.rows.forEach(reg => {
          console.log(`- ${reg.team_name} (${reg.team_id})`);
          console.log(`  Captain: ${reg.captain}`);
          console.log(`  Status: ${reg.status}, Checked In: ${reg.checked_in}`);
          if (reg.check_in_time) {
            console.log(`  Check-in Time: ${reg.check_in_time}`);
          }
          console.log('');
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`- Total Registered Teams: ${registrations.rows.length}`);
        console.log(`- Teams Checked In: ${registrations.rows.filter(r => r.checked_in).length}`);
        console.log(`- Teams Ready to Check In: ${registrations.rows.filter(r => r.status === 'registered' && !r.checked_in).length}`);
        
      } else {
        console.log('No registrations found for this tournament');
        console.log('\n🚨 Need to add test teams first!');
      }
    } else {
      console.log('No tournaments found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkData();