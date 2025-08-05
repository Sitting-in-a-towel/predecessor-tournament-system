const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

async function addTestTeams() {
  try {
    // Test team data
    const testTeams = [
      { name: 'Phoenix Squadron', logo: null },
      { name: 'Dragon Force', logo: null },
      { name: 'Thunder Hawks', logo: null },
      { name: 'Ice Wolves', logo: null },
      { name: 'Fire Panthers', logo: null },
      { name: 'Storm Eagles', logo: null },
      { name: 'Shadow Hunters', logo: null },
      { name: 'Lightning Bolts', logo: null },
      { name: 'Crystal Guardians', logo: null },
      { name: 'Nova Crusaders', logo: null },
      { name: 'Void Reapers', logo: null },
      { name: 'Cosmic Titans', logo: null },
      { name: 'Neon Ninjas', logo: null },
      { name: 'Steel Spartans', logo: null },
      { name: 'Crimson Knights', logo: null },
      { name: 'Golden Lions', logo: null }
    ];

    console.log('Starting test team creation...');

    // Get any user as captain
    const userQuery = `SELECT * FROM users WHERE discord_username IS NOT NULL LIMIT 1`;
    const userResult = await postgresService.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }

    const captain = userResult.rows[0];
    console.log(`Using ${captain.discord_username} as captain for test teams`);

    // Create teams
    const createdTeams = [];
    for (const teamData of testTeams) {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insertTeamQuery = `
        INSERT INTO teams (team_id, team_name, team_logo, captain_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
      
      const teamResult = await postgresService.query(insertTeamQuery, [
        teamId,
        teamData.name,
        teamData.logo,
        captain.id
      ]);
      
      const team = teamResult.rows[0];
      createdTeams.push(team);
      console.log(`Created team: ${team.team_name} (${team.team_id})`);
    }

    // Get all tournaments
    const tournamentsQuery = `SELECT * FROM tournaments ORDER BY created_at DESC`;
    const tournamentsResult = await postgresService.query(tournamentsQuery);
    
    console.log(`Found ${tournamentsResult.rows.length} tournaments`);

    // Register teams for each tournament
    for (const tournament of tournamentsResult.rows) {
      console.log(`\nRegistering teams for tournament: ${tournament.name}`);
      
      // Register 8-12 random teams per tournament
      const teamsToRegister = Math.floor(Math.random() * 5) + 8; // 8-12 teams
      const shuffledTeams = [...createdTeams].sort(() => 0.5 - Math.random());
      const selectedTeams = shuffledTeams.slice(0, teamsToRegister);
      
      for (const team of selectedTeams) {
        try {
          // Check if already registered
          const existingQuery = `
            SELECT * FROM tournament_registrations 
            WHERE tournament_id = $1 AND team_id = $2
          `;
          const existingResult = await postgresService.query(existingQuery, [tournament.id, team.id]);
          
          if (existingResult.rows.length > 0) {
            console.log(`  ${team.team_name} already registered`);
            continue;
          }

          // Register team
          const registrationQuery = `
            INSERT INTO tournament_registrations 
            (tournament_id, team_id, registered_by, registration_date, status, checked_in)
            VALUES ($1, $2, $3, NOW(), 'registered', true)
            RETURNING *
          `;
          
          await postgresService.query(registrationQuery, [
            tournament.id,
            team.id,
            captain.id
          ]);
          
          console.log(`  ✅ Registered ${team.team_name}`);
        } catch (error) {
          console.log(`  ❌ Failed to register ${team.team_name}: ${error.message}`);
        }
      }
      
      console.log(`Registered ${selectedTeams.length} teams for ${tournament.name}`);
    }

    console.log('\n✅ Test teams setup completed!');
    console.log(`Created ${createdTeams.length} teams and registered them to tournaments`);
    
  } catch (error) {
    console.error('Error setting up test teams:', error);
    logger.error('Test teams setup failed:', error);
  }
}

// Run the script
addTestTeams().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});