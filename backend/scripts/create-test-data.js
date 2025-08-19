const { Pool } = require('pg');

async function createTestData() {
  console.log('🎯 CREATING CLEAN TEST DATA FOR PRODUCTION TESTING\n');
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
  };
  
  const pool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting to production database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected to production database\n');
    
    // Create a test admin user first
    console.log('👤 Creating test admin user...');
    
    const adminId = '11111111-1111-1111-1111-111111111111';
    const createAdminQuery = `
      INSERT INTO users (id, user_id, discord_id, discord_username, email, is_admin, created_at, updated_at)
      VALUES ($1, 'test_admin', '123456789', 'TestAdmin', 'test@example.com', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        is_admin = true,
        discord_username = 'TestAdmin'
    `;
    
    await pool.query(createAdminQuery, [adminId]);
    console.log('✅ Test admin user created\n');
    
    // Create test tournaments
    console.log('🏆 Creating test tournaments...\n');
    
    const tournaments = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        tournament_id: 'test-tournament-1',
        name: 'Test Tournament 1',
        description: 'First test tournament for production testing',
        status: 'upcoming',
        max_teams: 8
      },
      {
        id: '33333333-3333-3333-3333-333333333333', 
        tournament_id: 'test-tournament-2',
        name: 'Test Tournament 2',
        description: 'Second test tournament for production testing',
        status: 'active',
        max_teams: 16
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        tournament_id: 'test-tournament-3', 
        name: 'Big Test Tournament',
        description: 'Large tournament for extensive testing',
        status: 'upcoming',
        max_teams: 32
      }
    ];
    
    for (const tournament of tournaments) {
      try {
        const insertQuery = `
          INSERT INTO tournaments (id, tournament_id, name, description, status, max_teams, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET 
            name = $3,
            description = $4,
            status = $5
        `;
        
        await pool.query(insertQuery, [
          tournament.id,
          tournament.tournament_id, 
          tournament.name,
          tournament.description,
          tournament.status,
          tournament.max_teams,
          adminId
        ]);
        
        console.log(`  ✅ Created: ${tournament.name}`);
      } catch (err) {
        console.log(`  ❌ Error creating ${tournament.name}: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Create test teams
    console.log('\n👥 Creating test teams...\n');
    
    const teams = [
      { name: 'Alpha Squad', tag: 'ALPH', tournament_id: tournaments[0].id },
      { name: 'Beta Force', tag: 'BETA', tournament_id: tournaments[0].id },
      { name: 'Gamma Warriors', tag: 'GAMM', tournament_id: tournaments[1].id },
      { name: 'Delta Legends', tag: 'DELT', tournament_id: tournaments[1].id },
      { name: 'Echo Champions', tag: 'ECHO', tournament_id: tournaments[2].id },
      { name: 'Foxtrot Heroes', tag: 'FOX', tournament_id: tournaments[2].id },
      { name: 'Golf Masters', tag: 'GOLF', tournament_id: tournaments[2].id },
      { name: 'Hotel Elite', tag: 'HTL', tournament_id: tournaments[2].id }
    ];
    
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      try {
        const teamId = `${55550000 + i}-5555-5555-5555-555555555555`.substring(0, 36);
        const teamIdStr = `team_${i + 1}_test`;
        
        const insertQuery = `
          INSERT INTO teams (id, team_id, team_name, team_tag, tournament_id, captain_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET 
            team_name = $3,
            team_tag = $4
        `;
        
        await pool.query(insertQuery, [
          teamId,
          teamIdStr,
          team.name,
          team.tag,
          team.tournament_id,
          adminId
        ]);
        
        console.log(`  ✅ Created: ${team.name} (${team.tag})`);
      } catch (err) {
        console.log(`  ❌ Error creating ${team.name}: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Create test draft session
    console.log('\n⚔️  Creating test draft session...\n');
    
    try {
      const draftId = '66666666-6666-6666-6666-666666666666';
      const team1Id = '55550000-5555-5555-5555-555555555555';
      const team2Id = '55550001-5555-5555-5555-555555555555';
      
      const draftQuery = `
        INSERT INTO draft_sessions (
          id, tournament_id, team1_id, team2_id, team1_captain_id, team2_captain_id,
          match_id, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET status = $8
      `;
      
      await pool.query(draftQuery, [
        draftId,
        tournaments[0].id,
        team1Id,
        team2Id, 
        adminId,
        adminId,
        'test_match_001',
        'waiting'
      ]);
      
      console.log('  ✅ Created test draft session');
    } catch (err) {
      console.log(`  ❌ Error creating draft: ${err.message.substring(0, 50)}`);
    }
    
    // Verify final state
    console.log('\n📊 FINAL TEST DATA STATE:\n');
    
    const tables = ['users', 'tournaments', 'teams', 'draft_sessions'];
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`❌ ${table}: error`);
      }
    }
    
    // Show tournament details
    try {
      const tournamentsResult = await pool.query(`SELECT name, status FROM tournaments ORDER BY created_at DESC LIMIT 5`);
      console.log('\nTournaments:');
      tournamentsResult.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.status})`);
      });
    } catch (err) {
      console.log('Error showing tournaments');
    }
    
    console.log('\n🎉 TEST DATA CREATION COMPLETE!');
    console.log('\n👉 Your production site should now have:');
    console.log('   - 3 test tournaments');
    console.log('   - 8 test teams'); 
    console.log('   - 1 test draft session');
    console.log('   - Admin user for testing');
    console.log('\n🔗 Test at: https://ocl-predecessor.netlify.app');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log(error.stack);
  } finally {
    await pool.end();
  }
}

createTestData();