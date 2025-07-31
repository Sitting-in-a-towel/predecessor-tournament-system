require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db';

async function checkUserSession() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Find your user sessions
    const userSessions = await pool.query(`
      SELECT 
        sid, 
        sess->>'passport' as user_info,
        expire,
        CASE 
          WHEN expire > NOW() THEN 'Active'
          ELSE 'Expired'
        END as status
      FROM user_sessions 
      WHERE sess->>'passport' LIKE '%user_1753864717946_icy2gsv07%'
      ORDER BY expire DESC
    `);
    
    console.log('=== Your Sessions Status ===');
    console.log(`Found ${userSessions.rows.length} sessions for your user`);
    
    userSessions.rows.forEach((session, index) => {
      console.log(`\nSession ${index + 1}:`);
      console.log(`- ID: ${session.sid.substring(0, 20)}...`);
      console.log(`- Status: ${session.status}`);
      console.log(`- Expires: ${session.expire}`);
      console.log(`- User: ${session.user_info}`);
    });
    
    // Check total active sessions
    const activeSessions = await pool.query(`
      SELECT COUNT(*) as active_count 
      FROM user_sessions 
      WHERE expire > NOW()
    `);
    
    console.log(`\n=== Overall Stats ===`);
    console.log(`Total active sessions: ${activeSessions.rows[0].active_count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserSession();