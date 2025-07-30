const Airtable = require('airtable');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Configure Airtable
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_PERSONAL_TOKEN || process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID);

// Configure PostgreSQL
const pgPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'predecessor_tournaments',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'your_postgres_password'
});

// Migration tracking
const migrationLog = {
  started: new Date(),
  completed: null,
  tables: {},
  errors: []
};

// Utility function to save migration log
async function saveMigrationLog() {
  await fs.writeFile(
    path.join(__dirname, `migration_log_${Date.now()}.json`),
    JSON.stringify(migrationLog, null, 2)
  );
}

// Generate legacy ID for compatibility
function generateLegacyId(prefix, timestamp = Date.now()) {
  return `${prefix}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================
// MIGRATION FUNCTIONS
// =============================================

async function migrateUsers() {
  console.log('📋 Migrating Users...');
  const users = [];
  const userIdMap = new Map(); // Map Airtable recordId to PostgreSQL UUID
  
  try {
    // Fetch all users from Airtable
    await base('Users').select({
      view: 'Grid view'
    }).eachPage(function page(records, fetchNextPage) {
      records.forEach(record => {
        users.push({
          airtableId: record.id,
          ...record.fields
        });
      });
      fetchNextPage();
    });

    console.log(`Found ${users.length} users to migrate`);

    // Insert users into PostgreSQL
    for (const user of users) {
      try {
        const query = `
          INSERT INTO users (
            user_id, discord_id, discord_username, email, 
            is_admin, created_at, last_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;
        
        const values = [
          user.UserID || generateLegacyId('user'),
          user.DiscordID,
          user.DiscordUsername,
          user.Email || null,
          user.IsAdmin || false,
          user.CreatedAt || new Date(),
          user.LastActive || new Date()
        ];

        const result = await pgPool.query(query, values);
        userIdMap.set(user.airtableId, result.rows[0].id);
        
      } catch (error) {
        console.error(`Error migrating user ${user.DiscordUsername}:`, error.message);
        migrationLog.errors.push({ table: 'users', record: user, error: error.message });
      }
    }

    migrationLog.tables.users = { 
      total: users.length, 
      migrated: userIdMap.size,
      mapping: Object.fromEntries(userIdMap)
    };
    
    console.log(`✅ Migrated ${userIdMap.size}/${users.length} users`);
    return userIdMap;
    
  } catch (error) {
    console.error('❌ Error in user migration:', error);
    throw error;
  }
}

async function migrateTournaments(userIdMap) {
  console.log('🏆 Migrating Tournaments...');
  const tournaments = [];
  const tournamentIdMap = new Map();
  
  try {
    await base('Tournaments').select({
      view: 'Grid view'
    }).eachPage(function page(records, fetchNextPage) {
      records.forEach(record => {
        tournaments.push({
          airtableId: record.id,
          ...record.fields
        });
      });
      fetchNextPage();
    });

    console.log(`Found ${tournaments.length} tournaments to migrate`);

    for (const tournament of tournaments) {
      try {
        // Find creator's PostgreSQL ID
        const creatorPgId = tournament.CreatedBy && tournament.CreatedBy[0] 
          ? userIdMap.get(tournament.CreatedBy[0]) 
          : null;

        const query = `
          INSERT INTO tournaments (
            tournament_id, name, description, bracket_type, game_format,
            quarter_final_format, semi_final_format, grand_final_format,
            max_teams, registration_open, status, start_date, end_date,
            created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `;
        
        const values = [
          tournament.TournamentID || generateLegacyId('tour'),
          tournament.Name,
          tournament.Description || '',
          tournament.BracketType || 'Single Elimination',
          tournament.GameFormat || 'Best of 1',
          tournament.QuarterFinalFormat || tournament.GameFormat || 'Best of 1',
          tournament.SemiFinalFormat || tournament.GameFormat || 'Best of 1',
          tournament.GrandFinalFormat || tournament.GameFormat || 'Best of 1',
          tournament.MaxTeams || 16,
          tournament.RegistrationOpen !== false,
          tournament.Status || 'Upcoming',
          tournament.StartDate || new Date(),
          tournament.EndDate || null,
          creatorPgId,
          tournament.CreatedAt || new Date()
        ];

        const result = await pgPool.query(query, values);
        tournamentIdMap.set(tournament.airtableId, result.rows[0].id);
        
      } catch (error) {
        console.error(`Error migrating tournament ${tournament.Name}:`, error.message);
        migrationLog.errors.push({ table: 'tournaments', record: tournament, error: error.message });
      }
    }

    migrationLog.tables.tournaments = { 
      total: tournaments.length, 
      migrated: tournamentIdMap.size,
      mapping: Object.fromEntries(tournamentIdMap)
    };
    
    console.log(`✅ Migrated ${tournamentIdMap.size}/${tournaments.length} tournaments`);
    return tournamentIdMap;
    
  } catch (error) {
    console.error('❌ Error in tournament migration:', error);
    throw error;
  }
}

