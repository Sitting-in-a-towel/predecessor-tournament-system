const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runProductionMigration() {
  console.log('🔄 Starting production database migration...');
  
  // Create database connection using production environment
  const config = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  } : {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DATABASE || 'predecessor_tournaments',
    user: process.env.POSTGRES_USER || 'postgres',
    password: String(process.env.POSTGRES_PASSWORD || ''),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
  
  const pool = new Pool(config);
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    
    // Check if migration is needed
    console.log('🔍 Checking if draft tables exist...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'draft_sessions'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Draft tables already exist, skipping migration');
      return;
    }
    
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations', 'create_draft_system_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running draft system migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('draft_sessions', 'draft_participants', 'draft_actions', 'draft_timer_events')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log('🎉 Production database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runProductionMigration()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = runProductionMigration;