const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { airtableService } = require('../services/airtable');
const logger = require('../utils/logger');

const router = express.Router();

// Get all matches
router.get('/', async (req, res) => {
  try {
    const matches = await airtableService.getMatches();
    logger.info(`Retrieved ${matches.length} matches`);
    res.json(matches);
  } catch (error) {
    logger.error('Error getting matches:', error);
    res.status(500).json({ error: 'Failed to retrieve matches' });
  }
});

// Get matches for a specific tournament
router.get('/tournament/:tournamentId', 
  [param('tournamentId').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const matches = await airtableService.getMatchesByTournament(req.params.tournamentId);
      logger.info(`Retrieved ${matches.length} matches for tournament ${req.params.tournamentId}`);
      res.json(matches);
    } catch (error) {
      logger.error('Error getting tournament matches:', error);
      res.status(500).json({ error: 'Failed to retrieve tournament matches' });
    }
  }
);

// Create new match (admin only)
router.post('/',
  requireAdmin,
  [
    body('tournamentId').isLength({ min: 1 }).trim(),
    body('team1Id').isLength({ min: 1 }).trim(),
    body('team2Id').isLength({ min: 1 }).trim(),
    body('round').isLength({ min: 1 }).trim(),
    body('matchType').isIn(['Group Stage', 'Quarter Final', 'Semi Final', 'Grand Final', 'Lower Bracket']),
    body('scheduledTime').optional().isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId, team1Id, team2Id, round, matchType, scheduledTime } = req.body;

      // Validate tournament exists
      const tournaments = await airtableService.getTournaments();
      const tournament = tournaments.find(t => t.TournamentID === tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Validate teams exist and are in tournament
      const teams = await airtableService.getTeamsByTournament(tournamentId);
      const team1 = teams.find(t => t.TeamID === team1Id);
      const team2 = teams.find(t => t.TeamID === team2Id);

      if (!team1) {
        return res.status(404).json({ error: 'Team 1 not found in tournament' });
      }
      if (!team2) {
        return res.status(404).json({ error: 'Team 2 not found in tournament' });
      }

      // Check teams are confirmed and checked in
      if (!team1.Confirmed || !team1.CheckedIn) {
        return res.status(400).json({ error: `Team ${team1.TeamName} must be confirmed and checked in` });
      }
      if (!team2.Confirmed || !team2.CheckedIn) {
        return res.status(400).json({ error: `Team ${team2.TeamName} must be confirmed and checked in` });
      }

      const matchData = {
        MatchID: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        Tournament: [tournament.recordId],
        Team1: [team1.recordId],
        Team2: [team2.recordId],
        Round: round,
        MatchType: matchType,
        Status: 'Scheduled',
        ScheduledTime: scheduledTime ? scheduledTime.toISOString() : null,
        CreatedAt: new Date().toISOString(),
        CreatedBy: req.user.userID
      };

      const match = await airtableService.createMatch(matchData);
      logger.info(`Match created: ${match.MatchID} - ${team1.TeamName} vs ${team2.TeamName}`);
      
      res.status(201).json(match);
    } catch (error) {
      logger.error('Error creating match:', error);
      res.status(500).json({ error: 'Failed to create match' });
    }
  }
);

