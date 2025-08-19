const { Pool } = require('pg');

async function forceCompleteCopy() {
  console.log('🔥 FORCING COMPLETE LOCAL → PRODUCTION DATA COPY\n');
  console.log('This will REPLACE ALL production data with local data\n');
  
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
  
  // Render PostgreSQL config (Your ACTUAL production database)
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
    
    // Get all local data first
    console.log('📊 ANALYZING LOCAL DATABASE:\n');
    const checkTables = ['tournaments', 'teams', 'users', 'heroes', 'tournament_registrations'];
    
    for (const table of checkTables) {
      try {
        const localResult = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`LOCAL ${table}: ${localResult.rows[0].count} records`);
        
        if (table === 'tournaments') {
          const sampleData = await localPool.query(`SELECT id, name FROM ${table} ORDER BY created_at DESC`);
          sampleData.rows.forEach(row => {
            console.log(`    - ${row.name} (${row.id})`);
          });
        }
      } catch (err) {
        console.log(`LOCAL ${table}: error - ${err.message}`);
      }
    }
    
    console.log('\n🔥 CLEARING PRODUCTION TABLES (except users)...\n');
    
    // Clear production tables in safe order (respecting foreign keys)
    const tablesToClear = [
      'tournament_registrations',
      'tournament_brackets', 
      'bracket_matches',
      'draft_sessions',
      'team_invitations',
      'teams',
      'tournaments', // Clear tournaments last due to foreign keys
      'heroes'
    ];
    
    for (const table of tablesToClear) {
      try {
        const result = await renderPool.query(`DELETE FROM ${table}`);
        console.log(`  🗑️  Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (err) {
        console.log(`  ⚠️  Error clearing ${table}: ${err.message.substring(0, 50)}`);
      }
    }
    
    console.log('\n📋 COPYING ALL DATA FROM LOCAL TO PRODUCTION:\n');
    
    // Tables to copy in proper order
    const tablesToCopy = [
      'users',      // Copy users first (may have new ones)
      'tournaments', // Then tournaments
      'teams',      // Then teams
      'heroes',     // Then heroes
      'tournament_registrations', // Then registrations
      'tournament_brackets',      // Then brackets
      'bracket_matches',          // Then bracket matches
      'draft_sessions',           // Then draft sessions
      'team_invitations'          // Finally invitations
    ];
    
    let totalInserted = 0;
    
    for (const table of tablesToCopy) {
      try {
        // Get ALL data from local
        const localData = await localPool.query(`SELECT * FROM ${table} ORDER BY created_at ASC`);
        
        if (localData.rows.length === 0) {
          console.log(`⏭️  ${table}: no local data to copy`);
          continue;
        }
        
        console.log(`📋 Copying ${table}: ${localData.rows.length} records...`);
        
        let inserted = 0;
        let errors = 0;
        
        // Insert each row individually with detailed error handling
        for (const row of localData.rows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            // Use INSERT without ON CONFLICT to force data through
            const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            await renderPool.query(insertQuery, values);
            inserted++;
            totalInserted++;
          } catch (err) {
            errors++;
            
            // Show detailed errors for critical tables
            if (table === 'tournaments' || table === 'teams') {
              console.log(`    ❌ Row error in ${table}: ${err.message.substring(0, 100)}`);
            }
          }
        }
        
        console.log(`  ✅ ${table}: ${inserted} inserted, ${errors} errors`);
        
      } catch (err) {
        console.log(`❌ Failed to copy ${table}: ${err.message}`);
      }
    }
    
    // Final verification
    console.log('\n📊 FINAL PRODUCTION STATE:\n');
    
    for (const table of checkTables) {
      try {
        const result = await renderPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`PRODUCTION ${table}: ${result.rows[0].count} records`);
        
        if (table === 'tournaments') {
          const sampleData = await renderPool.query(`SELECT id, name FROM ${table} ORDER BY created_at DESC LIMIT 5`);
          sampleData.rows.forEach(row => {
            console.log(`    - ${row.name} (${row.id})`);
          });
        }
      } catch (err) {
        console.log(`PRODUCTION ${table}: error`);
      }
    }
    
    console.log(`\n🎉 FORCE COPY COMPLETE!`);
    console.log(`Total records inserted: ${totalInserted}`);
    console.log('\n👉 Test your production site now: https://ocl-predecessor.netlify.app');
    console.log('You should see all your local tournaments, teams, and users!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

forceCompleteCopy();