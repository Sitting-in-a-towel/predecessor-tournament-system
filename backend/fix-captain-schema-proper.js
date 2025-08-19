const pg = require('./services/postgresql');

async function fixCaptainSchemaProper() {
  console.log('\n=== FIXING CAPTAIN ID SCHEMA WITH CONSTRAINTS ===\n');
  
  try {
    console.log('1. Checking foreign key constraints...');
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'draft_sessions'
        AND kcu.column_name IN ('team1_captain_id', 'team2_captain_id');
    `;
    
    const constraints = await pg.query(constraintsQuery);
    console.log('Found foreign key constraints:');
    constraints.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
    console.log('\n2. Dropping foreign key constraints...');
    for (const constraint of constraints.rows) {
      await pg.query(`ALTER TABLE draft_sessions DROP CONSTRAINT ${constraint.constraint_name}`);
      console.log(`   ✓ Dropped constraint: ${constraint.constraint_name}`);
    }
    
    console.log('\n3. Converting UUID columns to VARCHAR...');
    
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
    
    console.log('\n4. Creating new foreign key constraints to users.user_id...');
    
    // Add foreign key constraint to users.user_id (string field)
    try {
      await pg.query(`
        ALTER TABLE draft_sessions 
        ADD CONSTRAINT draft_sessions_team1_captain_id_fkey 
        FOREIGN KEY (team1_captain_id) REFERENCES users(user_id)
      `);
      console.log('   ✓ Added team1_captain_id foreign key to users.user_id');
    } catch (fkError) {
      console.log(`   ⚠ Could not add team1_captain_id foreign key: ${fkError.message}`);
    }
    
    try {
      await pg.query(`
        ALTER TABLE draft_sessions 
        ADD CONSTRAINT draft_sessions_team2_captain_id_fkey 
        FOREIGN KEY (team2_captain_id) REFERENCES users(user_id)
      `);
      console.log('   ✓ Added team2_captain_id foreign key to users.user_id');
    } catch (fkError) {
      console.log(`   ⚠ Could not add team2_captain_id foreign key: ${fkError.message}`);
    }
    
    console.log('\n5. Verifying new schema...');
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

fixCaptainSchemaProper();