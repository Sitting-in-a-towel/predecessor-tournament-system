const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get bracket data for a tournament
router.get('/tournaments/:tournamentId/bracket',
  [param('tournamentId').isUUID()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;

      // Get tournament info first
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Get bracket data
      const bracketQuery = `
        SELECT tb.*,
               u.discord_username as created_by_username
        FROM tournament_brackets tb
        LEFT JOIN users u ON tb.created_by = u.id
        WHERE tb.tournament_id = $1
      `;
      const bracketResult = await postgresService.query(bracketQuery, [tournament.id]);

      // Get matches
      const matchesQuery = `
        SELECT bm.*,
               t1.team_name as team1_name,
               t1.team_id as team1_ref_id,
               t2.team_name as team2_name, 
               t2.team_id as team2_ref_id,
               winner.team_name as winner_name,
               winner.team_id as winner_ref_id
        FROM bracket_matches bm
        LEFT JOIN teams t1 ON bm.team1_id = t1.id
        LEFT JOIN teams t2 ON bm.team2_id = t2.id
        LEFT JOIN teams winner ON bm.winner_id = winner.id
        WHERE bm.tournament_id = $1
        ORDER BY bm.round_number, bm.match_number
      `;
      const matchesResult = await postgresService.query(matchesQuery, [tournament.id]);

      res.json({
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        bracket: bracketResult.rows[0] || null,
        matches: matchesResult.rows,
        has_bracket_data: bracketResult.rows.length > 0
      });

    } catch (error) {
      logger.error('Error getting bracket data:', error);
      res.status(500).json({ error: 'Failed to get bracket data' });
    }
  }
);

// Save bracket data
router.post('/tournaments/:tournamentId/bracket',
  (req, res, next) => {
    logger.info(`Bracket save attempt - Session: ${req.sessionID}, Auth: ${req.isAuthenticated?.()}, User: ${req.user?.discord_username || 'none'}`);
    requireAuth(req, res, next);
  },
  [
    param('tournamentId').isUUID(),
    body('bracketData').isObject(),
    body('lockedSlots').optional().isArray(),
    body('isPublished').optional().isBoolean(),
    body('seedingMode').optional().isIn(['random', 'manual']),
    body('seriesLength').optional().isInt({ min: 1, max: 7 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;
      const { 
        bracketData, 
        lockedSlots = [], 
        isPublished = false, 
        seedingMode = 'random',
        seriesLength = 1 
      } = req.body;

      // Debug logging
      logger.info(`Bracket save request - isPublished received: ${isPublished} (type: ${typeof isPublished})`);

      // Get tournament info
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Get user UUID
      const userUUID = req.user.id;

      // Upsert bracket data
      const upsertQuery = `
        INSERT INTO tournament_brackets (
          tournament_id, bracket_data, locked_slots, is_published, 
          seeding_mode, series_length, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tournament_id) 
        DO UPDATE SET 
          bracket_data = $2,
          locked_slots = $3,
          is_published = $4,
          seeding_mode = $5,
          series_length = $6,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const upsertResult = await postgresService.query(upsertQuery, [
        tournament.id,
        JSON.stringify(bracketData),
        JSON.stringify(lockedSlots),
        isPublished,
        seedingMode,
        seriesLength,
        userUUID
      ]);

      logger.info(`Bracket data saved for tournament ${tournamentId} by ${req.user.discord_username}`);

      res.json({
        message: 'Bracket data saved successfully',
        bracket: upsertResult.rows[0],
        tournament_id: tournamentId
      });

    } catch (error) {
      logger.error('Error saving bracket data:', error);
      res.status(500).json({ error: 'Failed to save bracket data' });
    }
  }
);

// Save individual match result
router.post('/tournaments/:tournamentId/bracket/matches/:matchId',
  requireAuth,
  [
    param('tournamentId').isUUID(),
    param('matchId').notEmpty(),
    body('team1_score').optional().isInt({ min: 0 }),
    body('team2_score').optional().isInt({ min: 0 }),
    body('winner_id').optional().notEmpty(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId, matchId } = req.params;
      const { team1_score, team2_score, winner_id, status } = req.body;

      // Get tournament info
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Convert winner_id to UUID if it's a team_id string
      let winnerUUID = null;
      if (winner_id) {
        const teamQuery = `SELECT id FROM teams WHERE team_id = $1`;
        const teamResult = await postgresService.query(teamQuery, [winner_id]);
        if (teamResult.rows.length > 0) {
          winnerUUID = teamResult.rows[0].id;
        }
      }

      // Update match result
      const updateQuery = `
        UPDATE bracket_matches
        SET team1_score = COALESCE($1, team1_score),
            team2_score = COALESCE($2, team2_score),
            winner_id = COALESCE($3, winner_id),
            status = COALESCE($4, status),
            completed_time = CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_time END,
            updated_at = CURRENT_TIMESTAMP
        WHERE tournament_id = $5 AND match_identifier = $6
        RETURNING *
      `;

      const updateResult = await postgresService.query(updateQuery, [
        team1_score,
        team2_score, 
        winnerUUID,
        status,
        tournament.id,
        matchId
      ]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      logger.info(`Match ${matchId} updated for tournament ${tournamentId} by ${req.user.discord_username}`);

      res.json({
        message: 'Match result saved successfully',
        match: updateResult.rows[0]
      });

    } catch (error) {
      logger.error('Error saving match result:', error);
      res.status(500).json({ error: 'Failed to save match result' });
    }
  }
);

// Delete bracket data (admin only)
router.delete('/tournaments/:tournamentId/bracket',
  requireAuth,
  [param('tournamentId').isUUID()],
  async (req, res) => {
    try {
      // Check if user is admin
      if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { tournamentId } = req.params;

      // Get tournament info
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Delete bracket data (cascades to matches)
      await postgresService.query(
        'DELETE FROM tournament_brackets WHERE tournament_id = $1',
        [tournament.id]
      );

      logger.info(`Bracket data deleted for tournament ${tournamentId} by ${req.user.discord_username}`);

      res.json({ message: 'Bracket data deleted successfully' });

    } catch (error) {
      logger.error('Error deleting bracket data:', error);
      res.status(500).json({ error: 'Failed to delete bracket data' });
    }
  }
);

module.exports = router;