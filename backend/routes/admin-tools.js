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

// Initialize tournament registration table
router.post('/init-registration-table', async (req, res) => {
  try {
    logger.info('Initializing tournament_registrations table...');

    // Create tournament_registrations table if it doesn't exist
    await postgresService.query(`
      CREATE TABLE IF NOT EXISTS tournament_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        registered_by UUID NOT NULL REFERENCES users(id),
        registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'registered',
        checked_in BOOLEAN DEFAULT false,
        check_in_time TIMESTAMP WITH TIME ZONE,
        UNIQUE(tournament_id, team_id)
      )
    `);

    await postgresService.query(`
      CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id)
    `);

    await postgresService.query(`
      CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team ON tournament_registrations(team_id)
    `);

    await postgresService.query(`
      COMMENT ON TABLE tournament_registrations IS 'Stores team registrations for tournaments'
    `);

    await postgresService.query(`
      COMMENT ON COLUMN tournament_registrations.status IS 'Registration status: registered, confirmed, disqualified'
    `);

    await postgresService.query(`
      COMMENT ON COLUMN tournament_registrations.checked_in IS 'Whether team has checked in for tournament'
    `);

    const result = {
      success: true,
      message: 'Tournament registration table initialized successfully',
      table: 'tournament_registrations',
      indexes: ['idx_tournament_registrations_tournament', 'idx_tournament_registrations_team']
    };

    logger.info('Tournament registration table initialized', result);
    res.json(result);
    
  } catch (error) {
    logger.error('Error initializing tournament registration table:', error);
    res.status(500).json({ 
      error: 'Failed to initialize tournament registration table', 
      message: error.message,
      success: false 
    });
  }
});

// Register test teams to a specific tournament
router.post('/register-test-teams/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    logger.info(`Registering test teams to tournament: ${tournamentId}`);

    // Get the tournament
    const tournamentQuery = `SELECT * FROM tournaments WHERE id = $1`;
    const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Tournament not found',
        success: false 
      });
    }

    const tournament = tournamentResult.rows[0];

    // Get all test teams (created with prod prefix)
    const testTeamsQuery = `
      SELECT * FROM teams 
      WHERE team_id LIKE 'team_prod_%' 
      ORDER BY created_at DESC
    `;
    const testTeamsResult = await postgresService.query(testTeamsQuery);
    
    if (testTeamsResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No test teams found. Please create test teams first.',
        success: false 
      });
    }

    const results = [];
    let registeredCount = 0;

    // Register each test team
    for (const team of testTeamsResult.rows) {
      try {
        // Check if already registered
        const existingQuery = `
          SELECT * FROM tournament_registrations 
          WHERE tournament_id = $1 AND team_id = $2
        `;
        const existingResult = await postgresService.query(existingQuery, [tournament.id, team.id]);
        
        if (existingResult.rows.length > 0) {
          results.push(`   ℹ️ ${team.team_name} already registered`);
          registeredCount++;
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
          team.captain_id
        ]);
        
        results.push(`   ✅ Registered ${team.team_name}`);
        registeredCount++;
        
      } catch (error) {
        results.push(`   ❌ Failed to register ${team.team_name}: ${error.message}`);
      }
    }

    const summary = {
      success: true,
      message: `Registered test teams to tournament: ${tournament.name}`,
      tournamentName: tournament.name,
      teamsFound: testTeamsResult.rows.length,
      teamsRegistered: registeredCount,
      results: results
    };

    logger.info('Test teams registration completed', summary);
    res.json(summary);
    
  } catch (error) {
    logger.error('Error registering test teams:', error);
    res.status(500).json({ 
      error: 'Failed to register test teams', 
      message: error.message,
      success: false 
    });
  }
});

module.exports = router;