async function migrateTeams(userIdMap, tournamentIdMap) {
  console.log('👥 Migrating Teams...');
  const teams = [];
  const teamIdMap = new Map();
  
  try {
    await base('Teams').select({
      view: 'Grid view'
    }).eachPage(function page(records, fetchNextPage) {
      records.forEach(record => {
        teams.push({
          airtableId: record.id,
          ...record.fields
        });
      });
      fetchNextPage();
    });

    console.log(`Found ${teams.length} teams to migrate`);

    for (const team of teams) {
      try {
        // Find captain's PostgreSQL ID
        const captainPgId = team.Captain && team.Captain[0] 
          ? userIdMap.get(team.Captain[0]) 
          : null;
          
        // Find tournament's PostgreSQL ID
        const tournamentPgId = team.Tournament && team.Tournament[0]
          ? tournamentIdMap.get(team.Tournament[0])
          : null;

        if (!tournamentPgId) {
          console.warn(`Skipping team ${team.TeamName} - no tournament found`);
          continue;
        }

        const query = `
          INSERT INTO teams (
            team_id, team_name, team_logo, tournament_id, captain_id,
            confirmed, confirmed_at, checked_in, check_in_time, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `;
        
        const values = [
          team.TeamID || generateLegacyId('team'),
          team.TeamName,
          team.TeamLogo || null,
          tournamentPgId,
          captainPgId,
          team.Confirmed || false,
          team.ConfirmedAt || null,
          team.CheckedIn || false,
          team.CheckInTime || null,
          team.CreatedAt || new Date()
        ];

        const result = await pgPool.query(query, values);
        const teamPgId = result.rows[0].id;
        teamIdMap.set(team.airtableId, teamPgId);
        
        // Migrate team players
        if (team.Players && team.Players.length > 0) {
          for (const playerAirtableId of team.Players) {
            const playerPgId = userIdMap.get(playerAirtableId);
            if (playerPgId) {
              const isCaptain = playerAirtableId === (team.Captain && team.Captain[0]);
              await pgPool.query(
                `INSERT INTO team_players (team_id, player_id, role, accepted)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (team_id, player_id) DO NOTHING`,
                [teamPgId, playerPgId, isCaptain ? 'captain' : 'player', true]
              );
            }
          }
        }
        
        // Migrate substitutes
        if (team.Substitutes && team.Substitutes.length > 0) {
          for (const subAirtableId of team.Substitutes) {
            const subPgId = userIdMap.get(subAirtableId);
            if (subPgId) {
              await pgPool.query(
                `INSERT INTO team_players (team_id, player_id, role, accepted)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (team_id, player_id) DO NOTHING`,
                [teamPgId, subPgId, 'substitute', true]
              );
            }
          }
        }
        
      } catch (error) {
        console.error(`Error migrating team ${team.TeamName}:`, error.message);
        migrationLog.errors.push({ table: 'teams', record: team, error: error.message });
      }
    }

    migrationLog.tables.teams = { 
      total: teams.length, 
      migrated: teamIdMap.size,
      mapping: Object.fromEntries(teamIdMap)
    };
    
    console.log(`✅ Migrated ${teamIdMap.size}/${teams.length} teams`);
    return teamIdMap;
    
  } catch (error) {
    console.error('❌ Error in team migration:', error);
    throw error;
  }
}

