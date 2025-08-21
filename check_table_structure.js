const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.oregon-postgres.render.com/predecessor_tournament_db',
  ssl: { rejectUnauthorized: false }
});

async function checkTableStructure() {
  const client = await pool.connect();
  
  try {
    console.log('Checking draft_sessions table structure...');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'draft_sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current draft_sessions columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure();