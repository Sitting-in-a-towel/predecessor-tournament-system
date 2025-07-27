require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing Supabase Connection...\n');

// Show current configuration
console.log('Environment:', process.env.NODE_ENV);
console.log('Session Store:', process.env.SESSION_STORE);

if (process.env.SESSION_STORE === 'postgres') {
  console.log('\nTesting PostgreSQL connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Connection failed:', err.message);
      console.log('\n💡 If you see authentication errors:');
      console.log('1. Check your password in Supabase');
      console.log('2. Make sure special characters are properly escaped');
    } else {
      console.log('✅ Connection successful!');
      console.log('Current time from database:', res.rows[0].now);
    }
    pool.end();
  });
} else {
  console.log('ℹ️  Session store is not set to postgres.');
  console.log('Switch to staging or production to test PostgreSQL.');
}