const { Pool } = require('pg');

async function smartDataCopy() {
  console.log('🧠 SMART DATA COPY - Handling Foreign Key Dependencies\n');
  
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
    console.log('📡 Connecting to databases...');
    await localPool.query('SELECT 1');
    await renderPool.query('SELECT 1');
    console.log('✅ Connected to both databases\n');
    
    // Step 1: Clear production in safe order
    console.log('🗑️  Clearing production tables in safe order...\n');
    
    const clearOrder = [
      'tournament_registrations',
      'tournament_brackets',
      'bracket_matches', 
      'draft_sessions',
      'team_invitations',
      'teams',
      'tournaments'
    ];
    
    for (const table of clearOrder) {
      try {
        const result = await renderPool.query(`DELETE FROM ${table}`);
        console.log(`  ✅ Cleared ${table} (${result.rowCount} rows)`);
      } catch (err) {
        console.log(`  ⚠️  ${table}: ${err.message.substring(0, 50)}`);
      }
    }
    
    // Step 2: Copy users first (using UPSERT to handle existing users)
    console.log('\n👥 Copying users with UPSERT...\n');
    
    const localUsers = await localPool.query(`SELECT * FROM users ORDER BY created_at ASC`);
    console.log(`Found ${localUsers.rows.length} users in local database`);
    
    let usersInserted = 0;
    for (const user of localUsers.rows) {
      try {
        const columns = Object.keys(user).filter(col => col !== 'created_at' && col !== 'updated_at');
        const values = columns.map(col => user[col]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const updateSet = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        
        const upsertQuery = `
          INSERT INTO users (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET ${updateSet}
        `;
        
        await renderPool.query(upsertQuery, values);
        usersInserted++;
        console.log(`  ✅ User: ${user.discord_username || user.user_id}`);
      } catch (err) {
        console.log(`  ❌ User error: ${err.message.substring(0, 70)}`);
      }
    }
    
    console.log(`\n📊 Users copied: ${usersInserted}/${localUsers.rows.length}`);
    
    // Step 3: Copy tournaments (now that users exist)
    console.log('\n🏆 Copying tournaments...\n');
    
    const localTournaments = await localPool.query(`SELECT * FROM tournaments ORDER BY created_at ASC`);
    console.log(`Found ${localTournaments.rows.length} tournaments in local database`);
    
    let tournamentsInserted = 0;
    for (const tournament of localTournaments.rows) {
      try {
        const columns = Object.keys(tournament);
        const values = Object.values(tournament);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO tournaments (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;
        
        await renderPool.query(insertQuery, values);
        tournamentsInserted++;
        console.log(`  ✅ Tournament: ${tournament.name}`);
      } catch (err) {
        console.log(`  ❌ Tournament error: ${tournament.name} - ${err.message.substring(0, 70)}`);
      }
    }
    
    console.log(`\n📊 Tournaments copied: ${tournamentsInserted}/${localTournaments.rows.length}`);
    
    // Step 4: Copy teams (now that tournaments exist)
    console.log('\n👥 Copying teams...\n');
    
    const localTeams = await localPool.query(`SELECT * FROM teams ORDER BY created_at ASC`);
    console.log(`Found ${localTeams.rows.length} teams in local database`);
    
    let teamsInserted = 0;
    for (const team of localTeams.rows) {
      try {
        const columns = Object.keys(team);
        const values = Object.values(team);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO teams (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;
        
        await renderPool.query(insertQuery, values);
        teamsInserted++;
        
        if (teamsInserted <= 5) { // Show first 5
          console.log(`  ✅ Team: ${team.team_name}`);
        }
      } catch (err) {
        console.log(`  ❌ Team error: ${team.team_name} - ${err.message.substring(0, 70)}`);
      }
    }
    
    console.log(`\n📊 Teams copied: ${teamsInserted}/${localTeams.rows.length}`);
    
    // Step 5: Copy other data
    console.log('\n🎮 Copying heroes...\n');
    
    const localHeroes = await localPool.query(`SELECT * FROM heroes`);
    let heroesInserted = 0;
    
    for (const hero of localHeroes.rows) {
      try {
        const columns = Object.keys(hero);
        const values = Object.values(hero);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO heroes (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;
        
        await renderPool.query(insertQuery, values);
        heroesInserted++;
      } catch (err) {
        console.log(`  ❌ Hero error: ${err.message.substring(0, 70)}`);
      }
    }
    
    console.log(`📊 Heroes copied: ${heroesInserted}/${localHeroes.rows.length}`);
    
    // Final verification
    console.log('\n📊 FINAL PRODUCTION STATE:\n');
    
    const finalChecks = ['users', 'tournaments', 'teams', 'heroes'];
    for (const table of finalChecks) {
      try {
        const result = await renderPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ ${table}: ${result.rows[0].count} records`);
        
        if (table === 'tournaments') {
          const samples = await renderPool.query(`SELECT name FROM ${table} LIMIT 3`);
          samples.rows.forEach(row => console.log(`    - ${row.name}`));
        }
      } catch (err) {
        console.log(`❌ ${table}: error`);
      }
    }
    
    console.log('\n🎉 SMART COPY COMPLETE!');
    console.log('\n👉 Test your production site: https://ocl-predecessor.netlify.app');
    console.log('All your local tournaments, teams, and users should now be available!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

smartDataCopy();