const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'predecessor_tournaments',
  user: 'postgres',
  password: 'Antigravity7@!89'
});

async function getRegistrationSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tournament_registrations' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 tournament_registrations table schema:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });
    
    // Also show a sample record
    const sampleQuery = `SELECT * FROM tournament_registrations LIMIT 1`;
    const sampleResult = await pool.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📄 Sample record:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    } else {
      console.log('\n📄 No records in tournament_registrations table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getRegistrationSchema();