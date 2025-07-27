const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { airtableService } = require('../services/airtable');
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

      const tournaments = await airtableService.getTournaments(filters);
      
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
    body('endDate').optional().isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Tournament validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      logger.info('Creating tournament with data:', req.body);

      const tournamentData = {
        TournamentID: `tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        Name: req.body.name,
        Description: req.body.description || '',
        BracketType: req.body.bracketType,
        GameFormat: req.body.gameFormat,
        QuarterFinalFormat: req.body.quarterFinalFormat || req.body.gameFormat,
        SemiFinalFormat: req.body.semiFinalFormat || req.body.gameFormat,
        GrandFinalFormat: req.body.grandFinalFormat || req.body.gameFormat,
        MaxTeams: req.body.maxTeams,
        RegistrationOpen: true,
        StartDate: req.body.startDate.toISOString(),
        EndDate: req.body.endDate ? req.body.endDate.toISOString() : null,
        CreatedBy: req.user.userID, // Single string instead of array
        Status: 'Upcoming'
      };

      logger.info('Sending tournament data to Airtable:', tournamentData);
      const tournament = await airtableService.createTournament(tournamentData);
      
      logger.info(`Tournament created: ${tournament.TournamentID} by user ${req.user.userID}`);
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

module.exports = router;