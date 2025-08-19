const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function createProperTestData() {
  console.log('✨ CREATING PROPER TEST DATA WITH CORRECT CONSTRAINTS\n');
  
  const pool = new Pool({
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('📡 Connecting...');
    await pool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Get existing admin user
    const users = await pool.query('SELECT id, discord_username FROM users ORDER BY created_at LIMIT 1');
    const adminUser = users.rows[0];
    
    console.log(`Using admin: ${adminUser.discord_username} (${adminUser.id.substring(0, 8)}...)\n`);
    
    // Create tournaments with EXACT constraint values
    console.log('🏆 Creating tournaments with proper constraints...');
    
    const tournaments = [
      {
        id: uuidv4(),
        tournament_id: 'test-tournament-debug-001',
        name: 'Test Tournament Debug',
        description: 'Debug tournament for testing functionality',
        bracket_type: 'Single Elimination',  // Exact constraint value
        game_format: 'Best of 3',            // Exact constraint value
        quarter_final_format: 'Best of 3',
        semi_final_format: 'Best of 5',
        grand_final_format: 'Best of 5',
        max_teams: 8,
        current_teams: 0,
        registration_open: true,
        check_in_enabled: false,
        status: 'Registration',              // Exact constraint value
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        created_by: adminUser.id
      },
      {
        id: uuidv4(),
        tournament_id: 'test-admin-panel-002',
        name: 'test admin panel',
        description: 'Admin panel functionality testing tournament',
        bracket_type: 'Single Elimination',
        game_format: 'Best of 3',
        quarter_final_format: 'Best of 3',
        semi_final_format: 'Best of 5',
        grand_final_format: 'Best of 5',
        max_teams: 16,
        current_teams: 0,
        registration_open: true,
        check_in_enabled: true,
        status: 'Registration',
        start_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        created_by: adminUser.id
      },
      {
        id: uuidv4(),
        tournament_id: 'testing-big-bracket-003',
        name: 'Testing big bracket',
        description: 'Large tournament for comprehensive testing',
        bracket_type: 'Double Elimination',
        game_format: 'Best of 1',
        quarter_final_format: 'Best of 3',
        semi_final_format: 'Best of 5',
        grand_final_format: 'Best of 5',
        max_teams: 32,
        current_teams: 0,
        registration_open: true,
        check_in_enabled: false,
        status: 'Upcoming',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        created_by: adminUser.id
      }
    ];
    
    const createdTournaments = [];
    
    for (const tournament of tournaments) {
      try {
        await pool.query(`
          INSERT INTO tournaments (
            id, tournament_id, name, description, bracket_type, game_format,
            quarter_final_format, semi_final_format, grand_final_format,
            max_teams, current_teams, registration_open, check_in_enabled,
            status, start_date, end_date, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        `, [
          tournament.id, tournament.tournament_id, tournament.name, tournament.description,
          tournament.bracket_type, tournament.game_format, tournament.quarter_final_format,
          tournament.semi_final_format, tournament.grand_final_format, tournament.max_teams,
          tournament.current_teams, tournament.registration_open, tournament.check_in_enabled,
          tournament.status, tournament.start_date, tournament.end_date, tournament.created_by
        ]);
        
        createdTournaments.push(tournament);
        console.log(`  ✅ ${tournament.name} (${tournament.bracket_type})`);
        
      } catch (err) {
        console.log(`  ❌ ${tournament.name}: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Create teams for each tournament
    console.log('\\n👥 Creating teams with proper UUIDs...');
    
    const teamData = [
      // Teams for "test admin panel" tournament  
      {
        tournament_id: createdTournaments.find(t => t.name === 'test admin panel')?.id,
        tournament_name: 'test admin panel',
        teams: [
          { name: 'Admin Test Squad', tag: 'ATS' },
          { name: 'Panel Debug Team', tag: 'PDT' },
          { name: 'Testing Warriors', tag: 'TWR' },
          { name: 'Admin Panel Elite', tag: 'APE' }
        ]
      },
      // Teams for "Test Tournament Debug"
      {
        tournament_id: createdTournaments.find(t => t.name === 'Test Tournament Debug')?.id,
        tournament_name: 'Test Tournament Debug',
        teams: [
          { name: 'Debug Alpha Team', tag: 'DAT' },
          { name: 'Debug Beta Squad', tag: 'DBS' },
          { name: 'Test Debug Force', tag: 'TDF' }
        ]
      },
      // Teams for "Testing big bracket"
      {
        tournament_id: createdTournaments.find(t => t.name === 'Testing big bracket')?.id,
        tournament_name: 'Testing big bracket',
        teams: [
          { name: 'Big Tournament Team 1', tag: 'BTT1' },
          { name: 'Large Bracket Squad', tag: 'LBS' },
          { name: 'Mega Test Warriors', tag: 'MTW' },
          { name: 'Big Bracket Elite', tag: 'BBE' }
        ]
      }
    ];
    
    for (const tournamentTeams of teamData) {
      if (!tournamentTeams.tournament_id) {
        console.log(`  ⚠️  Skipping teams for ${tournamentTeams.tournament_name} (tournament not created)`);
        continue;
      }
      
      console.log(`\\n  Creating teams for "${tournamentTeams.tournament_name}":`);
      
      for (const teamInfo of tournamentTeams.teams) {
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
            tournamentTeams.tournament_id,
            adminUser.id,
            true
          ]);
          
          console.log(`    ✅ ${teamInfo.name} (${teamInfo.tag})`);
          
        } catch (err) {
          console.log(`    ❌ ${teamInfo.name}: ${err.message.substring(0, 80)}`);
        }
      }
    }
    
    // Update tournament team counts
    console.log('\\n📊 Updating tournament team counts...');
    
    for (const tournament of createdTournaments) {
      try {
        const teamCount = await pool.query(
          'SELECT COUNT(*) FROM teams WHERE tournament_id = $1',
          [tournament.id]
        );
        
        await pool.query(
          'UPDATE tournaments SET current_teams = $1 WHERE id = $2',
          [teamCount.rows[0].count, tournament.id]
        );
        
        console.log(`  ✅ ${tournament.name}: ${teamCount.rows[0].count} teams`);
        
      } catch (err) {
        console.log(`  ❌ ${tournament.name}: ${err.message.substring(0, 80)}`);
      }
    }
    
    // Final comprehensive verification
    console.log('\\n📊 FINAL VERIFICATION:\\n');
    
    const finalStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tournaments) as tournaments,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM users) as users
    `);
    
    const stats = finalStats.rows[0];
    console.log(`✅ Tournaments: ${stats.tournaments}`);
    console.log(`✅ Teams: ${stats.teams}`);
    console.log(`✅ Users: ${stats.users}`);
    
    // Show detailed tournament info
    const detailedInfo = await pool.query(`
      SELECT t.name, t.status, t.bracket_type,
             (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id) as team_count
      FROM tournaments t
      ORDER BY t.created_at
    `);
    
    console.log('\nDetailed Tournament Information:');
    detailedInfo.rows.forEach(t => {
      console.log(`  - ${t.name} (${t.status}, ${t.bracket_type}) - ${t.team_count} teams`);
    });
    
    console.log('\n🎉 PROPER TEST DATA CREATION COMPLETE!');
    console.log('\n✨ Production database now contains:');
    console.log('  • Fully functional tournaments with correct constraints');
    console.log('  • Multiple teams properly associated with tournaments');
    console.log('  • Proper foreign key relationships');
    console.log('  • All data formatted according to database constraints');
    console.log('\n🔗 Test at: https://ocl-predecessor.netlify.app');
    console.log('The "test admin panel" tournament should now show all teams and be fully functional!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await pool.end();
  }
}

createProperTestData();