require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db';

async function cleanupOldSessions() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Keep only the most recent session for this user
    const result = await pool.query(`
      DELETE FROM user_sessions 
      WHERE sess->>'passport' LIKE '%user_1753864717946_icy2gsv07%'
      AND sid != (
        SELECT sid FROM user_sessions 
        WHERE sess->>'passport' LIKE '%user_1753864717946_icy2gsv07%'
        ORDER BY expire DESC 
        LIMIT 1
      )
    `);
    
    console.log(`✅ Cleaned up ${result.rowCount} old sessions`);
    console.log('Kept only the most recent session (30-day Remember Me)');
    
    // Verify cleanup
    const remainingSessions = await pool.query(`
      SELECT sid, expire 
      FROM user_sessions 
      WHERE sess->>'passport' LIKE '%user_1753864717946_icy2gsv07%'
    `);
    
    console.log(`\nRemaining sessions: ${remainingSessions.rows.length}`);
    remainingSessions.rows.forEach(session => {
      console.log(`- ${session.sid.substring(0, 20)}... expires ${session.expire}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupOldSessions();