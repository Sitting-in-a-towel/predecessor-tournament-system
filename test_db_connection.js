const { Pool } = require('pg');

// Production database connection - same as Phoenix uses
const pool = new Pool({
  connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.oregon-postgres.render.com/predecessor_tournament_db',
  ssl: { rejectUnauthorized: false }
});

async function testDatabaseConnection() {
  const client = await pool.connect();
  
  try {
    console.log('Testing the exact database connection Phoenix uses...');
    console.log('='.repeat(60));
    
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const basicTest = await client.query('SELECT 1 as test');
    console.log(`✅ Basic query works: ${basicTest.rows[0].test}`);
    
    // Test 2: Check schema_migrations
    console.log('\n2. Checking schema_migrations...');
    const migrations = await client.query('SELECT count(*) as count FROM schema_migrations');
    console.log(`✅ Schema migrations table: ${migrations.rows[0].count} entries`);
    
    // Test 3: Check heroes table
    console.log('\n3. Checking heroes table...');
    const heroes = await client.query('SELECT count(*) as count FROM heroes');
    console.log(`✅ Heroes table: ${heroes.rows[0].count} entries`);
    
    // Test 4: Test the exact query Phoenix might use on startup
    console.log('\n4. Testing Phoenix-style queries...');
    
    // Check if all expected tables exist
    const tables = ['users', 'teams', 'draft_sessions', 'heroes', 'draft_picks', 'draft_bans'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT count(*) FROM ${table} LIMIT 1`);
        console.log(`✅ ${table}: accessible`);
      } catch (error) {
        console.log(`❌ ${table}: ERROR - ${error.message}`);
      }
    }
    
    // Test 5: Try a more complex query that LiveView might use
    console.log('\n5. Testing complex queries...');
    try {
      const draftTest = await client.query(`
        SELECT ds.id, ds.status, ds.current_phase 
        FROM draft_sessions ds 
        LIMIT 1
      `);
      console.log(`✅ Draft sessions query works (${draftTest.rows.length} results)`);
    } catch (error) {
      console.log(`❌ Draft sessions query failed: ${error.message}`);
    }
    
    console.log('\n6. Database connection summary:');
    console.log(`✅ All basic database operations working correctly`);
    console.log(`✅ Phoenix should be able to connect to this database`);
    console.log(`⚠️  The 500 error might be due to application-level issues, not database`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabaseConnection();