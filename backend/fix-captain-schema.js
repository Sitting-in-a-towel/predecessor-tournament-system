const pg = require('./services/postgresql');

async function fixCaptainSchema() {
  console.log('\n=== FIXING CAPTAIN ID SCHEMA ===\n');
  
  try {
    console.log('1. Checking current schema...');
    const currentSchema = await pg.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'draft_sessions' 
      AND column_name IN ('team1_captain_id', 'team2_captain_id')
    `);
    
    console.log('Current column types:');
    currentSchema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n2. Converting UUID columns to VARCHAR...');
    
    // Convert team1_captain_id to varchar
    await pg.query(`
      ALTER TABLE draft_sessions 
      ALTER COLUMN team1_captain_id TYPE VARCHAR(255) 
      USING team1_captain_id::VARCHAR
    `);
    console.log('   ✓ team1_captain_id converted to VARCHAR');
    
    // Convert team2_captain_id to varchar  
    await pg.query(`
      ALTER TABLE draft_sessions 
      ALTER COLUMN team2_captain_id TYPE VARCHAR(255) 
      USING team2_captain_id::VARCHAR
    `);
    console.log('   ✓ team2_captain_id converted to VARCHAR');
    
    console.log('\n3. Verifying new schema...');
    const newSchema = await pg.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'draft_sessions' 
      AND column_name IN ('team1_captain_id', 'team2_captain_id')
    `);
    
    console.log('New column types:');
    newSchema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✅ Schema migration completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Schema migration failed:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

fixCaptainSchema();