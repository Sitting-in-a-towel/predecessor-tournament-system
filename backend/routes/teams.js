const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
// const postgresService = require('../services/postgresql'); // Disabled for production
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

      const teamId = req.params.id;
      const { playerID, role } = req.body;
      const userID = req.user.userID;

      // Get team details
      const teams = await airtableService.getTeams();
      const team = teams.find(t => t.TeamID === teamId);
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Get user's Airtable record ID
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Verify user is team captain
      const isCaptain = team.Captain && team.Captain.includes(userRecord.recordId);
      if (!isCaptain) {
        return res.status(403).json({ error: 'Only team captains can invite players' });
      }

      // Check if team is already confirmed
      if (team.Confirmed) {
        return res.status(400).json({ error: 'Cannot modify confirmed team roster' });
      }

      // Check if team has space
      const currentPlayers = team.Players?.length || 0;
      const currentSubstitutes = team.Substitutes?.length || 0;

      if (role === 'player' && currentPlayers >= 5) {
        return res.status(400).json({ error: 'Team already has maximum 5 players' });
      }

      if (role === 'substitute' && currentSubstitutes >= 3) {
        return res.status(400).json({ error: 'Team already has maximum 3 substitutes' });
      }

      // For now, try to find player by Discord username
      // In a full system, this would be a proper invitation system
      const allUsers = await airtableService.getAllUsers();
      const targetPlayer = allUsers.find(user => 
        user.DiscordUsername.toLowerCase() === playerID.toLowerCase()
      );

      if (!targetPlayer) {
        return res.status(404).json({ 
          error: 'Player not found. Make sure they have joined the tournament system.' 
        });
      }

      // Check if player is already in this team
      const isAlreadyPlayer = team.Players && team.Players.includes(targetPlayer.recordId);
      const isAlreadySubstitute = team.Substitutes && team.Substitutes.includes(targetPlayer.recordId);

      if (isAlreadyPlayer || isAlreadySubstitute) {
        return res.status(400).json({ error: 'Player is already in this team' });
      }

      // Check if player is in another team for the same tournament
      const allTeams = await airtableService.getTeamsByTournament(team.Tournament[0]);
      const playerInOtherTeam = allTeams.find(otherTeam => 
        otherTeam.TeamID !== teamId && (
          (otherTeam.Players && otherTeam.Players.includes(targetPlayer.recordId)) ||
          (otherTeam.Substitutes && otherTeam.Substitutes.includes(targetPlayer.recordId))
        )
      );

      if (playerInOtherTeam) {
        return res.status(400).json({ 
          error: `Player is already in team "${playerInOtherTeam.TeamName}" for this tournament` 
        });
      }

      // Add player to team
      let updatedPlayers = team.Players || [];
      let updatedSubstitutes = team.Substitutes || [];

      if (role === 'player') {
        updatedPlayers.push(targetPlayer.recordId);
      } else {
        updatedSubstitutes.push(targetPlayer.recordId);
      }

      // Update team with new roster
      await airtableService.updateTeam(team.recordId, {
        Players: updatedPlayers,
        Substitutes: updatedSubstitutes
      });

      logger.info(`Player ${targetPlayer.DiscordUsername} added to team ${team.TeamName} (${teamId}) as ${role} by captain ${userID}`);
      res.json({ 
        message: `${targetPlayer.DiscordUsername} has been added to the team as ${role}`,
        addedPlayer: {
          username: targetPlayer.DiscordUsername,
          role: role
        }
      });
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

      const teamId = req.params.id;
      const playerIdToRemove = req.params.playerId;
      const userID = req.user.userID;

      // Get team details
      const teams = await airtableService.getTeams();
      const team = teams.find(t => t.TeamID === teamId);
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Get user's Airtable record ID
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Verify user is team captain
      const isCaptain = team.Captain && team.Captain.includes(userRecord.recordId);
      if (!isCaptain) {
        return res.status(403).json({ error: 'Only team captains can remove players' });
      }

      // Check if team is already confirmed
      if (team.Confirmed) {
        return res.status(400).json({ error: 'Cannot modify confirmed team roster' });
      }

      // Get player record to be removed
      const playerRecord = await airtableService.getUserByID(playerIdToRemove);
      if (!playerRecord) {
        return res.status(400).json({ error: 'Player not found' });
      }

      // Prevent captain from removing themselves
      if (playerIdToRemove === userID) {
        return res.status(400).json({ error: 'Team captain cannot remove themselves' });
      }

      // Check if player is in the team
      const isInPlayers = team.Players && team.Players.includes(playerRecord.recordId);
      const isInSubstitutes = team.Substitutes && team.Substitutes.includes(playerRecord.recordId);

      if (!isInPlayers && !isInSubstitutes) {
        return res.status(400).json({ error: 'Player is not in this team' });
      }

      // Remove player from appropriate array
      let updatedPlayers = team.Players || [];
      let updatedSubstitutes = team.Substitutes || [];

      if (isInPlayers) {
        updatedPlayers = updatedPlayers.filter(playerId => playerId !== playerRecord.recordId);
      }
      
      if (isInSubstitutes) {
        updatedSubstitutes = updatedSubstitutes.filter(playerId => playerId !== playerRecord.recordId);
      }

      // Update team with new roster
      await airtableService.updateTeam(team.recordId, {
        Players: updatedPlayers,
        Substitutes: updatedSubstitutes
      });

      logger.info(`Player ${playerIdToRemove} removed from team ${team.TeamName} (${teamId}) by captain ${userID}`);
      res.json({ 
        message: 'Player removed successfully',
        removedPlayer: playerRecord.DiscordUsername
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

      const teamId = req.params.id;
      const userID = req.user.userID;

      // Get team details
      const teams = await airtableService.getTeams();
      const team = teams.find(t => t.TeamID === teamId);
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Get user's Airtable record ID
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Verify user is team captain
      const isCaptain = team.Captain && team.Captain.includes(userRecord.recordId);
      if (!isCaptain) {
        return res.status(403).json({ error: 'Only team captains can confirm teams' });
      }

      // Check team has minimum required players (5)
      const playerCount = team.Players?.length || 0;
      if (playerCount < 5) {
        return res.status(400).json({ error: 'Team must have at least 5 players to be confirmed' });
      }

      // Check if team is already confirmed
      if (team.Confirmed) {
        return res.status(400).json({ error: 'Team is already confirmed' });
      }

      // Mark team as confirmed
      await airtableService.updateTeam(team.recordId, {
        Confirmed: true,
        ConfirmedAt: new Date().toISOString()
      });

      logger.info(`Team ${team.TeamName} (${teamId}) confirmed by captain ${userID}`);
      res.json({ 
        message: 'Team confirmed successfully',
        team: {
          ...team,
          Confirmed: true,
          ConfirmedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error confirming team:', error);
      res.status(500).json({ error: 'Failed to confirm team' });
    }
  }
);

module.exports = router;