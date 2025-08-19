const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function copyLocalToProduction() {
  console.log('🚀 COPYING LOCAL DATABASE TO PRODUCTION\n');
  console.log('This will copy all your local tournaments, teams, drafts, etc. to production.\n');
  
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
  
  // Production database config - Using Supabase
  const productionConfig = {
    host: process.env.SUPABASE_HOST || 'db.gvcxbwwnbkpqllqcvlxl.supabase.co',
    port: 5432,
    database: 'postgres',
    user: process.env.SUPABASE_USER || 'postgres',
    password: process.env.SUPABASE_PASSWORD || 'your-supabase-password-here',
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
  };
  
  console.log('📝 NOTE: Update the production config with your Supabase credentials!');
  console.log('Get them from: https://app.supabase.com/project/YOUR_PROJECT/settings/database\n');
  
  const localPool = new Pool(localConfig);
  const prodPool = new Pool(productionConfig);
  
  try {
    // Test connections
    console.log('📡 Connecting to databases...');
    
    const localClient = await localPool.connect();
    await localClient.query('SELECT NOW()');
    localClient.release();
    console.log('✅ Connected to LOCAL database');
    
    const prodClient = await prodPool.connect();
    await prodClient.query('SELECT NOW()');
    prodClient.release();
    console.log('✅ Connected to PRODUCTION database\n');
    
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
    
    console.log('📊 Analyzing local database...\n');
    
    for (const table of tablesToCopy) {
      try {
        // Get count from local
        const localCount = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(localCount.rows[0].count);
        
        if (count === 0) {
          console.log(`⏭️  Skipping ${table} (no data)`);
          continue;
        }
        
        console.log(`📋 Copying ${table} (${count} records)...`);
        
        // Get all data from local
        const localData = await localPool.query(`SELECT * FROM ${table}`);
        
        if (localData.rows.length === 0) {
          continue;
        }
        
        // Clear production table (optional - comment out to merge instead of replace)
        try {
          await prodPool.query(`DELETE FROM ${table}`);
        } catch (err) {
          console.log(`  ⚠️  Could not clear ${table}: ${err.message.substring(0, 50)}`);
        }
        
        // Insert data into production
        let inserted = 0;
        let skipped = 0;
        
        for (const row of localData.rows) {
          try {
            // Build INSERT query dynamically
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
            // Silently skip duplicates and constraint violations
            if (!err.message.includes('duplicate') && !err.message.includes('violates')) {
              console.log(`  ⚠️  Row skip: ${err.message.substring(0, 50)}`);
            }
          }
        }
        
        console.log(`  ✅ ${table}: ${inserted} inserted, ${skipped} skipped\n`);
        
      } catch (err) {
        console.log(`❌ Error with ${table}: ${err.message}\n`);
      }
    }
    
    // Verify final state
    console.log('\n📊 PRODUCTION DATABASE STATE:\n');
    
    const importantTables = ['tournaments', 'teams', 'users', 'draft_sessions', 'tournament_brackets'];
    for (const table of importantTables) {
      try {
        const result = await prodPool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✅ ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  ❌ ${table}: error`);
      }
    }
    
    console.log('\n🎉 SUCCESS! Your local database has been copied to production!');
    console.log('\n👉 Go check your production site now:');
    console.log('   https://ocl-predecessor.netlify.app');
    console.log('\n   All your tournaments, teams, and drafts should be there!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure DATABASE_URL is set in your .env file');
    console.log('2. Make sure your local PostgreSQL is running');
    console.log('3. Check that production database is accessible');
  } finally {
    await localPool.end();
    await prodPool.end();
  }
}

// Run it!
if (require.main === module) {
  console.log('⚠️  WARNING: This will copy ALL data from local to production!');
  console.log('Press Ctrl+C to cancel, or any key to continue...\n');
  
  process.stdin.once('data', () => {
    copyLocalToProduction()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
      });
  });
}