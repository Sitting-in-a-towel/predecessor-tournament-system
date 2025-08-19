const pg = require('./services/postgresql');

async function checkFullSchema() {
  console.log('\n=== CHECKING FULL DRAFT_SESSIONS SCHEMA ===\n');
  
  try {
    const result = await pg.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'draft_sessions'
      ORDER BY ordinal_position
    `);
    
    console.log('Full draft_sessions schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkFullSchema();