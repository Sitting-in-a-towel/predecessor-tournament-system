const express = require('express');
const router = express.Router();
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

// Add test teams endpoint (admin only)
router.post('/add-test-teams', async (req, res) => {
  try {
    // Test team data
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

    logger.info('Starting test team creation...');

    // Get any user as captain
    const userQuery = `SELECT * FROM users WHERE discord_username IS NOT NULL LIMIT 1`;
    const userResult = await postgresService.query(userQuery);
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No users found. Please create a user first.',
        success: false 
      });
    }

    const captain = userResult.rows[0];
    logger.info(`Using ${captain.discord_username} as captain for test teams`);

    // Create teams
    const createdTeams = [];
    const results = [];
    
    for (const teamData of testTeams) {
      const teamId = `team_prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Check if team already exists
        const existingTeam = await postgresService.query('SELECT team_id FROM teams WHERE team_name = $1', [teamData.name]);
        if (existingTeam.rows.length > 0) {
          results.push(`⚠️ Team already exists: ${teamData.name}`);
          continue;
        }

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
        results.push(`✅ Created team: ${team.team_name} (${team.team_id})`);
      } catch (error) {
        results.push(`❌ Failed to create team ${teamData.name}: ${error.message}`);
      }
    }

    // Get all tournaments
    const tournamentsQuery = `SELECT * FROM tournaments ORDER BY created_at DESC`;
    const tournamentsResult = await postgresService.query(tournamentsQuery);
    
    results.push(`\n📋 Found ${tournamentsResult.rows.length} tournaments`);

    // Register teams for each tournament
    for (const tournament of tournamentsResult.rows) {
      results.push(`\n📝 Registering teams for tournament: ${tournament.name}`);
      
      for (const team of createdTeams) {
        try {
          // Check if already registered
          const existingQuery = `
            SELECT * FROM tournament_registrations 
            WHERE tournament_id = $1 AND team_id = $2
          `;
          const existingResult = await postgresService.query(existingQuery, [tournament.id, team.id]);
          
          if (existingResult.rows.length > 0) {
            results.push(`   ℹ️ ${team.team_name} already registered`);
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
          
          results.push(`   ✅ Registered ${team.team_name}`);
        } catch (error) {
          results.push(`   ❌ Failed to register ${team.team_name}: ${error.message}`);
        }
      }
    }

    const summary = {
      success: true,
      message: 'Test teams setup completed!',
      teamsCreated: createdTeams.length,
      tournamentsFound: tournamentsResult.rows.length,
      results: results
    };

    logger.info('Test teams setup completed', summary);
    res.json(summary);
    
  } catch (error) {
    logger.error('Error setting up test teams:', error);
    res.status(500).json({ 
      error: 'Failed to create test teams', 
      message: error.message,
      success: false 
    });
  }
});

module.exports = router;