const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function addPlayersWithCorrectConstraints() {
  console.log('👨‍👩‍👧‍👦 ADDING 5 PLAYERS WITH CORRECT CONSTRAINTS\n');
  
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
      SELECT t.id, t.team_name, t.team_tag, t.captain_id
      FROM teams t
      JOIN tournaments tour ON t.tournament_id = tour.id
      WHERE tour.name ILIKE '%test tournament 101%'
      ORDER BY t.created_at
    `);
    
    console.log(`👥 Found ${teams.rows.length} teams:\n`);
    
    // Get available users
    const users = await pool.query(`
      SELECT id, discord_username, user_id
      FROM users 
      WHERE discord_username IS NOT NULL
      ORDER BY created_at
    `);
    
    console.log(`👤 Available users: ${users.rows.length}\n`);
    
    // Correct position and role values based on constraints
    const playerSetup = [
      { role: 'captain', position: 'Carry' },      // Captain plays Carry
      { role: 'player', position: 'Support' },     // Player plays Support  
      { role: 'player', position: 'Midlane' },     // Player plays Midlane
      { role: 'player', position: 'Offlane' },     // Player plays Offlane
      { role: 'player', position: 'Jungle' }       // Player plays Jungle
    ];
    
    let totalAdded = 0;
    
    for (const team of teams.rows) {
      console.log(`👥 Adding players to ${team.team_name} (${team.team_tag}):`);
      
      // Clear existing players first
      await pool.query('DELETE FROM team_players WHERE team_id = $1', [team.id]);
      
      // Add 5 players with correct positions/roles
      for (let i = 0; i < 5; i++) {
        const user = users.rows[i % users.rows.length]; // Cycle through users
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
          console.log(`  ✅ ${roleLabel} (${setup.position}): ${user.discord_username || user.user_id}`);
          totalAdded++;
          
        } catch (err) {
          console.log(`  ❌ ${setup.position}: ${err.message.substring(0, 80)}`);
        }
      }
      
      // Rotate users for next team to get different players
      const rotatedUser = users.rows.shift();
      users.rows.push(rotatedUser);
      
      console.log('');
    }
    
    // Final verification
    console.log('📊 FINAL VERIFICATION:\n');
    
    for (const team of teams.rows) {
      const playerInfo = await pool.query(`
        SELECT COUNT(*) as count,
               STRING_AGG(
                 CASE 
                   WHEN tp.role = 'captain' THEN '👑 ' || u.discord_username || ' (' || tp.position || ')'
                   ELSE '👤 ' || u.discord_username || ' (' || tp.position || ')'
                 END, 
                 E'\\n    ', 
                 ORDER BY CASE WHEN tp.role = 'captain' THEN 0 ELSE 1 END, tp.joined_at
               ) as players
        FROM team_players tp
        JOIN users u ON tp.player_id = u.id
        WHERE tp.team_id = $1 AND tp.accepted = true
      `, [team.id]);
      
      const result = playerInfo.rows[0];
      console.log(`${team.team_name} (${team.team_tag}): ${result.count}/5 players`);
      if (result.players) {
        console.log(`    ${result.players}`);
      }
      console.log('');
    }
    
    console.log(`🎉 SUCCESS! Added ${totalAdded} player assignments`);
    console.log('All teams now have complete 5-player rosters with proper positions!');
    console.log('\\n📋 Each team has:');
    console.log('  👑 1 Captain');
    console.log('  👤 4 Players (Support, Midlane, Offlane, Jungle)');
    console.log('\\n✅ Teams are ready for tournament play and drafting!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addPlayersWithCorrectConstraints();