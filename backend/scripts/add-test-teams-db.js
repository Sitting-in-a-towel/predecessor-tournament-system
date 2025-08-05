require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Use production database URL
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
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

async function addTestTeamsToDatabase() {
  console.log('🚀 Starting to add test teams to database...\n');
  console.log('Database:', DATABASE_URL.includes('localhost') ? 'LOCAL' : 'PRODUCTION');
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    // First, create test users if they don't exist
    for (let i = 0; i < testTeams.length; i++) {
      const team = testTeams[i];
      const userId = `test_user_${i + 1}`;
      const discordId = `test_discord_${i + 1}_${Date.now()}`;
      
      try {
        // Check if user exists
        const userCheck = await pool.query(
          'SELECT id FROM users WHERE discord_username = $1',
          [team.captain]
        );
        
        if (userCheck.rows.length === 0) {
          // Create user
          await pool.query(
            `INSERT INTO users (id, discord_id, discord_username, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             ON CONFLICT (discord_id) DO NOTHING`,
            [userId, discordId, team.captain]
          );
          console.log(`✅ Created user: ${team.captain}`);
        }
      } catch (error) {
        console.log(`⚠️ User creation skipped for ${team.captain}:`, error.message);
      }
    }
    
    // Now create teams
    for (let i = 0; i < testTeams.length; i++) {
      const team = testTeams[i];
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userId = `test_user_${i + 1}`;
      
      try {
        // Check if team name already exists
        const teamCheck = await pool.query(
          'SELECT team_id FROM teams WHERE team_name = $1',
          [team.name]
        );
        
        if (teamCheck.rows.length > 0) {
          console.log(`⚠️ Team already exists: ${team.name}`);
          continue;
        }
        
        // Create team
        const result = await pool.query(
          `INSERT INTO teams (team_id, team_name, captain_user_id, created_at, updated_at, is_active)
           VALUES ($1, $2, $3, NOW(), NOW(), true)
           RETURNING team_id`,
          [teamId, team.name, userId]
        );
        
        if (result.rows.length > 0) {
          console.log(`✅ Successfully added: ${team.name} (ID: ${result.rows[0].team_id})`);
          
          // Add captain as team member
          await pool.query(
            `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
             VALUES ($1, $2, $3, 'captain', NOW())`,
            [uuidv4(), teamId, userId]
          );
          
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Error adding ${team.name}:`, error.message);
        failCount++;
      }
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await pool.end();
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully added: ${successCount} teams`);
  console.log(`❌ Failed to add: ${failCount} teams`);
  console.log('\n🏁 Done!');
}

// Run the script
addTestTeamsToDatabase().catch(console.error);