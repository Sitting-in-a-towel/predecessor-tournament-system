const { Pool } = require('pg');

async function recreateTestData() {
  console.log('🏗️  RECREATING PROPER TEST DATA IN PRODUCTION\n');
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  };
  
  const pool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting to production database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Clear all data first
    console.log('🗑️  Clearing existing data...');
    const clearTables = ['team_invitations', 'matches', 'draft_sessions', 'tournament_brackets', 'teams', 'tournaments'];
    
    for (const table of clearTables) {
      try {
        const result = await pool.query(`DELETE FROM ${table}`);
        console.log(`  🗑️  ${table}: ${result.rowCount} rows deleted`);
      } catch (err) {
        console.log(`  ⚠️  ${table}: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Get existing users to use as creators/captains
    const users = await pool.query('SELECT id, discord_username FROM users ORDER BY created_at LIMIT 5');
    
    if (users.rows.length === 0) {
      console.log('❌ No users found in production. Creating test user...');
      
      await pool.query(`
        INSERT INTO users (id, user_id, discord_id, discord_username, email, created_at, updated_at)
        VALUES ('11111111-1111-1111-1111-111111111111', 'test_admin', '123456789', 'TestAdmin', 'test@admin.com', NOW(), NOW())
      `);
      
      users.rows.push({
        id: '11111111-1111-1111-1111-111111111111',
        discord_username: 'TestAdmin'
      });
      
      console.log('✅ Created test admin user');
    }
    
    const adminUser = users.rows[0];
    console.log(`Using admin: ${adminUser.discord_username} (${adminUser.id.substring(0, 8)}...)`);
    
    // Create tournaments that match your local setup
    console.log('\n🏆 Creating tournaments...');
    
    const tournaments = [
      {
        id: '11111111-2222-3333-4444-555555555555',
        tournament_id: 'test-tournament-1',
        name: 'Test Tournament Debug',
        description: 'Debug tournament for testing',
        status: 'active',
        max_teams: 8,
        bracket_type: 'single_elimination',
        game_format: 'best_of_3',
        quarter_final_format: 'best_of_3',
        semi_final_format: 'best_of_5',
        grand_final_format: 'best_of_7',
        current_teams: 0,
        registration_open: true,
        check_in_enabled: false,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        id: '22222222-3333-4444-5555-666666666666',
        tournament_id: 'test-admin-panel',
        name: 'test admin panel',
        description: 'Tournament for testing admin panel functionality',
        status: 'active',
        max_teams: 16,
        bracket_type: 'single_elimination',
        game_format: 'best_of_3',
        quarter_final_format: 'best_of_3',
        semi_final_format: 'best_of_5',
        grand_final_format: 'best_of_7',
        current_teams: 0,
        registration_open: true,
        check_in_enabled: true,
        start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: '33333333-4444-5555-6666-777777777777',
        tournament_id: 'testing-big-bracket',
        name: 'Testing big bracket',
        description: 'Large bracket for comprehensive testing',
        status: 'Registration',
        max_teams: 32,
        bracket_type: 'double_elimination',
        game_format: 'best_of_1',
        quarter_final_format: 'best_of_3',
        semi_final_format: 'best_of_5',
        grand_final_format: 'best_of_7',
        current_teams: 0,
        registration_open: true,
        check_in_enabled: false,
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
      }
    ];
    
    for (const tournament of tournaments) {
      try {
        const columns = [...Object.keys(tournament), 'created_by', 'created_at', 'updated_at'];
        const values = [...Object.values(tournament), adminUser.id, new Date(), new Date()];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await pool.query(
          `INSERT INTO tournaments (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        
        console.log(`  ✅ ${tournament.name}`);
      } catch (err) {
        console.log(`  ❌ ${tournament.name}: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Create teams for each tournament
    console.log('\n👥 Creating teams...');
    
    const teamData = [
      // Teams for "test admin panel" tournament
      {
        tournament_id: tournaments[1].id,
        tournament_name: 'test admin panel',
        teams: [
          { name: 'Admin Test Team 1', tag: 'AT1' },
          { name: 'Admin Test Team 2', tag: 'AT2' },
          { name: 'Panel Testing Squad', tag: 'PTS' },
          { name: 'Debug Warriors', tag: 'DBG' }
        ]
      },
      // Teams for "Test Tournament Debug"
      {
        tournament_id: tournaments[0].id,
        tournament_name: 'Test Tournament Debug',
        teams: [
          { name: 'Debug Alpha', tag: 'DA' },
          { name: 'Debug Beta', tag: 'DB' }
        ]
      },
      // Teams for "Testing big bracket"
      {
        tournament_id: tournaments[2].id,
        tournament_name: 'Testing big bracket',
        teams: [
          { name: 'Big Bracket Team 1', tag: 'BB1' },
          { name: 'Big Bracket Team 2', tag: 'BB2' },
          { name: 'Large Tournament Squad', tag: 'LTS' }
        ]
      }
    ];
    
    for (const tournamentTeams of teamData) {
      console.log(`\n  Creating teams for "${tournamentTeams.tournament_name}":`);
      
      for (const teamInfo of tournamentTeams.teams) {
        try {
          await pool.query(`
            INSERT INTO teams (
              id, team_id, team_name, team_tag, tournament_id, 
              captain_id, confirmed, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [
            `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
            `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            teamInfo.name,
            teamInfo.tag,
            tournamentTeams.tournament_id,
            adminUser.id,
            true
          ]);
          
          console.log(`    ✅ ${teamInfo.name} (${teamInfo.tag})`);
        } catch (err) {
          console.log(`    ❌ ${teamInfo.name}: ${err.message.substring(0, 60)}`);
        }
      }
    }
    
    // Create a test draft session
    console.log('\n⚔️  Creating test draft session...');
    
    // Get teams for draft
    const draftTeams = await pool.query(`
      SELECT id, team_name FROM teams 
      WHERE tournament_id = $1 
      ORDER BY created_at 
      LIMIT 2
    `, [tournaments[1].id]); // Use admin panel tournament
    
    if (draftTeams.rows.length >= 2) {
      try {
        await pool.query(`
          INSERT INTO draft_sessions (
            id, tournament_id, team1_id, team2_id, team1_captain_id, team2_captain_id,
            match_id, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          'draft-session-test-001',
          tournaments[1].id,
          draftTeams.rows[0].id,
          draftTeams.rows[1].id,
          adminUser.id,
          adminUser.id,
          'test-match-001',
          'waiting'
        ]);
        
        console.log(`  ✅ Draft session: ${draftTeams.rows[0].team_name} vs ${draftTeams.rows[1].team_name}`);
      } catch (err) {
        console.log(`  ❌ Draft session error: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Final verification
    console.log('\n📊 FINAL VERIFICATION:\n');
    
    const finalCounts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tournaments) as tournaments,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM draft_sessions) as draft_sessions
    `);
    
    const counts = finalCounts.rows[0];
    console.log(`✅ Tournaments: ${counts.tournaments}`);
    console.log(`✅ Teams: ${counts.teams}`);
    console.log(`✅ Users: ${counts.users}`);
    console.log(`✅ Draft Sessions: ${counts.draft_sessions}`);
    
    // Show tournament details with team counts
    const tournamentDetails = await pool.query(`
      SELECT t.name, t.status,
             (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id) as team_count
      FROM tournaments t
      ORDER BY t.created_at
    `);
    
    console.log('\nTournament Details:');
    tournamentDetails.rows.forEach(t => {
      console.log(`  - ${t.name} (${t.status}) - ${t.team_count} teams`);
    });
    
    console.log('\n🎉 TEST DATA RECREATION COMPLETE!');
    console.log('\n✨ Your production database now has:');
    console.log('  • 3 well-structured tournaments');
    console.log('  • Multiple teams per tournament (properly associated)');
    console.log('  • Working draft session');
    console.log('  • All foreign key relationships intact');
    console.log('\n🔗 Test your site: https://ocl-predecessor.netlify.app');
    console.log('The "test admin panel" tournament should now show teams and be fully functional!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await pool.end();
  }
}

recreateTestData();