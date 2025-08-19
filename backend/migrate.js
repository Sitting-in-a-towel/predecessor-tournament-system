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
    
    // Check what tables are missing - COMPREHENSIVE CHECK
    console.log('🔍 Checking for missing tables...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'draft_sessions', 
        'tournament_brackets', 
        'bracket_matches',
        'tournament_registrations',
        'omeda_game_data',
        'team_invitations'
      )
      ORDER BY table_name
    `);
    
    const existingTables = tableCheck.rows.map(row => row.table_name);
    const needsDraftTables = !existingTables.includes('draft_sessions');
    const needsBracketTable = !existingTables.includes('tournament_brackets');
    const needsBracketMatchesTable = !existingTables.includes('bracket_matches');
    const needsTournamentRegistrationsTable = !existingTables.includes('tournament_registrations');
    const needsOmedaGameDataTable = !existingTables.includes('omeda_game_data');
    const needsTeamInvitationsTable = !existingTables.includes('team_invitations');
    
    console.log('📊 COMPREHENSIVE Table Status:');
    console.log(`  - draft_sessions: ${existingTables.includes('draft_sessions') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - tournament_brackets: ${existingTables.includes('tournament_brackets') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - bracket_matches: ${existingTables.includes('bracket_matches') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - tournament_registrations: ${existingTables.includes('tournament_registrations') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - omeda_game_data: ${existingTables.includes('omeda_game_data') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - team_invitations: ${existingTables.includes('team_invitations') ? '✅ EXISTS' : '❌ MISSING'}`);
    
    const allTablesExist = !needsDraftTables && !needsBracketTable && !needsBracketMatchesTable && 
                          !needsTournamentRegistrationsTable && !needsOmedaGameDataTable && !needsTeamInvitationsTable;
    
    if (allTablesExist) {
      console.log('✅ ALL required tables exist, skipping migration');
      return;
    } else {
      console.log('🚨 MISSING TABLES DETECTED - Running comprehensive migration...');
    }
    
    // Run draft system migration if needed
    if (needsDraftTables) {
      console.log('📖 Reading draft system migration file...');
      const draftMigrationPath = path.join(__dirname, 'migrations', 'create_draft_system_tables.sql');
      const draftMigrationSQL = fs.readFileSync(draftMigrationPath, 'utf8');
      
      console.log('🔄 Running draft system migration...');
      await pool.query(draftMigrationSQL);
      console.log('✅ Draft system tables created');
    }
    
    // Run tournament brackets migration if needed
    if (needsBracketTable) {
      console.log('📖 Reading tournament brackets migration file...');
      const bracketMigrationPath = path.join(__dirname, 'migrations', 'create_tournament_brackets_table.sql');
      const bracketMigrationSQL = fs.readFileSync(bracketMigrationPath, 'utf8');
      
      console.log('🔄 Running tournament brackets migration...');
      await pool.query(bracketMigrationSQL);
      console.log('✅ Tournament brackets table created');
    }
    
    // Run bracket matches migration if needed
    if (needsBracketMatchesTable) {
      console.log('📖 Reading bracket matches migration file...');
      const bracketMatchesMigrationPath = path.join(__dirname, 'migrations', 'create_bracket_matches_table.sql');
      const bracketMatchesMigrationSQL = fs.readFileSync(bracketMatchesMigrationPath, 'utf8');
      
      console.log('🔄 Running bracket matches migration...');
      await pool.query(bracketMatchesMigrationSQL);
      console.log('✅ Bracket matches table created');
    }
    
    // Run tournament registrations migration if needed
    if (needsTournamentRegistrationsTable) {
      console.log('📖 Reading tournament registrations migration file...');
      const tournamentRegMigrationPath = path.join(__dirname, 'migrations', 'create_tournament_registrations_table.sql');
      const tournamentRegMigrationSQL = fs.readFileSync(tournamentRegMigrationPath, 'utf8');
      
      console.log('🔄 Running tournament registrations migration...');
      await pool.query(tournamentRegMigrationSQL);
      console.log('✅ Tournament registrations table created');
    }
    
    // Run omeda game data migration if needed
    if (needsOmedaGameDataTable) {
      console.log('📖 Reading omeda game data migration file...');
      const omedaDataMigrationPath = path.join(__dirname, 'migrations', 'create_omeda_game_data_table.sql');
      const omedaDataMigrationSQL = fs.readFileSync(omedaDataMigrationPath, 'utf8');
      
      console.log('🔄 Running omeda game data migration...');
      await pool.query(omedaDataMigrationSQL);
      console.log('✅ Omeda game data table created');
    }
    
    // Run team invitations migration if needed
    if (needsTeamInvitationsTable) {
      console.log('📖 Reading team invitations migration file...');
      const teamInvitesMigrationPath = path.join(__dirname, 'migrations', 'create_team_invitations_table.sql');
      const teamInvitesMigrationSQL = fs.readFileSync(teamInvitesMigrationPath, 'utf8');
      
      console.log('🔄 Running team invitations migration...');
      await pool.query(teamInvitesMigrationSQL);
      console.log('✅ Team invitations table created');
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify ALL tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'draft_sessions', 'draft_participants', 'draft_actions', 'draft_timer_events', 
        'tournament_brackets', 'bracket_matches', 'tournament_registrations', 
        'omeda_game_data', 'team_invitations'
      )
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