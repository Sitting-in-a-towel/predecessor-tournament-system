require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// This needs to be your actual Render production DATABASE_URL
// Get it from: Render Dashboard → Your Database → Connect → External Database URL
const PRODUCTION_DATABASE_URL = process.env.PRODUCTION_DATABASE_URL || 'postgresql://username:password@host:port/database';

if (PRODUCTION_DATABASE_URL === 'postgresql://username:password@host:port/database') {
  console.error('❌ ERROR: Please set PRODUCTION_DATABASE_URL environment variable');
  console.error('   Get it from Render Dashboard → Your Database → Connect → External Database URL');
  console.error('   It should look like: postgresql://user:pass@dpg-xxxxx.render.com/database_name');
  process.exit(1);
}

const pool = new Pool({
  connectionString: PRODUCTION_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addTestTeamsToRenderProduction() {
  try {
    // Test team data (same as original)
    const testTeams = [
      { name: 'Alpha Wolves', logo: null },
      { name: 'Beta Brigade', logo: null },
      { name: 'Gamma Guardians', logo: null },
      { name: 'Delta Dragons', logo: null },
      { name: 'Echo Eagles', logo: null },
      { name: 'Foxtrot Phoenixes', logo: null },
      { name: 'Golf Gladiators', logo: null },
      { name: 'Hotel Hurricanes', logo: null },
      { name: 'India Invaders', logo: null },
      { name: 'Juliet Juggernauts', logo: null }
    ];

    console.log('🚀 Starting test team creation for Render production...');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Render production database');

    // Get any user as captain
    const userQuery = `SELECT * FROM users WHERE discord_username IS NOT NULL LIMIT 1`;
    const userResult = await pool.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const captain = userResult.rows[0];
    console.log(`👤 Using ${captain.discord_username} as captain for test teams`);

    // Create teams
    const createdTeams = [];
    for (const teamData of testTeams) {
      const teamId = `team_prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Check if team already exists
        const existingTeam = await pool.query('SELECT team_id FROM teams WHERE team_name = $1', [teamData.name]);
        if (existingTeam.rows.length > 0) {
          console.log(`⚠️ Team already exists: ${teamData.name}`);
          continue;
        }

        const insertTeamQuery = `
          INSERT INTO teams (team_id, team_name, team_logo, captain_id, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING *
        `;
        
        const teamResult = await pool.query(insertTeamQuery, [
          teamId,
          teamData.name,
          teamData.logo,
          captain.id
        ]);
        
        const team = teamResult.rows[0];
        createdTeams.push(team);
        console.log(`✅ Created team: ${team.team_name} (${team.team_id})`);
      } catch (error) {
        console.log(`❌ Failed to create team ${teamData.name}:`, error.message);
      }
    }

    // Get all tournaments
    const tournamentsQuery = `SELECT * FROM tournaments ORDER BY created_at DESC`;
    const tournamentsResult = await pool.query(tournamentsQuery);
    
    console.log(`\n📋 Found ${tournamentsResult.rows.length} tournaments`);

    // Register teams for each tournament
    for (const tournament of tournamentsResult.rows) {
      console.log(`\n📝 Registering teams for tournament: ${tournament.name}`);
      
      // Register all created teams for this tournament
      for (const team of createdTeams) {
        try {
          // Check if already registered
          const existingQuery = `
            SELECT * FROM tournament_registrations 
            WHERE tournament_id = $1 AND team_id = $2
          `;
          const existingResult = await pool.query(existingQuery, [tournament.id, team.id]);
          
          if (existingResult.rows.length > 0) {
            console.log(`   ℹ️ ${team.team_name} already registered`);
            continue;
          }

          // Register team
          const registrationQuery = `
            INSERT INTO tournament_registrations 
            (tournament_id, team_id, registered_by, registration_date, status, checked_in)
            VALUES ($1, $2, $3, NOW(), 'registered', true)
            RETURNING *
          `;
          
          await pool.query(registrationQuery, [
            tournament.id,
            team.id,
            captain.id
          ]);
          
          console.log(`   ✅ Registered ${team.team_name}`);
        } catch (error) {
          console.log(`   ❌ Failed to register ${team.team_name}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Test teams setup completed!');
    console.log(`✅ Created ${createdTeams.length} teams and registered them to tournaments`);
    
  } catch (error) {
    console.error('❌ Error setting up test teams:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
addTestTeamsToRenderProduction().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});