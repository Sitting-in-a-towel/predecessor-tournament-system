const { Pool } = require('pg');

async function checkLocalDatabase() {
  console.log('🔍 Checking local database contents...\n');
  
  // Connect to local database
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Check what databases exist
    console.log('1. Checking if predecessor_tournaments database exists...');
    const dbCheck = await pool.query("SELECT datname FROM pg_database WHERE datname = 'predecessor_tournaments'");
    console.log(`✅ Database exists: ${dbCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    if (dbCheck.rows.length === 0) {
      console.log('❌ predecessor_tournaments database does not exist!');
      console.log('   Your data might be in a different database.');
      
      // Check what databases do exist
      const allDbs = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false");
      console.log('   Available databases:');
      allDbs.rows.forEach(db => console.log(`     - ${db.datname}`));
      
      await pool.end();
      return;
    }
    
    // Check if tables exist
    console.log('\n2. Checking for tournament tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('❌ No tables found in predecessor_tournaments database!');
      console.log('   This database appears to be empty or uninitialized.');
    } else {
      console.log(`✅ Found ${tables.rows.length} tables:`);
      tables.rows.forEach(table => console.log(`     - ${table.table_name}`));
    }
    
    // Check for tournament data
    const tournaments = await pool.query('SELECT COUNT(*) as count FROM tournaments');
    const teams = await pool.query('SELECT COUNT(*) as count FROM teams');
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    
    console.log('\n3. Data counts:');
    console.log(`   Tournaments: ${tournaments.rows[0].count}`);
    console.log(`   Teams: ${teams.rows[0].count}`);
    console.log(`   Users: ${users.rows[0].count}`);
    
    if (parseInt(tournaments.rows[0].count) > 0) {
      console.log('\n4. Sample tournament data:');
      const sampleTournaments = await pool.query('SELECT tournament_id, name, created_at FROM tournaments ORDER BY created_at DESC LIMIT 3');
      sampleTournaments.rows.forEach(t => {
        console.log(`   - ${t.name} (${t.tournament_id}) created ${t.created_at}`);
      });
    }
    
    await pool.end();
    
  } catch (error) {
    console.log(`❌ Error checking database: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   PostgreSQL server is not running or not accessible');
    } else if (error.code === '3D000') {
      console.log('   Database "predecessor_tournaments" does not exist');
    }
    await pool.end();
  }
}

checkLocalDatabase();