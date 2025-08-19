const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function restoreToProduction() {
  console.log('🚀 RESTORING LOCAL DATABASE TO PRODUCTION\n');
  
  // Production database config from environment
  const productionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  };
  
  const pool = new Pool(productionConfig);
  
  try {
    // Test connection
    console.log('📡 Connecting to production database...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Connected to production database\n');
    
    // Check current state
    console.log('📊 Current production database state:');
    const tables = ['tournaments', 'teams', 'users', 'draft_sessions', 'tournament_brackets', 'matches'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  - ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  - ${table}: table doesn't exist or error`);
      }
    }
    
    console.log('\n⚠️  WARNING: This will REPLACE all production data with your local data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Read the SQL dump file
    const dumpFile = path.join(__dirname, 'local_data_only.sql');
    
    if (!fs.existsSync(dumpFile)) {
      console.error('❌ Error: local_data_only.sql not found!');
      console.log('Please run dump-local-database.bat first to create the dump file.');
      return;
    }
    
    console.log('📖 Reading SQL dump file...');
    const sqlContent = fs.readFileSync(dumpFile, 'utf8');
    
    // Split into individual statements (basic split, may need refinement)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute statements
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip certain statements that might cause issues
      if (statement.includes('pg_catalog.') || 
          statement.includes('CREATE EXTENSION') ||
          statement.includes('COMMENT ON EXTENSION')) {
        continue;
      }
      
      try {
        await pool.query(statement);
        successCount++;
        
        // Show progress every 10 statements
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (err) {
        errorCount++;
        
        // Only show errors for non-duplicate key violations
        if (!err.message.includes('duplicate key')) {
          console.log(`  ⚠️ Statement ${i + 1} failed: ${err.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`\n✅ Restoration complete!`);
    console.log(`  - Successful statements: ${successCount}`);
    console.log(`  - Failed statements: ${errorCount}`);
    
    // Verify new state
    console.log('\n📊 New production database state:');
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  - ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  - ${table}: error reading`);
      }
    }
    
    console.log('\n🎉 Your local database has been copied to production!');
    console.log('Go check your production site - all your tournaments, teams, and drafts should be there now!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure DATABASE_URL is set in your .env file');
    console.log('2. Make sure you ran dump-local-database.bat first');
    console.log('3. Check that your production database is accessible');
  } finally {
    await pool.end();
  }
}

// Alternative: Direct psql restore approach
async function restoreUsingPsql() {
  console.log('\n📝 Alternative Method: Direct psql restore\n');
  
  const dumpFile = path.join(__dirname, 'local_database_dump.sql');
  
  if (!fs.existsSync(dumpFile)) {
    console.error('❌ Error: local_database_dump.sql not found!');
    console.log('Please run dump-local-database.bat first.');
    return;
  }
  
  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment!');
    return;
  }
  
  console.log('You can also restore manually using this command:\n');
  console.log(`psql "${dbUrl}" < local_database_dump.sql\n`);
  console.log('Or if you have issues with the schema:\n');
  console.log(`psql "${dbUrl}" < local_data_only.sql\n`);
}

// Run the restoration
if (require.main === module) {
  console.log('Choose restoration method:');
  console.log('1. Automatic restoration (recommended)');
  console.log('2. Show manual psql commands');
  console.log('\nPress 1 or 2, then Enter:\n');
  
  process.stdin.once('data', (data) => {
    const choice = data.toString().trim();
    
    if (choice === '2') {
      restoreUsingPsql();
    } else {
      restoreToProduction()
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Failed:', err);
          process.exit(1);
        });
    }
  });
}