// Update match result
router.put('/:id/result',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('winner').isIn(['team1', 'team2']),
    body('team1Score').isInt({ min: 0, max: 10 }),
    body('team2Score').isInt({ min: 0, max: 10 }),
    body('gameLength').optional().isInt({ min: 0 }),
    body('notes').optional().isLength({ max: 500 }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const matchId = req.params.id;
      const { winner, team1Score, team2Score, gameLength, notes } = req.body;
      const userID = req.user.userID;

      // Get match details
      const matches = await airtableService.getMatches();
      const match = matches.find(m => m.MatchID === matchId);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Check if match is in correct status
      if (match.Status !== 'In Progress' && match.Status !== 'Scheduled') {
        return res.status(400).json({ error: 'Match cannot be updated in current status' });
      }

      // Get user's record to check permissions
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // Check if user is admin or team captain of one of the teams
      const isAdmin = userRecord.IsAdmin;
      const isTeam1Captain = match.Team1 && match.Team1.some(teamRecord => {
        // Need to check if user is captain of this team
        return match.Team1Captain && match.Team1Captain.includes(userRecord.recordId);
      });
      const isTeam2Captain = match.Team2 && match.Team2.some(teamRecord => {
        return match.Team2Captain && match.Team2Captain.includes(userRecord.recordId);
      });

      if (!isAdmin && !isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only team captains or admins can report match results' });
      }

      // Validate scores make sense
      if (winner === 'team1' && team1Score <= team2Score) {
        return res.status(400).json({ error: 'Team 1 score must be higher if they won' });
      }
      if (winner === 'team2' && team2Score <= team1Score) {
        return res.status(400).json({ error: 'Team 2 score must be higher if they won' });
      }

      // Update match with results
      const updates = {
        Status: 'Completed',
        Winner: winner,
        Team1Score: team1Score,
        Team2Score: team2Score,
        CompletedAt: new Date().toISOString(),
        ReportedBy: userID
      };

      if (gameLength) updates.GameLength = gameLength;
      if (notes) updates.Notes = notes;

      await airtableService.updateMatch(match.recordId, updates);

      logger.info(`Match result reported: ${match.MatchID} - Winner: ${winner} (${team1Score}-${team2Score}) by ${userID}`);
      res.json({
        message: 'Match result reported successfully',
        match: {
          MatchID: match.MatchID,
          Status: 'Completed',
          Winner: winner,
          Team1Score: team1Score,
          Team2Score: team2Score
        }
      });
    } catch (error) {
      logger.error('Error reporting match result:', error);
      res.status(500).json({ error: 'Failed to report match result' });
    }
  }
);

// Start match (admin or team captains)
router.put('/:id/start',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const matchId = req.params.id;
      const userID = req.user.userID;

      // Get match details
      const matches = await airtableService.getMatches();
      const match = matches.find(m => m.MatchID === matchId);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      if (match.Status !== 'Scheduled') {
        return res.status(400).json({ error: 'Match can only be started from Scheduled status' });
      }

      // Get user's record to check permissions
      const userRecord = await airtableService.getUserByID(userID);
      if (!userRecord) {
        return res.status(400).json({ error: 'User record not found' });
      }

      // For now, allow any authenticated user to start a match
      // In production, you'd want more strict controls
      const isAdmin = userRecord.IsAdmin;
      if (!isAdmin) {
        // Could add team captain checks here
      }

      // Update match status
      await airtableService.updateMatch(match.recordId, {
        Status: 'In Progress',
        StartedAt: new Date().toISOString(),
        StartedBy: userID
      });

      logger.info(`Match started: ${match.MatchID} by ${userID}`);
      res.json({
        message: 'Match started successfully',
        match: {
          MatchID: match.MatchID,
          Status: 'In Progress',
          StartedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error starting match:', error);
      res.status(500).json({ error: 'Failed to start match' });
    }
  }
);

// Get specific match details
router.get('/:id',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const matches = await airtableService.getMatches();
      const match = matches.find(m => m.MatchID === req.params.id);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      res.json(match);
    } catch (error) {
      logger.error('Error getting match:', error);
      res.status(500).json({ error: 'Failed to retrieve match' });
    }
  }
);

// Admin: Delete match
router.delete('/:id',
  requireAdmin,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const matches = await airtableService.getMatches();
      const match = matches.find(m => m.MatchID === req.params.id);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      await airtableService.deleteMatch(match.recordId);

      logger.info(`Match deleted: ${match.MatchID} by admin ${req.user.userID}`);
      res.json({ message: 'Match deleted successfully' });
    } catch (error) {
      logger.error('Error deleting match:', error);
      res.status(500).json({ error: 'Failed to delete match' });
    }
  }
);

module.exports = router;