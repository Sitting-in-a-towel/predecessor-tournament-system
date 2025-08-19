const { Pool } = require('pg');

async function testConnections() {
  console.log('🔍 Testing different Supabase connection methods...\n');
  
  // Different connection options to try
  const configs = [
    {
      name: 'Pooler Connection (Port 6543)',
      host: 'aws-0-us-west-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.gvcxbwwnbkpqllqcvlxl',
      password: 'Antigravity7@!89',
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Direct Connection (Port 5432)',
      host: 'aws-0-us-west-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.gvcxbwwnbkpqllqcvlxl',
      password: 'Antigravity7@!89',
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'IPv6 Connection (if supported)',
      host: '2406:da1c:f42:ae04:813e:110d:39d6:ef46',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'Antigravity7@!89',
      ssl: { rejectUnauthorized: false }
    }
  ];
  
  for (const config of configs) {
    console.log(`\nTrying: ${config.name}`);
    console.log(`Host: ${config.host}:${config.port}`);
    
    const pool = new Pool({
      ...config,
      connectionTimeoutMillis: 10000,
      max: 1
    });
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ SUCCESS! Connected to Supabase');
      console.log('Server time:', result.rows[0].now);
      
      // Check for tables
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name 
        LIMIT 5
      `);
      
      console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));
      
      client.release();
      await pool.end();
      
      console.log('\n🎉 Use this configuration in your copy script!');
      console.log('Config:', JSON.stringify(config, null, 2));
      return true;
      
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
      await pool.end();
    }
  }
  
  console.log('\n💡 All connection attempts failed.');
  console.log('\nPlease check in Supabase dashboard:');
  console.log('1. Go to Settings → Database');
  console.log('2. Look for "Connection Pooling" section');
  console.log('3. Copy the "Connection string" from there');
  console.log('4. The host might be different (like aws-0-us-west-1.pooler.supabase.com)');
  
  return false;
}

testConnections();