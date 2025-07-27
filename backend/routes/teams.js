const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { airtableService } = require('../services/airtable');
const logger = require('../utils/logger');

const router = express.Router();

// Get user's teams
router.get('/my-teams', requireAuth, async (req, res) => {
  try {
    const userID = req.user.userID;
    logger.info(`Getting teams for user: ${userID}`);
    
    // Get all teams and filter by user involvement
    const teams = await airtableService.getTeams();
    logger.info(`Total teams found: ${teams.length}`);
    
    // Get user's Airtable record ID for proper filtering
    const userRecord = await airtableService.getUserByID(userID);
    if (!userRecord) {
      logger.warn(`User record not found for userID: ${userID}`);
      return res.json([]);
    }
    
    const userRecordId = userRecord.recordId;
    logger.info(`User record ID: ${userRecordId}`);
    
    // Filter teams where user is captain or player
    const userTeams = teams.filter(team => {
      // Check if user is captain (by record ID)
      const isCaptain = team.Captain && team.Captain.includes(userRecordId);
      
      // Check if user is in players list (by record ID)
      const isPlayer = team.Players && team.Players.includes(userRecordId);
      
      // Check if user is in substitutes list (by record ID)
      const isSubstitute = team.Substitutes && team.Substitutes.includes(userRecordId);
      
      if (isCaptain || isPlayer || isSubstitute) {
        logger.info(`User is member of team: ${team.TeamName} (Captain: ${isCaptain}, Player: ${isPlayer}, Sub: ${isSubstitute})`);
      }
      
      return isCaptain || isPlayer || isSubstitute;
    });

    logger.info(`User teams found: ${userTeams.length}`);
    res.json(userTeams);
  } catch (error) {
    logger.error('Error getting user teams:', error);
    res.status(500).json({ error: 'Failed to retrieve teams' });
  }
});

// Create new team
router.post('/',
  requireAuth,
  [
    body('teamName').isLength({ min: 2, max: 50 }).trim().escape(),
    body('tournamentID').isLength({ min: 1 }).trim(),
    body('teamLogo').optional().isURL()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Get user's Airtable record ID
      const userRecord = await airtableService.getUserByID(req.user.userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Get tournament's Airtable record ID
      const tournaments = await airtableService.getTournaments();
      const tournament = tournaments.find(t => t.TournamentID === req.body.tournamentID);
      if (!tournament) {
        return res.status(400).json({ error: 'Tournament not found' });
      }

      const teamData = {
        TeamID: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        TeamName: req.body.teamName,
        Captain: [userRecord.recordId], // Use Airtable record ID
        Players: [userRecord.recordId], // Captain is also a player
        Tournament: [tournament.recordId], // Use tournament's record ID
        Confirmed: false,
        CreatedAt: new Date().toISOString(),
        TeamLogo: req.body.teamLogo || '/assets/images/predecessor-default-icon.jpg'
      };

      logger.info('Creating team with data:', teamData);
      const team = await airtableService.createTeam(teamData);
      
      logger.info(`Team created: ${team.TeamID} by user ${req.user.userID}`);
      res.status(201).json(team);
    } catch (error) {
      logger.error('Error creating team:', error);
      res.status(500).json({ error: 'Failed to create team' });
    }
  }
);

// Get team details
router.get('/:id',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement get team by ID
      res.json({ message: 'Team details endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error getting team:', error);
      res.status(500).json({ error: 'Failed to retrieve team' });
    }
  }
);

// Update team (captain only)
router.put('/:id',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('teamName').optional().isLength({ min: 2, max: 50 }).trim().escape(),
    body('teamLogo').optional().isURL()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement team update logic
      // - Verify user is team captain
      // - Update team in Airtable
      
      res.json({ message: 'Team update endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error updating team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  }
);

// Invite player to team
router.post('/:id/invite',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('playerID').isLength({ min: 1 }).trim(),
    body('role').optional().isIn(['player', 'substitute'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement player invitation logic
      // - Verify user is team captain
      // - Create notification for invited player
      // - Update team roster if accepted
      
      res.json({ message: 'Player invitation endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error inviting player:', error);
      res.status(500).json({ error: 'Failed to invite player' });
    }
  }
);

// Remove player from team
router.delete('/:id/players/:playerId',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    param('playerId').isLength({ min: 1 }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement player removal logic
      // - Verify user is team captain
      // - Remove player from team roster
      // - Create notification for removed player
      
      res.json({ message: 'Player removal endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error removing player:', error);
      res.status(500).json({ error: 'Failed to remove player' });
    }
  }
);

// Confirm team registration
router.post('/:id/confirm',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement team confirmation logic
      // - Verify user is team captain
      // - Check team has minimum required players
      // - Mark team as confirmed
      
      res.json({ message: 'Team confirmation endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error confirming team:', error);
      res.status(500).json({ error: 'Failed to confirm team' });
    }
  }
);

module.exports = router;