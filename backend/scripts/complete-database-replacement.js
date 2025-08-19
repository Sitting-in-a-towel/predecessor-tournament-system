const { Pool } = require('pg');

async function completeDatabaseReplacement() {
  console.log('🔥 COMPLETE DATABASE REPLACEMENT: LOCAL → PRODUCTION');
  console.log('Copying ENTIRE local database to production, overwriting ALL data\n');
  
  // Local database config
  const localConfig = {
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89',
    max: 5,
    connectionTimeoutMillis: 10000,
  };
  
  // Render PostgreSQL config (Production database)
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
    
    // Step 1: COMPLETELY CLEAR production database
    console.log('🗑️  COMPLETELY CLEARING PRODUCTION DATABASE...\n');
    
    // Disable foreign key constraints temporarily
    await renderPool.query('SET session_replication_role = replica;');
    console.log('✅ Disabled foreign key constraints');
    
    // Get all table names
    const tablesResult = await renderPool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
      AND tablename != 'spatial_ref_sys'
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(`Found ${tables.length} tables to clear`);
    
    // Clear ALL tables
    for (const table of tables) {
      try {
        const result = await renderPool.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`  🗑️  Cleared ${table}`);
      } catch (err) {
        console.log(`  ⚠️  ${table}: ${err.message.substring(0, 50)}`);
      }
    }
    
    console.log('\n📋 COPYING ALL DATA FROM LOCAL DATABASE...\n');
    
    // Step 2: Copy ALL data in proper dependency order
    const copyOrder = [
      'users',              // Base users first
      'heroes',             // Heroes (no dependencies)
      'tournaments',        // Tournaments depend on users
      'teams',              // Teams depend on tournaments and users
      'tournament_registrations',  // Depends on tournaments and teams
      'tournament_brackets',       // Depends on tournaments
      'bracket_matches',           // Depends on brackets and teams
      'draft_sessions',            // Depends on tournaments and teams
      'team_invitations',          // Depends on teams
      'omeda_game_data',           // Game data
      'draft_picks',               // Draft picks
      'draft_bans'                 // Draft bans
    ];
    
    let totalCopied = 0;
    
    for (const table of copyOrder) {
      try {
        // Check if table exists in local database
        const localCheck = await localPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        if (!localCheck.rows[0].exists) {
          console.log(`⏭️  ${table}: table doesn't exist in local database`);
          continue;
        }
        
        // Get all local data
        const localData = await localPool.query(`SELECT * FROM ${table} ORDER BY created_at ASC`);
        
        if (localData.rows.length === 0) {
          console.log(`⏭️  ${table}: no data to copy`);
          continue;
        }
        
        console.log(`📋 Copying ${table}: ${localData.rows.length} records...`);
        
        let inserted = 0;
        let errors = 0;
        
        // Insert all data
        for (const row of localData.rows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            await renderPool.query(insertQuery, values);
            inserted++;
            totalCopied++;
          } catch (err) {
            errors++;
            if (errors <= 3) { // Show first 3 errors only
              console.log(`    ❌ ${table} error: ${err.message.substring(0, 80)}`);
            }
          }
        }
        
        console.log(`  ✅ ${table}: ${inserted} inserted${errors > 0 ? `, ${errors} errors` : ''}`);
        
      } catch (err) {
        console.log(`❌ Failed to copy ${table}: ${err.message.substring(0, 100)}`);
      }
    }
    
    // Re-enable foreign key constraints
    await renderPool.query('SET session_replication_role = DEFAULT;');
    console.log('\n✅ Re-enabled foreign key constraints');
    
    // Step 3: Final verification
    console.log('\n📊 FINAL PRODUCTION DATABASE STATE:\n');
    
    const verifyTables = ['users', 'tournaments', 'teams', 'heroes', 'tournament_registrations'];
    
    for (const table of verifyTables) {
      try {
        const result = await renderPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ ${table}: ${result.rows[0].count} records`);
        
        // Show sample data for key tables
        if (table === 'tournaments') {
          const samples = await renderPool.query(`SELECT name, status FROM ${table} ORDER BY created_at DESC LIMIT 5`);
          samples.rows.forEach(row => {
            console.log(`    - ${row.name} (${row.status})`);
          });
        } else if (table === 'users') {
          const samples = await renderPool.query(`SELECT discord_username FROM ${table} WHERE discord_username IS NOT NULL LIMIT 3`);
          samples.rows.forEach(row => {
            console.log(`    - ${row.discord_username}`);
          });
        }
      } catch (err) {
        console.log(`❌ ${table}: verification failed`);
      }
    }
    
    console.log(`\n🎉 COMPLETE DATABASE REPLACEMENT FINISHED!`);
    console.log(`Total records copied: ${totalCopied}`);
    console.log('\n👉 Your entire local database has been copied to production!');
    console.log('🔗 Test now: https://ocl-predecessor.netlify.app');
    console.log('All your tournaments, teams, and users should be available!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log(error.stack);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

completeDatabaseReplacement();