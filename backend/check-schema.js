const pg = require('./services/postgresql');

async function checkSchema() {
  console.log('\n=== CHECKING DATABASE SCHEMA ===\n');
  
  try {
    // Check draft_sessions table schema
    console.log('1. Checking draft_sessions table schema...');
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'draft_sessions' 
      AND column_name IN ('team1_captain_id', 'team2_captain_id')
      ORDER BY column_name;
    `;
    
    const result = await pg.query(schemaQuery);
    console.log('Captain ID columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check what type we need
    console.log('\n2. Checking what user_id values look like...');
    const userSample = await pg.query('SELECT user_id FROM users LIMIT 3');
    console.log('Sample user_id values:');
    userSample.rows.forEach(row => {
      console.log(`  ${row.user_id} (length: ${row.user_id.length})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkSchema();