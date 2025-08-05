require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Production database configuration (using local database for production testing)
const productionPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'predecessor_tournaments', // Your actual database name
  user: 'postgres',
  password: 'Antigravity7@!89'
});

// Test teams data
const testTeams = [
  { name: 'Alpha Wolves', captain: 'AlphaLeader' },
  { name: 'Beta Brigade', captain: 'BetaCommander' },
  { name: 'Gamma Guardians', captain: 'GammaGuard' },
  { name: 'Delta Dragons', captain: 'DeltaDrake' },
  { name: 'Echo Eagles', captain: 'EchoEagle' },
  { name: 'Foxtrot Phoenixes', captain: 'FoxtrotFlame' },
  { name: 'Golf Gladiators', captain: 'GolfGladiator' },
  { name: 'Hotel Hurricanes', captain: 'HotelHurricane' },
  { name: 'India Invaders', captain: 'IndiaInvader' },
  { name: 'Juliet Juggernauts', captain: 'JulietJuggernaut' }
];

async function addTestTeamsToProduction() {
  console.log('🚀 Starting to add test teams to Predecessor Production database...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    // Test connection
    await productionPool.query('SELECT NOW()');
    console.log('✅ Connected to Predecessor Production database\n');
    
    // First, create test users
    for (let i = 0; i < testTeams.length; i++) {
      const team = testTeams[i];
      const userId = uuidv4();
      const discordId = `test_discord_prod_${i + 1}_${Date.now()}`;
      
      try {
        // Check if user exists
        const userCheck = await productionPool.query(
          'SELECT id FROM users WHERE discord_username = $1',
          [team.captain]
        );
        
        if (userCheck.rows.length === 0) {
          // Create user with both id and user_id (schema requires both)
          await productionPool.query(
            `INSERT INTO users (id, user_id, discord_id, discord_username, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [userId, userId, discordId, team.captain]
          );
          console.log(`✅ Created user: ${team.captain}`);
        } else {
          console.log(`ℹ️ User already exists: ${team.captain}`);
        }
      } catch (error) {
        console.log(`⚠️ User creation issue for ${team.captain}:`, error.message);
      }
    }
    
    console.log(''); // Line break
    
    // Now create teams
    for (let i = 0; i < testTeams.length; i++) {
      const team = testTeams[i];
      const teamId = `team_prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Check if team name already exists
        const teamCheck = await productionPool.query(
          'SELECT team_id FROM teams WHERE team_name = $1',
          [team.name]
        );
        
        if (teamCheck.rows.length > 0) {
          console.log(`⚠️ Team already exists: ${team.name}`);
          successCount++; // Count as success since team exists
          continue;
        }
        
        // Get user for captain
        const userResult = await productionPool.query(
          'SELECT id FROM users WHERE discord_username = $1',
          [team.captain]
        );
        
        if (userResult.rows.length === 0) {
          console.log(`❌ Captain user not found: ${team.captain}`);
          failCount++;
          continue;
        }
        
        const captainUserId = userResult.rows[0].id;
        
        // Create team
        const result = await productionPool.query(
          `INSERT INTO teams (id, team_id, team_name, captain_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING team_id`,
          [uuidv4(), teamId, team.name, captainUserId]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ Successfully added team: ${team.name} (ID: ${result.rows[0].team_id})`);
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Error adding ${team.name}:`, error.message);
        failCount++;
      }
    }
    
    console.log('\n🎯 Now registering teams for existing tournaments...');
    
    // Get all active tournaments
    const tournamentsResult = await productionPool.query(
      'SELECT id, name FROM tournaments WHERE end_date > NOW() ORDER BY start_date'
    );
    
    if (tournamentsResult.rows.length === 0) {
      console.log('ℹ️ No active tournaments found to register teams for');
    } else {
      console.log(`📋 Found ${tournamentsResult.rows.length} active tournament(s)`);
      
      // Register all test teams for each tournament
      for (const tournament of tournamentsResult.rows) {
        console.log(`\n📝 Registering teams for: ${tournament.name}`);
        
        // Get all created test teams
        const createdTeamsResult = await productionPool.query(
          `SELECT team_id, team_name FROM teams 
           WHERE team_name IN (${testTeams.map((_, i) => `$${i + 1}`).join(', ')})`,
          testTeams.map(t => t.name)
        );
        
        for (const team of createdTeamsResult.rows) {
          try {
            // Check if already registered
            const registrationCheck = await productionPool.query(
              'SELECT id FROM tournament_registrations WHERE tournament_id = $1 AND team_id = $2',
              [tournament.id, team.team_id]
            );
            
            if (registrationCheck.rows.length === 0) {
              // Register team for tournament (simplified)
              await productionPool.query(
                `INSERT INTO tournament_registrations (id, tournament_id, team_id, status, registered_date)
                 VALUES ($1, $2, $3, 'registered', NOW())`,
                [uuidv4(), tournament.id, team.team_id]
              );
              console.log(`   ✅ Registered: ${team.team_name}`);
            } else {
              console.log(`   ℹ️ Already registered: ${team.team_name}`);
            }
          } catch (error) {
            console.log(`   ❌ Failed to register ${team.team_name}:`, error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await productionPool.end();
  }
  
  console.log('\n📊 Final Summary:');
  console.log(`✅ Successfully processed: ${successCount} teams`);
  console.log(`❌ Failed to process: ${failCount} teams`);
  console.log('\n🏁 Done! Test teams are ready for production testing.');
}

// Run the script
addTestTeamsToProduction().catch(console.error);