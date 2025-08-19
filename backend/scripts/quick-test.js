console.log('🎯 QUICK PRODUCTION TEST - Adding tournament with existing user');

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
  ssl: { rejectUnauthorized: false }
});

async function quickTest() {
  try {
    // Get any existing user
    const userResult = await pool.query(`SELECT id, discord_username FROM users LIMIT 1`);
    const user = userResult.rows[0];
    
    if (!user) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`✅ Using user: ${user.discord_username} (${user.id})`);
    
    // Create simple tournament with ALL required fields
    const timestamp = Date.now();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);   // 2 weeks from now
    
    const tournamentResult = await pool.query(`
      INSERT INTO tournaments (
        tournament_id, name, description, status, max_teams, bracket_type, 
        game_format, quarter_final_format, semi_final_format, grand_final_format,
        current_teams, registration_open, check_in_enabled, start_date, end_date,
        created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING id, name
    `, [
      `test-${timestamp}`,
      `Test Tournament ${timestamp}`, 
      'Quick test tournament for production testing',
      'upcoming',
      16,
      'single_elimination',
      'best_of_3',      // game_format
      'best_of_3',      // quarter_final_format  
      'best_of_5',      // semi_final_format
      'best_of_7',      // grand_final_format
      0,                // current_teams
      true,             // registration_open
      false,            // check_in_enabled
      futureDate,       // start_date
      endDate,          // end_date
      user.id
    ]);
    
    console.log(`✅ Created tournament: ${tournamentResult.rows[0].name}`);
    
    // Create 2 quick teams
    for (let i = 1; i <= 2; i++) {
      try {
        await pool.query(`
          INSERT INTO teams (team_id, team_name, captain_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [
          `test-team-${timestamp}-${i}`,
          `Test Team ${i}`,
          user.id
        ]);
        console.log(`✅ Created team: Test Team ${i}`);
      } catch (err) {
        console.log(`⚠️ Team ${i} error: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Check final state
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tournaments) as tournaments,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM draft_sessions) as draft_sessions
    `);
    
    const c = counts.rows[0];
    console.log(`\n📊 PRODUCTION DATABASE STATE:`);
    console.log(`   - Tournaments: ${c.tournaments}`);  
    console.log(`   - Teams: ${c.teams}`);
    console.log(`   - Users: ${c.users}`);
    console.log(`   - Draft sessions: ${c.draft_sessions}`);
    
    // Show recent tournaments
    const recent = await pool.query(`SELECT name, status FROM tournaments ORDER BY created_at DESC LIMIT 3`);
    console.log(`\n🏆 Recent tournaments:`);
    recent.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.status})`);
    });
    
    console.log('\n🎉 PRODUCTION DATA READY FOR TESTING!');
    console.log('🔗 Test your site: https://ocl-predecessor.netlify.app');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log(err.stack);
  } finally {
    await pool.end();
  }
}

quickTest();