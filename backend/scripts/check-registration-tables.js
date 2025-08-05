const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'predecessor_tournaments',
  user: 'postgres',
  password: 'Antigravity7@!89'
});

async function checkTables() {
  try {
    // Check for tournament-related tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%tournament%' OR table_name LIKE '%registration%' OR table_name LIKE '%team%')
      ORDER BY table_name
    `);
    
    console.log('🔍 Tables related to tournaments/registrations/teams:');
    result.rows.forEach(row => console.log('   - ' + row.table_name));
    
    // Check if tournament_registrations exists
    const regCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tournament_registrations'
    `);
    
    console.log('\n📋 Tournament registrations table exists:', regCheck.rows.length > 0 ? 'YES' : 'NO');
    
    // Look for any table that might store team registrations
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📝 ALL tables in database:');
    allTables.rows.forEach(row => console.log('   - ' + row.table_name));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();