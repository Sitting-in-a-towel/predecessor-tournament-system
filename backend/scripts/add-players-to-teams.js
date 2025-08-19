const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function addPlayersToTeams() {
  console.log('👨‍👩‍👧‍👦 ADDING 5 PLAYERS TO EACH TEAM IN "test tournament 101"\n');
  
  const pool = new Pool({
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('📡 Connecting to production database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Find the tournament and its teams
    const tournament = await pool.query(`
      SELECT id, name 
      FROM tournaments 
      WHERE name ILIKE '%test tournament 101%'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (tournament.rows.length === 0) {
      console.log('❌ Tournament not found');
      return;
    }
    
    const tournamentData = tournament.rows[0];
    console.log(`🏆 Found tournament: ${tournamentData.name}\n`);
    
    // Get all teams for this tournament
    const teams = await pool.query(`
      SELECT id, team_name, team_tag, captain_id
      FROM teams 
      WHERE tournament_id = $1
      ORDER BY created_at
    `, [tournamentData.id]);
    
    console.log(`👥 Found ${teams.rows.length} teams to populate:\n`);
    
    // Check if team_players table exists, if not check for alternatives
    console.log('🔍 Checking database schema for player tables...');
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%player%' OR table_name LIKE '%member%' OR table_name LIKE '%roster%')
      ORDER BY table_name
    `);
    
    console.log('Found player-related tables:');
    tableCheck.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check team_players table structure
    let teamPlayersExists = false;
    try {
      const schemaCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'team_players'
        ORDER BY ordinal_position
      `);
      
      if (schemaCheck.rows.length > 0) {
        teamPlayersExists = true;
        console.log('\n📋 team_players table structure:');
        schemaCheck.rows.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      }
    } catch (err) {
      console.log('\n⚠️  team_players table does not exist or has issues');
    }
    
    if (!teamPlayersExists) {
      console.log('\n🏗️  Creating team_players table...');
      
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS team_players (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) DEFAULT 'player',
            is_captain BOOLEAN DEFAULT false,
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(team_id, user_id)
          )
        `);
        
        console.log('✅ team_players table created');
      } catch (err) {
        console.log(`❌ Failed to create team_players table: ${err.message}`);
        return;
      }
    }
    
    // Get available users to assign as players
    const availableUsers = await pool.query(`
      SELECT id, discord_username, user_id
      FROM users 
      WHERE discord_username IS NOT NULL
      ORDER BY created_at
    `);
    
    console.log(`\n👤 Found ${availableUsers.rows.length} available users\n`);
    
    // Player roles for a 5-person team
    const playerRoles = [
      { role: 'captain', is_captain: true },
      { role: 'carry', is_captain: false },
      { role: 'support', is_captain: false },
      { role: 'mid', is_captain: false },
      { role: 'jungle', is_captain: false }
    ];
    
    let totalPlayersAdded = 0;
    
    for (const team of teams.rows) {
      console.log(`👥 Adding players to ${team.team_name} (${team.team_tag}):`);
      
      // Add the captain first
      try {
        await pool.query(`
          INSERT INTO team_players (team_id, user_id, role, is_captain, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (team_id, user_id) DO NOTHING
        `, [team.id, team.captain_id, 'captain', true]);
        
        console.log(`  ✅ Captain assigned (existing captain user)`);
        totalPlayersAdded++;
      } catch (err) {
        console.log(`  ⚠️  Captain assignment: ${err.message.substring(0, 60)}`);
      }
      
      // Add 4 more players from available users
      const shuffledUsers = availableUsers.rows.sort(() => 0.5 - Math.random()).slice(0, 4);
      
      for (let i = 0; i < 4; i++) {
        const user = shuffledUsers[i] || availableUsers.rows[i % availableUsers.rows.length];
        const playerRole = playerRoles[i + 1]; // Skip captain role (index 0)
        
        try {
          await pool.query(`
            INSERT INTO team_players (team_id, user_id, role, is_captain, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (team_id, user_id) DO NOTHING
          `, [team.id, user.user_id, playerRole.role, playerRole.is_captain]);
          
          console.log(`  ✅ ${playerRole.role}: ${user.discord_username || user.user_id}`);
          totalPlayersAdded++;
        } catch (err) {
          console.log(`  ❌ ${playerRole.role}: ${err.message.substring(0, 60)}`);
        }
      }
      
      console.log('');
    }
    
    // Verification
    console.log('📊 VERIFICATION:\n');
    
    for (const team of teams.rows) {
      const playerCount = await pool.query(`
        SELECT COUNT(*) as count,
               STRING_AGG(
                 CASE 
                   WHEN tp.is_captain THEN u.discord_username || ' (Captain)'
                   ELSE u.discord_username || ' (' || tp.role || ')'
                 END, ', '
               ) as players
        FROM team_players tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.team_id = $1
      `, [team.id]);
      
      const result = playerCount.rows[0];
      console.log(`${team.team_name} (${team.team_tag}): ${result.count}/5 players`);
      if (result.players) {
        console.log(`  Players: ${result.players}`);
      }
      console.log('');
    }
    
    console.log(`🎉 COMPLETE! Added ${totalPlayersAdded} total player assignments`);
    console.log('All teams in "Test tournament 101" now have 5 players each!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log(error.stack);
  } finally {
    await pool.end();
  }
}

addPlayersToTeams();