async function migrateMatches(teamIdMap, tournamentIdMap, userIdMap) {
  console.log('⚔️ Migrating Matches...');
  const matches = [];
  const matchIdMap = new Map();
  
  try {
    await base('Matches').select({
      view: 'Grid view'
    }).eachPage(function page(records, fetchNextPage) {
      records.forEach(record => {
        matches.push({
          airtableId: record.id,
          ...record.fields
        });
      });
      fetchNextPage();
    });

    console.log(`Found ${matches.length} matches to migrate`);

    for (const match of matches) {
      try {
        // Map all the IDs
        const tournamentPgId = match.Tournament && match.Tournament[0]
          ? tournamentIdMap.get(match.Tournament[0])
          : null;
          
        const team1PgId = match.Team1 && match.Team1[0]
          ? teamIdMap.get(match.Team1[0])
          : null;
          
        const team2PgId = match.Team2 && match.Team2[0]
          ? teamIdMap.get(match.Team2[0])
          : null;
          
        const creatorPgId = match.CreatedBy
          ? userIdMap.get(match.CreatedBy)
          : null;

        if (!tournamentPgId || !team1PgId || !team2PgId) {
          console.warn(`Skipping match ${match.MatchID} - missing required references`);
          continue;
        }

        const query = `
          INSERT INTO matches (
            match_id, tournament_id, team1_id, team2_id, round, match_type,
            status, scheduled_time, started_at, completed_at, winner_id,
            team1_score, team2_score, notes, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `;
        
        const winnerPgId = match.Winner === 'team1' ? team1PgId : 
                          match.Winner === 'team2' ? team2PgId : null;
        
        const values = [
          match.MatchID || generateLegacyId('match'),
          tournamentPgId,
          team1PgId,
          team2PgId,
          match.Round || 'Round 1',
          match.MatchType || 'Group Stage',
          match.Status || 'Scheduled',
          match.ScheduledTime || null,
          match.StartedAt || null,
          match.CompletedAt || null,
          winnerPgId,
          match.Team1Score || 0,
          match.Team2Score || 0,
          match.Notes || null,
          creatorPgId,
          match.CreatedAt || new Date()
        ];

        const result = await pgPool.query(query, values);
        matchIdMap.set(match.airtableId, result.rows[0].id);
        
      } catch (error) {
        console.error(`Error migrating match ${match.MatchID}:`, error.message);
        migrationLog.errors.push({ table: 'matches', record: match, error: error.message });
      }
    }

    migrationLog.tables.matches = { 
      total: matches.length, 
      migrated: matchIdMap.size,
      mapping: Object.fromEntries(matchIdMap)
    };
    
    console.log(`✅ Migrated ${matchIdMap.size}/${matches.length} matches`);
    return matchIdMap;
    
  } catch (error) {
    console.error('❌ Error in match migration:', error);
    throw error;
  }
}

// =============================================
// MAIN MIGRATION FUNCTION
// =============================================

async function runMigration() {
  console.log('🚀 Starting Airtable to PostgreSQL Migration...');
  console.log('================================================');
  
  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection successful');
    
    // Test Airtable connection
    const testRecords = await base('Users').select({ maxRecords: 1 }).firstPage();
    console.log('✅ Airtable connection successful');
    
    // Run migrations in order (dependencies matter!)
    const userIdMap = await migrateUsers();
    await saveMigrationLog();
    
    const tournamentIdMap = await migrateTournaments(userIdMap);
    await saveMigrationLog();
    
    const teamIdMap = await migrateTeams(userIdMap, tournamentIdMap);
    await saveMigrationLog();
    
    const matchIdMap = await migrateMatches(teamIdMap, tournamentIdMap, userIdMap);
    await saveMigrationLog();
    
    // TODO: Add draft sessions migration if needed
    
    migrationLog.completed = new Date();
    await saveMigrationLog();
    
    console.log('\n================================================');
    console.log('✅ Migration completed successfully!');
    console.log(`Total errors: ${migrationLog.errors.length}`);
    console.log(`Check migration_log_*.json for details`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    migrationLog.errors.push({ fatal: true, error: error.message });
    await saveMigrationLog();
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// =============================================
// VERIFICATION FUNCTION
// =============================================

async function verifyMigration() {
  console.log('\n📊 Verifying migration...');
  
  try {
    const tables = ['users', 'tournaments', 'teams', 'matches'];
    
    for (const table of tables) {
      const result = await pgPool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} records`);
    }
    
  } catch (error) {
    console.error('Error verifying migration:', error);
  }
}

// =============================================
// RUN THE MIGRATION
// =============================================

if (require.main === module) {
  // Add command line argument parsing
  const args = process.argv.slice(2);
  
  if (args.includes('--verify')) {
    verifyMigration().then(() => process.exit(0));
  } else if (args.includes('--help')) {
    console.log(`
Airtable to PostgreSQL Migration Tool

Usage:
  node migrate-airtable-to-postgres.js         Run the migration
  node migrate-airtable-to-postgres.js --verify    Verify migration results
  node migrate-airtable-to-postgres.js --help      Show this help

Environment Variables Required:
  AIRTABLE_API_KEY    Your Airtable API key
  AIRTABLE_BASE_ID    Your Airtable base ID
  POSTGRES_PASSWORD   PostgreSQL password (optional, defaults to prompt)
    `);
  } else {
    runMigration()
      .then(() => verifyMigration())
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}