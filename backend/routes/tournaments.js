const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get all tournaments (public endpoint)
router.get('/', 
  [
    query('status').optional().isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled']),
    query('bracketType').optional().isIn(['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.bracketType) filters.bracketType = req.query.bracketType;

      const tournaments = await postgresService.getTournaments(filters);
      
      logger.info(`Retrieved ${tournaments.length} tournaments`);
      res.json(tournaments);
    } catch (error) {
      logger.error('Error getting tournaments:', error);
      res.status(500).json({ error: 'Failed to retrieve tournaments' });
    }
  }
);

// Get specific tournament by ID (public endpoint)
router.get('/:id',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // This would need to be implemented
      // const tournament = await airtableService.getTournamentByID(req.params.id);
      
      res.json({ message: 'Tournament details endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error getting tournament:', error);
      res.status(500).json({ error: 'Failed to retrieve tournament' });
    }
  }
);

// Create new tournament (authenticated users only)
router.post('/',
  requireAuth,
  [
    body('name').isLength({ min: 3, max: 100 }).trim().escape(),
    body('description').optional().isLength({ max: 1000 }).trim().escape(),
    body('bracketType').isIn(['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss']),
    body('gameFormat').isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('quarterFinalFormat').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('semiFinalFormat').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('grandFinalFormat').optional().isIn(['Best of 1', 'Best of 3', 'Best of 5']),
    body('maxTeams').isInt({ min: 2, max: 64 }),
    body('startDate').isISO8601().toDate(),
    body('endDate').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Tournament validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      logger.info('Creating tournament with data:', req.body);
      logger.info('User object:', req.user);
      
      // Get user's PostgreSQL UUID
      let userUUID = req.user.id;
      if (!userUUID && req.user.userID) {
        logger.info('Looking up user by userID:', req.user.userID);
        const userRecord = await postgresService.getUserById(req.user.userID);
        logger.info('Found user record:', userRecord);
        userUUID = userRecord?.id;
      }
      
      if (!userUUID) {
        logger.error('No user UUID found for tournament creation');
        return res.status(400).json({ error: 'User authentication error' });
      }

      const tournamentData = {
        tournament_id: `tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: req.body.name,
        description: req.body.description || '',
        bracket_type: req.body.bracketType,
        game_format: req.body.gameFormat,
        quarter_final_format: req.body.quarterFinalFormat || req.body.gameFormat,
        semi_final_format: req.body.semiFinalFormat || req.body.gameFormat,
        grand_final_format: req.body.grandFinalFormat || req.body.gameFormat,
        max_teams: req.body.maxTeams,
        start_date: req.body.startDate,
        end_date: req.body.endDate || null,
        created_by: userUUID,
        status: 'Registration',
        is_public: true
      };

      logger.info('Sending tournament data to PostgreSQL:', tournamentData);
      const tournament = await postgresService.createTournament(tournamentData);
      
      logger.info(`Tournament created: ${tournament.tournament_id} by user ${req.user.userID}`);
      res.status(201).json(tournament);
    } catch (error) {
      logger.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  }
);

// Update tournament (admin or creator only)
router.put('/:id',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('name').optional().isLength({ min: 3, max: 100 }).trim().escape(),
    body('description').optional().isLength({ max: 1000 }).trim().escape(),
    body('status').optional().isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled']),
    body('registrationOpen').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement tournament update logic
      // - Check if user is admin or tournament creator
      // - Update tournament in Airtable
      
      res.json({ message: 'Tournament update endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  }
);

// Delete tournament (admin only)
router.delete('/:id',
  requireAdmin,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement tournament deletion logic
      
      res.json({ message: 'Tournament deletion endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  }
);

// Get tournament teams
router.get('/:id/teams',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const teams = await airtableService.getTeamsByTournament(req.params.id);
      
      logger.info(`Retrieved ${teams.length} teams for tournament ${req.params.id}`);
      res.json(teams);
    } catch (error) {
      logger.error('Error getting tournament teams:', error);
      res.status(500).json({ error: 'Failed to retrieve tournament teams' });
    }
  }
);

// Team check-in for tournament
router.post('/:id/checkin',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournamentId = req.params.id;
      const userID = req.user.userID;

      // Get user's Airtable record ID
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Find user's teams in this tournament
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      const userTeams = teams.filter(team => {
        const isCaptain = team.Captain && team.Captain.includes(userRecord.recordId);
        const isPlayer = team.Players && team.Players.includes(userRecord.recordId);
        return isCaptain || isPlayer;
      });

      if (userTeams.length === 0) {
        return res.status(403).json({ error: 'You are not part of any team in this tournament' });
      }

      // Only team captains can check in
      const captainTeams = userTeams.filter(team => 
        team.Captain && team.Captain.includes(userRecord.recordId)
      );

      if (captainTeams.length === 0) {
        return res.status(403).json({ error: 'Only team captains can check in for their team' });
      }

      const team = captainTeams[0]; // User should only captain one team per tournament

      // Check if team is confirmed
      if (!team.Confirmed) {
        return res.status(400).json({ error: 'Team must be confirmed before checking in' });
      }

      // Check if already checked in
      if (team.CheckedIn) {
        return res.status(400).json({ error: 'Team is already checked in' });
      }

      // Perform check-in
      await airtableService.updateTeam(team.recordId, {
        CheckedIn: true,
        CheckInTime: new Date().toISOString()
      });

      logger.info(`Team ${team.TeamName} (${team.TeamID}) checked in for tournament ${tournamentId} by captain ${userID}`);
      res.json({ 
        message: 'Team successfully checked in for tournament',
        team: {
          TeamID: team.TeamID,
          TeamName: team.TeamName,
          CheckedIn: true,
          CheckInTime: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error checking in team:', error);
      res.status(500).json({ error: 'Failed to check in team' });
    }
  }
);

// Get tournament check-in status
router.get('/:id/checkin-status',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const tournamentId = req.params.id;
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      
      const checkinStatus = teams.map(team => ({
        TeamID: team.TeamID,
        TeamName: team.TeamName,
        Confirmed: team.Confirmed || false,
        CheckedIn: team.CheckedIn || false,
        CheckInTime: team.CheckInTime || null,
        PlayerCount: team.Players?.length || 0
      }));

      const totalTeams = teams.length;
      const confirmedTeams = teams.filter(team => team.Confirmed).length;
      const checkedInTeams = teams.filter(team => team.CheckedIn).length;

      logger.info(`Check-in status for tournament ${tournamentId}: ${checkedInTeams}/${confirmedTeams} teams checked in`);
      res.json({
        tournamentId,
        summary: {
          totalTeams,
          confirmedTeams,
          checkedInTeams,
          readyToStart: checkedInTeams >= 2 // Minimum for tournament
        },
        teams: checkinStatus
      });
    } catch (error) {
      logger.error('Error getting check-in status:', error);
      res.status(500).json({ error: 'Failed to retrieve check-in status' });
    }
  }
);

// Admin: Force check-in status
router.put('/:id/teams/:teamId/checkin',
  requireAdmin,
  [
    param('id').isLength({ min: 1 }).trim(),
    param('teamId').isLength({ min: 1 }).trim(),
    body('checkedIn').isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id: tournamentId, teamId } = req.params;
      const { checkedIn } = req.body;

      // Find the team
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      const team = teams.find(t => t.TeamID === teamId);

      if (!team) {
        return res.status(404).json({ error: 'Team not found in this tournament' });
      }

      // Update check-in status
      const updates = { CheckedIn: checkedIn };
      if (checkedIn) {
        updates.CheckInTime = new Date().toISOString();
      } else {
        updates.CheckInTime = null;
      }

      await airtableService.updateTeam(team.recordId, updates);

      logger.info(`Admin ${req.user.userID} ${checkedIn ? 'checked in' : 'unchecked'} team ${team.TeamName} for tournament ${tournamentId}`);
      res.json({ 
        message: `Team ${checkedIn ? 'checked in' : 'check-in removed'} successfully`,
        team: {
          TeamID: team.TeamID,
          TeamName: team.TeamName,
          CheckedIn: checkedIn,
          CheckInTime: updates.CheckInTime
        }
      });
    } catch (error) {
      logger.error('Error updating team check-in status:', error);
      res.status(500).json({ error: 'Failed to update check-in status' });
    }
  }
);

module.exports = router;