require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

// Use production DATABASE_URL
const DATABASE_URL = 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db';

async function makeUserAdmin() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Your Discord ID from the logs
    const discordId = '130300130849980416';
    
    // First, find your user
    const findUser = await pool.query(
      'SELECT * FROM users WHERE discord_id = $1',
      [discordId]
    );
    
    if (findUser.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const user = findUser.rows[0];
    console.log('Found user:', user.discord_username, '(ID:', user.user_id, ')');
    console.log('Current admin status:', user.is_admin);
    
    // Update to admin
    const result = await pool.query(
      'UPDATE users SET is_admin = true WHERE discord_id = $1 RETURNING *',
      [discordId]
    );
    
    console.log('✅ User updated to admin:', result.rows[0].discord_username);
    console.log('New admin status:', result.rows[0].is_admin);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

makeUserAdmin();