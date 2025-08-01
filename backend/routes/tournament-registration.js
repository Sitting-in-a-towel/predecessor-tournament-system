const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Register existing team for tournament
router.post('/tournaments/:tournamentId/register-team',
  requireAuth,
  [
    param('tournamentId').notEmpty(),
    body('teamId').isUUID().withMessage('Team ID must be a valid UUID'),
    body('type').isIn(['existing-team']).withMessage('Invalid registration type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;
      const { teamId, type } = req.body;
      console.log('Tournament registration - User object:', req.user); // Debug log
      const userId = req.user.id || req.user.userID;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      logger.info(`User ${userId} registering team ${teamId} for tournament ${tournamentId}`);

      // Verify tournament exists and is accepting registrations
      const tournamentQuery = `
        SELECT * FROM tournaments 
        WHERE tournament_id = $1 AND registration_open = true AND status = 'Registration'
      `;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(400).json({ error: 'Tournament not found or registration is closed' });
      }

      const tournament = tournamentResult.rows[0];

      // Verify user owns the team and is captain
      const teamQuery = `
        SELECT t.*, t.captain_id
        FROM teams t
        WHERE t.team_id = $1 AND t.captain_id = $2
      `;
      const teamResult = await postgresService.query(teamQuery, [teamId, userId]);
      
      if (teamResult.rows.length === 0) {
        return res.status(403).json({ error: 'Team not found or you are not the captain' });
      }

      const team = teamResult.rows[0];

      // Check if team is already registered for this tournament
      const existingQuery = `
        SELECT * FROM tournament_registrations 
        WHERE tournament_id = $1 AND team_id = $2
      `;
      const existingResult = await postgresService.query(existingQuery, [tournament.id, team.id]);
      
      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'Team is already registered for this tournament' });
      }

      // Create tournament registration
      const registrationQuery = `
        INSERT INTO tournament_registrations 
        (tournament_id, team_id, registered_by, registration_date, status)
        VALUES ($1, $2, $3, NOW(), 'registered')
        RETURNING *
      `;
      
      const registrationResult = await postgresService.query(registrationQuery, [
        tournament.id,
        team.id,
        userId
      ]);

      const registration = registrationResult.rows[0];

      logger.info(`Team ${teamId} successfully registered for tournament ${tournamentId}`);

      res.json({
        message: 'Team registered successfully!',
        registration: {
          id: registration.id,
          tournament_id: tournamentId,
          team_id: teamId,
          team_name: team.team_name,
          status: registration.status,
          registered_date: registration.registration_date
        }
      });

    } catch (error) {
      logger.error('Error registering team for tournament:', error);
      res.status(500).json({ error: 'Failed to register team for tournament' });
    }
  }
);

// Get tournament registrations (teams registered for a tournament)
router.get('/tournaments/:tournamentId/registrations',
  [param('tournamentId').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;

      // Get tournament info
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Get all registered teams
      const registrationsQuery = `
        SELECT 
          tr.*,
          t.team_name,
          t.team_logo,
          t.team_id as team_ref_id,
          u.discord_username as captain_username
        FROM tournament_registrations tr
        JOIN teams t ON tr.team_id = t.id
        JOIN users captain ON t.captain_id = captain.id
        JOIN users u ON captain.user_id = u.user_id
        WHERE tr.tournament_id = $1
        ORDER BY tr.registration_date ASC
      `;
      
      const registrationsResult = await postgresService.query(registrationsQuery, [tournament.id]);

      res.json({
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        registrations: registrationsResult.rows.map(reg => ({
          id: reg.id,
          team_id: reg.team_ref_id,
          team_name: reg.team_name,
          team_logo: reg.team_logo,
          captain_username: reg.captain_username,
          status: reg.status,
          registered_date: reg.registration_date
        }))
      });

    } catch (error) {
      logger.error('Error getting tournament registrations:', error);
      res.status(500).json({ error: 'Failed to get tournament registrations' });
    }
  }
);

// Create tournament_registrations table if it doesn't exist
router.get('/setup-tables', async (req, res) => {
  try {
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

    res.json({ message: 'Tournament registration tables created successfully' });
  } catch (error) {
    logger.error('Error setting up tournament registration tables:', error);
    res.status(500).json({ error: 'Failed to setup tables' });
  }
});

module.exports = router;