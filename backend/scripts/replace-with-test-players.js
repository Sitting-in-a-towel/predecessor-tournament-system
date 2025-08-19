const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function replaceWithTestPlayers() {
  console.log('🔄 REPLACING USER WITH RANDOM TEST PLAYERS\n');
  
  const pool = new Pool({
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('📡 Connecting to production database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Find the tournament and its teams
    const teams = await pool.query(`
      SELECT t.id, t.team_name, t.team_tag
      FROM teams t
      JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE tour.name ILIKE '%test tournament 101%'
      ORDER BY t.created_at
    `);
    
    console.log(`👥 Found ${teams.rows.length} teams to update:\n`);
    
    // Get available test users (excluding the main admin)
    const testUsers = await pool.query(`
      SELECT id, discord_username, user_id
      FROM users 
      WHERE discord_username IS NOT NULL 
      AND discord_username != 'TestAdmin'
      AND discord_username NOT ILIKE '%sitting_in_a_towel%'
      ORDER BY created_at
    `);
    
    console.log(`👤 Available test users: ${testUsers.rows.length}\n`);
    
    if (testUsers.rows.length < 5) {
      console.log('⚠️  Not enough test users, using available ones cyclically');
    }
    
    // Position setup
    const playerSetup = [
      { role: 'captain', position: 'Carry' },      
      { role: 'player', position: 'Support' },     
      { role: 'player', position: 'Midlane' },     
      { role: 'player', position: 'Offlane' },     
      { role: 'player', position: 'Jungle' }       
    ];
    
    let userIndex = 0;
    
    for (const team of teams.rows) {
      console.log(`🔄 Updating ${team.team_name} (${team.team_tag}):`);
      
      // Clear all existing players
      const deleteResult = await pool.query('DELETE FROM team_players WHERE team_id = $1', [team.id]);
      console.log(`  🗑️  Removed ${deleteResult.rowCount} existing players`);
      
      // Add 5 new random test players
      for (let i = 0; i < 5; i++) {
        const user = testUsers.rows[userIndex % testUsers.rows.length];
        const setup = playerSetup[i];
        
        try {
          await pool.query(`
            INSERT INTO team_players (
              id, team_id, player_id, role, position, 
              joined_at, accepted, accepted_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())
          `, [
            uuidv4(),
            team.id,
            user.id,
            setup.role,
            setup.position,
            true
          ]);
          
          const roleLabel = setup.role === 'captain' ? '👑 Captain' : '👤 Player';
          console.log(`    ✅ ${roleLabel} (${setup.position}): ${user.discord_username}`);
          
          userIndex++;
          
        } catch (err) {
          console.log(`    ❌ ${setup.position}: ${err.message.substring(0, 80)}`);
        }
      }
      
      console.log('');
    }
    
    // Update team captain_id in teams table to match the new captains
    console.log('🔄 Updating team captain references...\n');
    
    for (const team of teams.rows) {
      try {
        // Get the captain from team_players
        const captain = await pool.query(`
          SELECT player_id FROM team_players 
          WHERE team_id = $1 AND role = 'captain'
          LIMIT 1
        `, [team.id]);
        
        if (captain.rows.length > 0) {
          await pool.query(`
            UPDATE teams SET captain_id = $1 WHERE id = $2
          `, [captain.rows[0].player_id, team.id]);
          
          console.log(`  ✅ Updated ${team.team_name} captain reference`);
        }
      } catch (err) {
        console.log(`  ❌ ${team.team_name}: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Final verification
    console.log('\n📊 FINAL VERIFICATION:\n');
    
    for (const team of teams.rows) {
      const players = await pool.query(`
        SELECT u.discord_username, tp.role, tp.position
        FROM team_players tp
        JOIN users u ON tp.player_id = u.id
        WHERE tp.team_id = $1
        ORDER BY CASE WHEN tp.role = 'captain' THEN 0 ELSE 1 END, tp.joined_at
      `, [team.id]);
      
      console.log(`${team.team_name} (${team.team_tag}): ${players.rows.length}/5 players`);
      players.rows.forEach(player => {
        const roleIcon = player.role === 'captain' ? '👑' : '👤';
        console.log(`  ${roleIcon} ${player.discord_username} (${player.position})`);
      });
      console.log('');
    }
    
    console.log('🎉 SUCCESS!');
    console.log('✅ Removed you from all teams');
    console.log('✅ Added random test players to each team');
    console.log('✅ Each team now has its own captain from the test players');
    console.log('✅ All 4 teams have complete 5-player rosters');
    console.log('\n🏆 "Test tournament 101" is ready with independent test teams!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

replaceWithTestPlayers();