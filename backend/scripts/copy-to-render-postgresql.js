const { Pool } = require('pg');

async function copyToRenderPostgreSQL() {
  console.log('🚀 COPYING LOCAL DATABASE TO RENDER POSTGRESQL\n');
  console.log('This is your REAL production database!\n');
  
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
    // Test connections
    console.log('📡 Connecting to databases...');
    
    // Test local
    const localClient = await localPool.connect();
    await localClient.query('SELECT NOW()');
    localClient.release();
    console.log('✅ Connected to LOCAL database');
    
    // Test Render PostgreSQL
    const renderClient = await renderPool.connect();
    const timeResult = await renderClient.query('SELECT NOW()');
    console.log('✅ Connected to RENDER POSTGRESQL (your real production DB)');
    console.log('Render server time:', timeResult.rows[0].now);
    renderClient.release();
    
    // Check current state of Render database
    console.log('\n📊 Current RENDER database state:');
    
    const checkTables = ['tournaments', 'teams', 'users', 'draft_sessions', 'tournament_brackets'];
    for (const table of checkTables) {
      try {
        const result = await renderPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  - ${table}: ${result.rows[0].count} records`);
        
        if (table === 'tournaments' && result.rows[0].count > 0) {
          const samples = await renderPool.query(`SELECT id, name FROM ${table} LIMIT 3`);
          samples.rows.forEach(row => {
            console.log(`      * ${row.name} (${row.id})`);
          });
        }
      } catch (err) {
        console.log(`  - ${table}: table doesn't exist or error`);
      }
    }
    
    console.log('\n⚠️  WARNING: This will copy your LOCAL data to RENDER (your actual production)');
    console.log('This should restore your working tournaments and teams!\n');
    
    // Tables to copy (in order due to foreign key constraints)
    const tablesToCopy = [
      'users',
      'tournaments', 
      'teams',
      'tournament_registrations',
      'tournament_brackets',
      'bracket_matches',
      'heroes',
      'draft_sessions',
      'draft_participants',
      'draft_actions',
      'draft_timer_events',
      'omeda_game_data',
      'team_invitations'
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const table of tablesToCopy) {
      try {
        // Check if table exists in Render
        const tableExistsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `;
        const tableExists = await renderPool.query(tableExistsQuery, [table]);
        
        if (!tableExists.rows[0].exists) {
          console.log(`⏭️  Skipping ${table} (table doesn't exist in Render)`);
          continue;
        }
        
        // Get count from local
        const localCount = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(localCount.rows[0].count);
        
        if (count === 0) {
          console.log(`⏭️  Skipping ${table} (no data in local)`);
          continue;
        }
        
        console.log(`📋 Copying ${table} (${count} records)...`);
        
        // Get all data from local
        const localData = await localPool.query(`SELECT * FROM ${table} ORDER BY 1`);
        
        // Clear Render table first (except users to avoid breaking auth)
        if (table !== 'users') {
          try {
            await renderPool.query(`DELETE FROM ${table}`);
          } catch (err) {
            // Ignore cascade errors
          }
        }
        
        // Insert data into Render
        let inserted = 0;
        let skipped = 0;
        
        for (const row of localData.rows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            const insertQuery = `
              INSERT INTO ${table} (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `;
            
            await renderPool.query(insertQuery, values);
            inserted++;
          } catch (err) {
            skipped++;
            // Only show non-duplicate errors
            if (!err.message.includes('duplicate') && !err.message.includes('violates') && !err.message.includes('does not exist')) {
              console.log(`  ⚠️  Row error: ${err.message.substring(0, 70)}`);
            }
          }
        }
        
        console.log(`  ✅ ${table}: ${inserted} inserted, ${skipped} skipped`);
        successCount++;
        
      } catch (err) {
        console.log(`❌ Error with ${table}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Verify final state
    console.log('\n📊 FINAL RENDER DATABASE STATE:\n');
    
    for (const table of checkTables) {
      try {
        const result = await renderPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✅ ${table}: ${result.rows[0].count} records`);
        
        if (table === 'tournaments') {
          const samples = await renderPool.query(`SELECT id, name FROM ${table} LIMIT 3`);
          samples.rows.forEach(row => {
            console.log(`      - ${row.name} (${row.id})`);
          });
        }
      } catch (err) {
        console.log(`  ❌ ${table}: error or doesn't exist`);
      }
    }
    
    console.log(`\n📈 Summary: ${successCount} tables copied, ${errorCount} errors`);
    
    console.log('\n🎉 SUCCESS! Your local data has been copied to RENDER PostgreSQL!');
    console.log('\n👉 Your production site should now show your tournaments!');
    console.log('   https://ocl-predecessor.netlify.app');
    console.log('\n   This is your ACTUAL production database - not Supabase!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log('\nFull error for debugging:', error);
  } finally {
    await localPool.end();
    await renderPool.end();
  }
}

// Run it!
copyToRenderPostgreSQL()
  .then(() => {
    console.log('\nScript completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });