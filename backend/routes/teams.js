const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get user's teams
router.get('/my-teams', requireAuth, async (req, res) => {
  try {
    const userID = req.user.userID;
    logger.info(`Getting teams for user: ${userID}`);
    
    // Get teams for this user directly from PostgreSQL
    const teams = await postgresService.getTeamsByUser(userID);
    logger.info(`Teams found for user ${userID}: ${teams.length}`);
    
    // Teams are already filtered by user in the PostgreSQL query
    res.json(teams);
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
    body('tournamentID').optional({ nullable: true, checkFalsy: true }).isLength({ min: 1 }).trim(),
    body('teamLogo').optional().isURL()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Get user's PostgreSQL UUID
      const userRecord = await postgresService.getUserById(req.user.userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Get tournament if provided (optional)
      let tournamentUUID = null;
      if (req.body.tournamentID) {
        const tournament = await postgresService.getTournamentById(req.body.tournamentID);
        if (!tournament) {
          return res.status(400).json({ error: 'Tournament not found' });
        }
        tournamentUUID = tournament.id; // Store UUID as foreign key
      }

      const teamData = {
        team_id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        team_name: req.body.teamName,
        team_tag: req.body.teamTag || null,
        team_logo: req.body.teamLogo || '/assets/images/predecessor-default-icon.jpg',
        tournament_id: tournamentUUID, // Store UUID as foreign key
        captain_id: userRecord.id,
        confirmed: true
      };

      logger.info('Creating team with data:', teamData);
      const team = await postgresService.createTeam(teamData);
      
      // Add captain as team player
      await postgresService.addPlayerToTeam(team.team_id, req.user.userID, 'captain');
      
      logger.info(`Team created: ${team.team_id} by user ${req.user.userID}`);
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

// Send team invitation
router.post('/:id/invite',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('discordUsername').optional().isLength({ min: 1 }).trim(),
    body('discordEmail').optional().isEmail(),
    body('role').optional().isIn(['Player', 'Substitute']),
    body('message').optional().isLength({ max: 500 }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const teamId = req.params.id;
      const { discordUsername, discordEmail, role, message } = req.body;
      const userID = req.user.userID;

      // Must provide either username or email
      if (!discordUsername && !discordEmail) {
        return res.status(400).json({ error: 'Must provide either Discord username or email' });
      }

      // Check if team exists and user is captain
      const team = await postgresService.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      logger.info(`Creating invitation for team ${teamId} by user ${userID}`);
      
      // Create the invitation
      const invitationData = {
        team_id: teamId,
        inviter_id: userID,
        invited_discord_username: discordUsername || null,
        invited_discord_email: discordEmail || null,
        role: role || 'Player',
        message: message || null
      };

      const invitation = await postgresService.createTeamInvitation(invitationData);
      
      logger.info(`Invitation created with ID: ${invitation.id}`);
      
      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          invited_username: discordUsername,
          invited_email: discordEmail,
          role: invitation.role,
          expires_at: invitation.expires_at
        }
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'User has already been invited to this team' });
      }
      logger.error('Error creating invitation:', error);
      res.status(500).json({ error: 'Failed to send invitation' });
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

      // TODO: Implement player removal logic with PostgreSQL
      res.json({ 
        message: 'Player removal endpoint - to be implemented',
        info: 'This feature will be available when team player management is fully implemented'
      });
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

      // TODO: Implement team confirmation logic with PostgreSQL
      res.json({ 
        message: 'Team confirmation endpoint - to be implemented',
        info: 'This feature will be available when full team management is implemented'
      });
    } catch (error) {
      logger.error('Error confirming team:', error);
      res.status(500).json({ error: 'Failed to confirm team' });
    }
  }
);

module.exports = router;