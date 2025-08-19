const { Pool } = require('pg');

async function debugTournamentTeamsDisplay() {
  console.log('🔍 DEBUGGING TOURNAMENT TEAMS DISPLAY ISSUE\n');
  
  const pool = new Pool({
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('📡 Connecting to production database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // 1. Check tournament exists and its details
    console.log('🏆 TOURNAMENT VERIFICATION:\n');
    
    const tournament = await pool.query(`
      SELECT id, tournament_id, name, status, current_teams, max_teams, 
             registration_open, check_in_enabled, created_at, created_by
      FROM tournaments 
      WHERE name ILIKE '%test tournament 101%'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (tournament.rows.length === 0) {
      console.log('❌ No tournament found matching "test tournament 101"');
      
      const allTournaments = await pool.query('SELECT name, tournament_id, status FROM tournaments ORDER BY created_at DESC');
      console.log(`\nFound ${allTournaments.rows.length} tournaments:`);
      allTournaments.rows.forEach((t, i) => {
        console.log(`  ${i+1}. ${t.name} (${t.tournament_id}) - ${t.status}`);
      });
      return;
    }
    
    const tournamentData = tournament.rows[0];
    console.log('Tournament found:');
    console.log(`  Name: ${tournamentData.name}`);
    console.log(`  ID: ${tournamentData.id}`);
    console.log(`  Tournament ID: ${tournamentData.tournament_id}`);
    console.log(`  Status: ${tournamentData.status}`);
    console.log(`  Teams: ${tournamentData.current_teams}/${tournamentData.max_teams}`);
    console.log(`  Registration Open: ${tournamentData.registration_open}`);
    console.log(`  Check-in Enabled: ${tournamentData.check_in_enabled}`);
    console.log(`  Created: ${tournamentData.created_at}`);
    console.log(`  Created By: ${tournamentData.created_by}`);
    
    // 2. Check teams associated with this tournament
    console.log('\n👥 TEAMS VERIFICATION:\n');
    
    const teams = await pool.query(`
      SELECT id, team_id, team_name, team_tag, tournament_id, captain_id, 
             confirmed, checked_in, created_at
      FROM teams 
      WHERE tournament_id = $1
      ORDER BY created_at
    `, [tournamentData.id]);
    
    console.log(`Teams found: ${teams.rows.length}`);
    
    if (teams.rows.length === 0) {
      console.log('❌ NO TEAMS FOUND for this tournament!');
      
      // Check if teams exist but with wrong tournament_id
      const allTeams = await pool.query('SELECT team_name, tournament_id FROM teams ORDER BY created_at DESC LIMIT 10');
      console.log(`\nAll recent teams (${allTeams.rows.length} found):`);
      allTeams.rows.forEach((t, i) => {
        console.log(`  ${i+1}. ${t.team_name} (Tournament: ${t.tournament_id.substring(0, 8)}...)`);
      });
      
    } else {
      teams.rows.forEach((team, i) => {
        console.log(`  ${i+1}. ${team.team_name} (${team.team_tag || 'no tag'})`);
        console.log(`      Team ID: ${team.team_id}`);
        console.log(`      Tournament ID: ${team.tournament_id === tournamentData.id ? '✅ MATCHES' : '❌ MISMATCH'}`);
        console.log(`      Captain: ${team.captain_id}`);
        console.log(`      Confirmed: ${team.confirmed}`);
        console.log(`      Checked In: ${team.checked_in}`);
        console.log(`      Created: ${team.created_at}`);
        console.log('');
      });
    }
    
    // 3. Check team players for each team
    console.log('👤 TEAM PLAYERS VERIFICATION:\n');
    
    for (const team of teams.rows) {
      const players = await pool.query(`
        SELECT tp.id, tp.player_id, tp.role, tp.position, tp.accepted,
               u.discord_username, u.user_id
        FROM team_players tp
        LEFT JOIN users u ON tp.player_id = u.id
        WHERE tp.team_id = $1
        ORDER BY CASE WHEN tp.role = 'captain' THEN 0 ELSE 1 END
      `, [team.id]);
      
      console.log(`${team.team_name}: ${players.rows.length} players`);
      players.rows.forEach(player => {
        const roleIcon = player.role === 'captain' ? '👑' : '👤';
        const username = player.discord_username || player.user_id || 'Unknown';
        console.log(`  ${roleIcon} ${username} (${player.position}) - ${player.accepted ? 'Accepted' : 'Pending'}`);
      });
      console.log('');
    }
    
    // 4. Check what the frontend API call would return
    console.log('🌐 API RESPONSE SIMULATION:\n');
    
    const apiResponse = await pool.query(`
      SELECT 
        t.id as tournament_id,
        t.name as tournament_name,
        t.status,
        t.current_teams,
        t.max_teams,
        teams.id as team_id,
        teams.team_name,
        teams.team_tag,
        teams.confirmed,
        teams.checked_in,
        COUNT(tp.id) as player_count
      FROM tournaments t
      LEFT JOIN teams ON teams.tournament_id = t.id
      LEFT JOIN team_players tp ON tp.team_id = teams.id AND tp.accepted = true
      WHERE t.name ILIKE '%test tournament 101%'
      GROUP BY t.id, t.name, t.status, t.current_teams, t.max_teams, 
               teams.id, teams.team_name, teams.team_tag, teams.confirmed, teams.checked_in
      ORDER BY teams.created_at
    `);
    
    console.log('What the API should return:');
    if (apiResponse.rows.length === 0) {
      console.log('❌ API would return NO DATA');
    } else {
      apiResponse.rows.forEach(row => {
        if (row.team_name) {
          console.log(`  Team: ${row.team_name} (${row.team_tag || 'no tag'})`);
          console.log(`    Players: ${row.player_count}/5`);
          console.log(`    Confirmed: ${row.confirmed}`);
          console.log(`    Checked In: ${row.checked_in}`);
        } else {
          console.log('  ⚠️  Tournament exists but no teams linked');
        }
      });
    }
    
    // 5. Possible issues and solutions
    console.log('\n🚨 POTENTIAL ISSUES:\n');
    
    const issues = [];
    
    if (teams.rows.length === 0) {
      issues.push('❌ No teams associated with tournament');
    }
    
    if (tournamentData.current_teams !== teams.rows.length) {
      issues.push(`⚠️  Tournament.current_teams (${tournamentData.current_teams}) doesn't match actual teams (${teams.rows.length})`);
    }
    
    const unconfirmedTeams = teams.rows.filter(t => !t.confirmed).length;
    if (unconfirmedTeams > 0) {
      issues.push(`⚠️  ${unconfirmedTeams} teams are not confirmed`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious database issues found');
      console.log('   The problem might be in the frontend code or API endpoints');
      console.log('   Check browser console for JavaScript errors');
      console.log('   Verify API endpoints are being called correctly');
    } else {
      console.log('Found potential issues:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugTournamentTeamsDisplay();