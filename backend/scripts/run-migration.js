require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Use production database
  const DATABASE_URL = 'postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db';
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Running team invitations migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/create_team_invitations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify table was created
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'team_invitations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    tableCheck.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Also run for local database
async function runLocalMigration() {
  const localPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'predecessor_tournaments',
    user: 'postgres',
    password: 'Antigravity7@!89'
  });

  try {
    console.log('\n🚀 Running local migration...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/create_team_invitations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await localPool.query(migrationSQL);
    console.log('✅ Local migration completed!');
    
  } catch (error) {
    console.error('❌ Local migration failed:', error.message);
  } finally {
    await localPool.end();
  }
}

async function runBothMigrations() {
  await runMigration(); // Production
  await runLocalMigration(); // Local
}

runBothMigrations();