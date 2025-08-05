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
      console.log('Registration request - teamId:', teamId, 'tournamentId:', tournamentId);
      const userId = req.user.id || req.user.userID;
      console.log('User ID being used:', userId);

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
      // The req.user.id is already the UUID, use it directly
      const userUUID = req.user.id;
      console.log('User UUID found:', userUUID);
      
      // Now verify team ownership using UUID
      const teamQuery = `
        SELECT t.*, t.captain_id
        FROM teams t
        WHERE t.id = $1 AND t.captain_id = $2
      `;
      console.log('Team query - teamId:', teamId, 'userUUID:', userUUID);
      const teamResult = await postgresService.query(teamQuery, [teamId, userUUID]);
      console.log('Team query result:', teamResult.rows.length, 'rows found');
      
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

      // Get all registered teams with check-in status
      const registrationsQuery = `
        SELECT 
          tr.*,
          t.team_name,
          t.team_logo,
          t.team_id as team_ref_id,
          u.discord_username as captain_username,
          tr.checked_in,
          tr.check_in_time
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
          registered_date: reg.registration_date,
          checked_in: reg.checked_in,
          check_in_time: reg.check_in_time
        }))
      });

    } catch (error) {
      logger.error('Error getting tournament registrations:', error);
      res.status(500).json({ error: 'Failed to get tournament registrations' });
    }
  }
);

// Team check-in endpoint
router.post('/tournaments/:tournamentId/check-in',
  requireAuth,
  [param('tournamentId').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;
      const userId = req.user.id || req.user.userID;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      // Verify tournament exists
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Find user's team registration for this tournament
      const registrationQuery = `
        SELECT tr.*, t.team_name, t.captain_id
        FROM tournament_registrations tr
        JOIN teams t ON tr.team_id = t.id
        WHERE tr.tournament_id = $1 AND t.captain_id = $2
      `;
      const registrationResult = await postgresService.query(registrationQuery, [tournament.id, userId]);

      if (registrationResult.rows.length === 0) {
        return res.status(403).json({ error: 'No team found for this tournament or you are not the captain' });
      }

      const registration = registrationResult.rows[0];

      // Check if already checked in
      if (registration.checked_in) {
        return res.status(400).json({ error: 'Team is already checked in' });
      }

      // Check in the team
      const checkInQuery = `
        UPDATE tournament_registrations 
        SET checked_in = true, check_in_time = NOW() 
        WHERE id = $1
        RETURNING *
      `;
      const checkInResult = await postgresService.query(checkInQuery, [registration.id]);

      logger.info(`Team ${registration.team_name} checked in for tournament ${tournamentId}`);

      res.json({
        message: 'Team checked in successfully!',
        registration: {
          id: checkInResult.rows[0].id,
          team_name: registration.team_name,
          checked_in: true,
          check_in_time: checkInResult.rows[0].check_in_time
        }
      });

    } catch (error) {
      logger.error('Error checking in team:', error);
      res.status(500).json({ error: 'Failed to check in team' });
    }
  }
);

// Get tournament check-in status
router.get('/tournaments/:tournamentId/check-in-status',
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

      // Get all registrations with check-in status
      const registrationsQuery = `
        SELECT 
          tr.*,
          t.team_name,
          t.team_logo,
          t.team_id as team_ref_id,
          u.discord_username as captain_username,
          tr.checked_in,
          tr.check_in_time,
          (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id AND tm.status = 'confirmed') as player_count
        FROM tournament_registrations tr
        JOIN teams t ON tr.team_id = t.id
        JOIN users captain ON t.captain_id = captain.id
        JOIN users u ON captain.user_id = u.user_id
        WHERE tr.tournament_id = $1
        ORDER BY tr.registration_date ASC
      `;
      
      const registrationsResult = await postgresService.query(registrationsQuery, [tournament.id]);

      // Calculate summary statistics
      const totalTeams = registrationsResult.rows.length;
      const confirmedTeams = registrationsResult.rows.filter(team => team.status === 'registered').length;
      const checkedInTeams = registrationsResult.rows.filter(team => team.checked_in).length;
      const readyToStart = checkedInTeams >= 2; // Minimum teams needed to start

      res.json({
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        summary: {
          totalTeams,
          confirmedTeams,
          checkedInTeams,
          readyToStart
        },
        teams: registrationsResult.rows.map(reg => ({
          id: reg.id,
          team_id: reg.team_ref_id,
          team_name: reg.team_name,
          team_logo: reg.team_logo,
          captain_username: reg.captain_username,
          status: reg.status,
          registered_date: reg.registration_date,
          checked_in: reg.checked_in,
          check_in_time: reg.check_in_time,
          player_count: reg.player_count,
          confirmed: reg.status === 'registered'
        }))
      });

    } catch (error) {
      logger.error('Error getting check-in status:', error);
      res.status(500).json({ error: 'Failed to get check-in status' });
    }
  }
);

// Admin toggle team check-in
router.post('/tournaments/:tournamentId/admin-toggle-checkin/:teamId',
  requireAuth,
  [
    param('tournamentId').notEmpty(),
    param('teamId').isUUID().withMessage('Team ID must be a valid UUID'),
    body('checked_in').isBoolean().withMessage('checked_in must be a boolean')
  ],
  async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user.role || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId, teamId } = req.params;
      const { checked_in } = req.body;

      // Get tournament
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Find the registration
      const registrationQuery = `
        SELECT tr.*, t.team_name
        FROM tournament_registrations tr
        JOIN teams t ON tr.team_id = t.id
        WHERE tr.tournament_id = $1 AND t.team_id = $2
      `;
      const registrationResult = await postgresService.query(registrationQuery, [tournament.id, teamId]);

      if (registrationResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team registration not found' });
      }

      const registration = registrationResult.rows[0];

      // Update check-in status
      const updateQuery = `
        UPDATE tournament_registrations 
        SET checked_in = $1, check_in_time = ${checked_in ? 'NOW()' : 'NULL'}
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await postgresService.query(updateQuery, [checked_in, registration.id]);

      logger.info(`Admin ${req.user.discord_username} ${checked_in ? 'checked in' : 'unchecked'} team ${registration.team_name} for tournament ${tournamentId}`);

      res.json({
        message: `Team ${checked_in ? 'checked in' : 'unchecked'} successfully!`,
        registration: {
          id: updateResult.rows[0].id,
          team_name: registration.team_name,
          checked_in: updateResult.rows[0].checked_in,
          check_in_time: updateResult.rows[0].check_in_time
        }
      });

    } catch (error) {
      logger.error('Error toggling team check-in:', error);
      res.status(500).json({ error: 'Failed to toggle team check-in' });
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