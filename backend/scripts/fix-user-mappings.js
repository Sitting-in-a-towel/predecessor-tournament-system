const { Pool } = require('pg');

async function fixUserMappings() {
  console.log('🔧 FIXING USER ID MAPPINGS FOR TOURNAMENTS\n');
  
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89',
    max: 5,
    connectionTimeoutMillis: 10000,
  };
  
  const renderConfig = {
    connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db',
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
  };
  
  const localPool = new Pool(localConfig);
  const renderPool = new Pool(renderConfig);
  
  try {
    console.log('📡 Connecting...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected\n');
    
    // Create user mapping between local and production
    console.log('🗺️  Creating user mapping...');
    
    const localUsers = await localPool.query(`SELECT id, user_id, discord_username FROM users`);
    const prodUsers = await renderPool.query(`SELECT id, user_id, discord_username FROM users`);
    
    const userMapping = {};
    
    for (const localUser of localUsers.rows) {
      // Find matching production user by user_id or discord_username
      const prodUser = prodUsers.rows.find(pu => 
        pu.user_id === localUser.user_id || 
        (pu.discord_username && localUser.discord_username && pu.discord_username === localUser.discord_username)
      );
      
      if (prodUser) {
        userMapping[localUser.id] = prodUser.id;
        console.log(`  ✅ ${localUser.discord_username || localUser.user_id}: ${localUser.id.substring(0, 8)}... → ${prodUser.id.substring(0, 8)}...`);
      } else {
        console.log(`  ❌ ${localUser.discord_username || localUser.user_id}: NO MATCH FOUND`);
      }
    }
    
    console.log(`\nMapped ${Object.keys(userMapping).length}/${localUsers.rows.length} users`);
    
    // Now copy tournaments with corrected user IDs
    console.log('\n🏆 COPYING TOURNAMENTS WITH CORRECTED USER IDs...\n');
    
    const localTournaments = await localPool.query(`SELECT * FROM tournaments ORDER BY created_at`);
    
    let inserted = 0;
    let errors = 0;
    
    for (const tournament of localTournaments.rows) {
      try {
        // Create copy of tournament
        const tournamentData = { ...tournament };
        
        // Map the created_by user ID
        if (tournamentData.created_by && userMapping[tournamentData.created_by]) {
          tournamentData.created_by = userMapping[tournamentData.created_by];
          console.log(`📋 ${tournament.name}: mapping creator ${tournament.created_by.substring(0, 8)}... → ${tournamentData.created_by.substring(0, 8)}...`);
        } else if (tournamentData.created_by) {
          // Use first available admin user if mapping fails
          const adminUser = prodUsers.rows.find(u => u.user_id === 'TestAdmin' || u.discord_username === 'TestAdmin');
          if (adminUser) {
            tournamentData.created_by = adminUser.id;
            console.log(`📋 ${tournament.name}: using fallback admin user ${adminUser.id.substring(0, 8)}...`);
          } else {
            console.log(`📋 ${tournament.name}: ⚠️  NO CREATOR MAPPING OR FALLBACK`);
          }
        }
        
        // Insert tournament
        const columns = Object.keys(tournamentData);
        const values = Object.values(tournamentData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await renderPool.query(`
          INSERT INTO tournaments (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name,
            created_by = EXCLUDED.created_by
        `, values);
        
        inserted++;
        console.log(`  ✅ ${tournament.name}`);
        
      } catch (err) {
        errors++;
        console.log(`  ❌ ${tournament.name}: ${err.message.substring(0, 80)}`);
      }
    }
    
    console.log(`\n📊 Tournament copy results: ${inserted}/${localTournaments.rows.length} inserted, ${errors} errors`);
    
    // Now copy teams with corrected tournament and user IDs
    console.log('\n👥 COPYING TEAMS WITH CORRECTED IDs...\n');
    
    const localTeams = await localPool.query(`SELECT * FROM teams ORDER BY created_at`);
    const prodTournaments = await renderPool.query(`SELECT id, tournament_id, name FROM tournaments`);
    
    let teamsInserted = 0;
    let teamsErrors = 0;
    
    for (const team of localTeams.rows) {
      try {
        const teamData = { ...team };
        
        // Map captain_id
        if (teamData.captain_id && userMapping[teamData.captain_id]) {
          teamData.captain_id = userMapping[teamData.captain_id];
        }
        
        // Map tournament_id (should already be correct as we use same UUIDs)
        const prodTournament = prodTournaments.rows.find(pt => pt.id === teamData.tournament_id);
        
        if (!prodTournament) {
          console.log(`  ⚠️  ${team.team_name}: tournament ${team.tournament_id.substring(0, 8)}... not found in production`);
          continue;
        }
        
        const columns = Object.keys(teamData);
        const values = Object.values(teamData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await renderPool.query(`
          INSERT INTO teams (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET
            team_name = EXCLUDED.team_name,
            captain_id = EXCLUDED.captain_id
        `, values);
        
        teamsInserted++;
        if (teamsInserted <= 10) { // Show first 10
          console.log(`  ✅ ${team.team_name} (${prodTournament.name})`);
        }
        
      } catch (err) {
        teamsErrors++;
        if (teamsErrors <= 5) { // Show first 5 errors
          console.log(`  ❌ ${team.team_name}: ${err.message.substring(0, 80)}`);
        }
      }
    }
    
    console.log(`\n📊 Team copy results: ${teamsInserted}/${localTeams.rows.length} inserted, ${teamsErrors} errors`);
    
    // Final verification
    console.log('\n📊 FINAL VERIFICATION:\n');
    
    const finalTournaments = await renderPool.query('SELECT COUNT(*) FROM tournaments');
    const finalTeams = await renderPool.query('SELECT COUNT(*) FROM teams');
    const finalUsers = await renderPool.query('SELECT COUNT(*) FROM users');
    
    console.log(`✅ Tournaments: ${finalTournaments.rows[0].count}`);
    console.log(`✅ Teams: ${finalTeams.rows[0].count}`);
    console.log(`✅ Users: ${finalUsers.rows[0].count}`);
    
    // Show tournaments
    const sampleTournaments = await renderPool.query(`
      SELECT name, status, created_by 
      FROM tournaments 
      ORDER BY created_at DESC 
      LIMIT 6
    `);
    
    console.log('\nTournaments in production:');
    sampleTournaments.rows.forEach(t => {
      console.log(`  - ${t.name} (${t.status}) by ${t.created_by ? t.created_by.substring(0, 8) + '...' : 'NULL'}`);
    });
    
    console.log('\n🎉 USER MAPPING FIX COMPLETE!');
    console.log('🔗 Test your site: https://ocl-predecessor.netlify.app');
    console.log('All tournaments should now have valid creators and be accessible!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

fixUserMappings();