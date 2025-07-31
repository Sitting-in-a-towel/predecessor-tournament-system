require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db';

async function checkSessions() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if session table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      );
    `);
    
    console.log('Session table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Count sessions
      const sessionCount = await pool.query('SELECT COUNT(*) FROM user_sessions');
      console.log('Total sessions:', sessionCount.rows[0].count);
      
      // Show recent sessions
      const recentSessions = await pool.query(`
        SELECT sid, sess->>'passport' as passport, expire 
        FROM user_sessions 
        ORDER BY expire DESC 
        LIMIT 5
      `);
      
      console.log('\nRecent sessions:');
      recentSessions.rows.forEach(session => {
        console.log(`- Session: ${session.sid.substring(0, 20)}...`);
        console.log(`  Expires: ${session.expire}`);
        console.log(`  User: ${session.passport || 'No user'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessions();