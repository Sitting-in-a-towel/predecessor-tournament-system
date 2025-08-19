const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function addTeamsToTournament101() {
  console.log('👥 ADDING 4 TEAMS TO "test tournament 101"\n');
  
  const pool = new Pool({
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('📡 Connecting to production database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Find the tournament
    const tournament = await pool.query(`
      SELECT id, name, tournament_id, max_teams, current_teams
      FROM tournaments 
      WHERE name ILIKE '%test tournament 101%' OR name ILIKE '%test%101%'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (tournament.rows.length === 0) {
      console.log('❌ No tournament found matching "test tournament 101"');
      console.log('Let me check what tournaments exist...\n');
      
      const allTournaments = await pool.query('SELECT name, tournament_id FROM tournaments ORDER BY created_at DESC');
      console.log(`Found ${allTournaments.rows.length} tournaments:`);
      allTournaments.rows.forEach((t, i) => {
        console.log(`  ${i+1}. ${t.name} (${t.tournament_id})`);
      });
      return;
    }
    
    const tournamentData = tournament.rows[0];
    console.log(`🏆 Found tournament: "${tournamentData.name}"`);
    console.log(`   ID: ${tournamentData.id}`);
    console.log(`   Tournament ID: ${tournamentData.tournament_id}`);
    console.log(`   Current teams: ${tournamentData.current_teams}/${tournamentData.max_teams}\n`);
    
    // Get an admin user to assign as captain
    const users = await pool.query('SELECT id, discord_username FROM users ORDER BY created_at LIMIT 1');
    const adminUser = users.rows[0];
    
    console.log(`Using captain: ${adminUser.discord_username} (${adminUser.id.substring(0, 8)}...)\n`);
    
    // Create 4 teams
    const teams = [
      { name: 'Team Alpha', tag: 'ALPH' },
      { name: 'Team Beta', tag: 'BETA' },
      { name: 'Team Gamma', tag: 'GAMM' },
      { name: 'Team Delta', tag: 'DELT' }
    ];
    
    console.log('👥 Creating teams...\n');
    
    let createdTeams = 0;
    
    for (const teamInfo of teams) {
      try {
        const teamId = uuidv4();
        
        await pool.query(`
          INSERT INTO teams (
            id, team_id, team_name, team_tag, tournament_id,
            captain_id, confirmed, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          teamId,
          `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          teamInfo.name,
          teamInfo.tag,
          tournamentData.id,
          adminUser.id,
          true
        ]);
        
        createdTeams++;
        console.log(`  ✅ ${teamInfo.name} (${teamInfo.tag})`);
        
        // Small delay to ensure unique team_id timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (err) {
        console.log(`  ❌ ${teamInfo.name}: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Update tournament current_teams count
    console.log(`\n📊 Updating tournament team count...`);
    
    const teamCount = await pool.query(
      'SELECT COUNT(*) FROM teams WHERE tournament_id = $1',
      [tournamentData.id]
    );
    
    await pool.query(
      'UPDATE tournaments SET current_teams = $1 WHERE id = $2',
      [teamCount.rows[0].count, tournamentData.id]
    );
    
    console.log(`✅ Tournament updated: ${teamCount.rows[0].count} total teams\n`);
    
    // Final verification
    const finalCheck = await pool.query(`
      SELECT t.name, t.current_teams, t.max_teams,
             (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id) as actual_team_count
      FROM tournaments t
      WHERE t.id = $1
    `, [tournamentData.id]);
    
    const final = finalCheck.rows[0];
    console.log('🎉 FINAL RESULT:');
    console.log(`   Tournament: ${final.name}`);
    console.log(`   Teams: ${final.actual_team_count}/${final.max_teams}`);
    console.log(`   Current teams field: ${final.current_teams}`);
    
    // Show all teams
    const allTeams = await pool.query(`
      SELECT team_name, team_tag, confirmed, checked_in
      FROM teams 
      WHERE tournament_id = $1
      ORDER BY created_at
    `, [tournamentData.id]);
    
    console.log('\n👥 All teams in tournament:');
    allTeams.rows.forEach((team, i) => {
      console.log(`  ${i+1}. ${team.team_name} (${team.team_tag}) - Confirmed: ${team.confirmed}, Checked In: ${team.checked_in}`);
    });
    
    console.log('\n✅ SUCCESS! "test tournament 101" now has 4 teams ready for bracket creation!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addTeamsToTournament101();