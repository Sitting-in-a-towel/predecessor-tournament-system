const { Pool } = require('pg');

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Try different connection methods
  const connectionStrings = [
    // Method 1: Full connection string
    'postgresql://postgres:Antigravity7@!89@db.gvcxbwwnbkpqllqcvlxl.supabase.co:5432/postgres',
    // Method 2: With SSL required
    'postgresql://postgres:Antigravity7@!89@db.gvcxbwwnbkpqllqcvlxl.supabase.co:5432/postgres?sslmode=require',
  ];
  
  for (const connStr of connectionStrings) {
    console.log(`Testing: ${connStr.substring(0, 50)}...`);
    
    const pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Connected successfully!');
      console.log('Server time:', result.rows[0].now);
      
      // Check tables
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
        LIMIT 10
      `);
      
      console.log('\nTables found:');
      tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
      
      client.release();
      await pool.end();
      return true;
      
    } catch (err) {
      console.log(`❌ Failed: ${err.message}\n`);
      await pool.end();
    }
  }
  
  console.log('\n💡 Troubleshooting:');
  console.log('1. Make sure your Supabase project is RESTORED (not paused)');
  console.log('2. Check the connection string in Supabase dashboard');
  console.log('3. The password might have been reset - check Supabase Settings → Database');
  console.log('4. Try resetting the database password in Supabase');
  
  return false;
}

testSupabaseConnection();