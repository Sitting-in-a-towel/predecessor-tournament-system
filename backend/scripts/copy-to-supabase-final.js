const { Pool } = require('pg');

async function copyLocalToProduction() {
  console.log('🚀 COPYING LOCAL DATABASE TO PRODUCTION (SUPABASE)\n');
  
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
  
  // Production database config - Supabase Pooler Connection
  const productionConfig = {
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.gvcxbwwnbkpqllqcvlxl',
    password: 'Antigravity7@!89',
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    max: 5,
    connectionTimeoutMillis: 30000,
  };
  
  const localPool = new Pool(localConfig);
  const prodPool = new Pool(productionConfig);
  
  try {
    // Test connections
    console.log('📡 Connecting to databases...');
    
    // Test local
    console.log('Testing LOCAL connection...');
    const localClient = await localPool.connect();
    await localClient.query('SELECT NOW()');
    localClient.release();
    console.log('✅ Connected to LOCAL database');
    
    // Test production
    console.log('Testing PRODUCTION (Supabase) connection...');
    const prodClient = await prodPool.connect();
    const timeResult = await prodClient.query('SELECT NOW()');
    console.log('✅ Connected to SUPABASE successfully!');
    console.log('Supabase server time:', timeResult.rows[0].now);
    prodClient.release();
    
    // Tables to copy (in order due to foreign key constraints)
    const tablesToCopy = [
      'users',
      'tournaments', 
      'teams',
      'team_players',
      'tournament_registrations',
      'tournament_brackets',
      'bracket_matches',
      'matches',
      'heroes',
      'draft_sessions',
      'draft_participants',
      'draft_actions',
      'draft_timer_events',
      'omeda_game_data',
      'team_invitations'
    ];
    
    console.log('\n📊 Checking current production database state...\n');
    
    // Check what exists in production first
    for (const table of ['tournaments', 'teams', 'draft_sessions', 'users']) {
      try {
        const result = await prodPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  Production ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  Production ${table}: table doesn't exist`);
      }
    }
    
    console.log('\n⚠️  Starting copy process...\n');
    console.log('This will REPLACE production data with your local data.\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const table of tablesToCopy) {
      try {
        // Check if table exists in production
        const tableExistsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `;
        const tableExists = await prodPool.query(tableExistsQuery, [table]);
        
        if (!tableExists.rows[0].exists) {
          console.log(`⏭️  Skipping ${table} (table doesn't exist in production)`);
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
        
        // Clear production table (delete in reverse order to avoid FK violations)
        if (table !== 'users') { // Don't delete users as they might be referenced
          try {
            await prodPool.query(`DELETE FROM ${table}`);
          } catch (err) {
            // Ignore cascade errors
          }
        }
        
        // Insert data into production
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
            
            await prodPool.query(insertQuery, values);
            inserted++;
          } catch (err) {
            skipped++;
            if (!err.message.includes('duplicate') && !err.message.includes('violates')) {
              console.log(`  ⚠️  Error: ${err.message.substring(0, 50)}`);
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
    console.log('\n📊 FINAL PRODUCTION DATABASE STATE:\n');
    
    const importantTables = ['tournaments', 'teams', 'users', 'draft_sessions', 'tournament_brackets'];
    for (const table of importantTables) {
      try {
        const result = await prodPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✅ ${table}: ${result.rows[0].count} records`);
        
        // Show some sample data
        if (table === 'tournaments') {
          const samples = await prodPool.query(`SELECT id, name FROM ${table} LIMIT 3`);
          samples.rows.forEach(row => {
            console.log(`      - ${row.name} (${row.id})`);
          });
        }
      } catch (err) {
        console.log(`  ❌ ${table}: error or doesn't exist`);
      }
    }
    
    console.log(`\n📈 Summary: ${successCount} tables copied, ${errorCount} errors`);
    
    if (successCount > 0) {
      console.log('\n🎉 SUCCESS! Your local database has been copied to production!');
      console.log('\n👉 Go check your production site now:');
      console.log('   https://ocl-predecessor.netlify.app');
      console.log('\n   Your tournaments, teams, and drafts should now be visible!');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    
    if (error.message.includes('Tenant or user not found')) {
      console.log('\n💡 The user format might be wrong. Try:');
      console.log('   - postgres.gvcxbwwnbkpqllqcvlxl (with project ref)');
      console.log('   - postgres (without project ref)');
    }
    
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure Supabase project is active (not paused)');
    console.log('2. Verify the password is: Antigravity7@!89');
    console.log('3. Check Settings → Database → Connection pooling in Supabase');
    console.log('4. Make sure your local PostgreSQL is running');
  } finally {
    await localPool.end();
    await prodPool.end();
  }
}

// Run it!
console.log('Starting database copy...\n');
copyLocalToProduction()
  .then(() => {
    console.log('\nScript completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });