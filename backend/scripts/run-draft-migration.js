const fs = require('fs');
const path = require('path');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

async function runDraftMigration() {
  try {
    console.log('🔄 Running draft system database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_draft_system_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Read migration file:', migrationPath);
    
    // Execute the migration
    await postgresService.query(migrationSQL);
    
    console.log('✅ Draft system tables created successfully!');
    
    // Verify tables were created
    const tables = await postgresService.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('draft_sessions', 'draft_participants', 'draft_actions', 'draft_timer_events', 'heroes')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Check heroes data
    const heroCount = await postgresService.query('SELECT COUNT(*) FROM heroes WHERE is_active = true');
    console.log(`🦸 Heroes available: ${heroCount.rows[0].count}`);
    
    console.log('🎉 Draft system database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runDraftMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = runDraftMigration;