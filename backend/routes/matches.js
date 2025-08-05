const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Create matches table if it doesn't exist
router.get('/setup-tables', async (req, res) => {
  try {
    await postgresService.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id VARCHAR(255) UNIQUE NOT NULL,
        tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        team1_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        team2_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        round VARCHAR(100) NOT NULL,
        match_type VARCHAR(50) NOT NULL CHECK (match_type IN ('Group Stage', 'Quarter Final', 'Semi Final', 'Grand Final', 'Lower Bracket')),
        status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
        scheduled_time TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        winner VARCHAR(10) CHECK (winner IN ('team1', 'team2')),
        team1_score INTEGER DEFAULT 0,
        team2_score INTEGER DEFAULT 0,
        game_length INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id),
        started_by UUID REFERENCES users(id),
        reported_by UUID REFERENCES users(id)
      )
    `);

    await postgresService.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id)
    `);
    await postgresService.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(team1_id, team2_id)
    `);
    await postgresService.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)
    `);

    res.json({ message: 'Matches table created successfully' });
  } catch (error) {
    logger.error('Error setting up matches table:', error);
    res.status(500).json({ error: 'Failed to setup matches table' });
  }
});

// Get all matches
router.get('/', async (req, res) => {
  try {
    const matchesQuery = `
      SELECT 
        m.*,
        t.name as tournament_name,
        t1.team_name as team1_name,
        t2.team_name as team2_name,
        u1.discord_username as created_by_username,
        u2.discord_username as started_by_username,
        u3.discord_username as reported_by_username
      FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN users u1 ON m.created_by = u1.id
      LEFT JOIN users u2 ON m.started_by = u2.id
      LEFT JOIN users u3 ON m.reported_by = u3.id
      ORDER BY m.created_at DESC
    `;
    
    const result = await postgresService.query(matchesQuery);
    logger.info(`Retrieved ${result.rows.length} matches`);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting matches:', error);
    res.status(500).json({ error: 'Failed to retrieve matches' });
  }
});

// Get matches for a specific tournament
router.get('/tournament/:tournamentId', 
  [param('tournamentId').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;

      // Get tournament
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Get matches for this tournament
      const matchesQuery = `
        SELECT 
          m.*,
          t1.team_name as team1_name,
          t1.team_id as team1_ref_id,
          t2.team_name as team2_name,
          t2.team_id as team2_ref_id,
          u1.discord_username as created_by_username,
          u2.discord_username as started_by_username,
          u3.discord_username as reported_by_username
        FROM matches m
        JOIN teams t1 ON m.team1_id = t1.id
        JOIN teams t2 ON m.team2_id = t2.id
        LEFT JOIN users u1 ON m.created_by = u1.id
        LEFT JOIN users u2 ON m.started_by = u2.id
        LEFT JOIN users u3 ON m.reported_by = u3.id
        WHERE m.tournament_id = $1
        ORDER BY m.created_at ASC
      `;
      
      const matchesResult = await postgresService.query(matchesQuery, [tournament.id]);
      
      logger.info(`Retrieved ${matchesResult.rows.length} matches for tournament ${tournamentId}`);
      res.json({
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        matches: matchesResult.rows
      });
    } catch (error) {
      logger.error('Error getting tournament matches:', error);
      res.status(500).json({ error: 'Failed to retrieve tournament matches' });
    }
  }
);

// Create new match (admin only)
router.post('/',
  requireAuth,
  [
    body('tournamentId').notEmpty(),
    body('team1Id').isUUID().withMessage('Team 1 ID must be a valid UUID'),
    body('team2Id').isUUID().withMessage('Team 2 ID must be a valid UUID'),
    body('round').notEmpty().trim(),
    body('matchType').isIn(['Group Stage', 'Quarter Final', 'Semi Final', 'Grand Final', 'Lower Bracket']),
    body('scheduledTime').optional().isISO8601().toDate()
  ],
  async (req, res) => {
    try {
      // Check if user is admin
      const isAdmin = req.user.role === 'admin' || req.user.isAdmin || 
                     (req.user.discord_username && req.user.discord_username.toLowerCase().includes('admin'));
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId, team1Id, team2Id, round, matchType, scheduledTime } = req.body;
      const userId = req.user.id || req.user.userID;

      if (team1Id === team2Id) {
        return res.status(400).json({ error: 'Teams must be different' });
      }

      // Validate tournament exists
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Validate teams exist and are registered for this tournament
      const teamsQuery = `
        SELECT t.*, tr.checked_in, tr.status as registration_status
        FROM teams t
        JOIN tournament_registrations tr ON t.id = tr.team_id
        WHERE tr.tournament_id = $1 AND t.team_id IN ($2, $3)
      `;
      const teamsResult = await postgresService.query(teamsQuery, [tournament.id, team1Id, team2Id]);

      if (teamsResult.rows.length !== 2) {
        return res.status(404).json({ error: 'One or both teams not found in tournament' });
      }

      const team1 = teamsResult.rows.find(t => t.team_id === team1Id);
      const team2 = teamsResult.rows.find(t => t.team_id === team2Id);

      // Check teams are registered and checked in
      if (team1.registration_status !== 'registered' || !team1.checked_in) {
        return res.status(400).json({ error: `Team ${team1.team_name} must be registered and checked in` });
      }
      if (team2.registration_status !== 'registered' || !team2.checked_in) {
        return res.status(400).json({ error: `Team ${team2.team_name} must be registered and checked in` });
      }

      // Generate unique match ID
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create match
      const insertQuery = `
        INSERT INTO matches 
        (match_id, tournament_id, team1_id, team2_id, round, match_type, scheduled_time, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const insertResult = await postgresService.query(insertQuery, [
        matchId,
        tournament.id,
        team1.id,
        team2.id,
        round,
        matchType,
        scheduledTime || null,
        userId
      ]);

      const match = insertResult.rows[0];

      logger.info(`Match created: ${match.match_id} - ${team1.team_name} vs ${team2.team_name}`);
      
      res.status(201).json({
        message: 'Match created successfully',
        match: {
          id: match.id,
          match_id: match.match_id,
          tournament_id: tournamentId,
          team1_id: team1Id,
          team1_name: team1.team_name,
          team2_id: team2Id,
          team2_name: team2.team_name,
          round: match.round,
          match_type: match.match_type,
          status: match.status,
          scheduled_time: match.scheduled_time,
          created_at: match.created_at
        }
      });
    } catch (error) {
      logger.error('Error creating match:', error);
      res.status(500).json({ error: 'Failed to create match' });
    }
  }
);

// Update match result
router.put('/:matchId/result',
  requireAuth,
  [
    param('matchId').notEmpty(),
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

      const { matchId } = req.params;
      const { winner, team1Score, team2Score, gameLength, notes } = req.body;
      const userId = req.user.id || req.user.userID;

      // Get match details with teams and captains
      const matchQuery = `
        SELECT 
          m.*,
          t1.team_name as team1_name,
          t1.captain_id as team1_captain_id,
          t2.team_name as team2_name,
          t2.captain_id as team2_captain_id
        FROM matches m
        JOIN teams t1 ON m.team1_id = t1.id
        JOIN teams t2 ON m.team2_id = t2.id
        WHERE m.match_id = $1
      `;
      const matchResult = await postgresService.query(matchQuery, [matchId]);

      if (matchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const match = matchResult.rows[0];

      // Check if match is in correct status
      if (match.status !== 'In Progress' && match.status !== 'Scheduled') {
        return res.status(400).json({ error: 'Match cannot be updated in current status' });
      }

      // Check permissions - admin or team captain
      const isAdmin = req.user.role === 'admin';
      const isTeam1Captain = match.team1_captain_id === userId;
      const isTeam2Captain = match.team2_captain_id === userId;

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
      const updateQuery = `
        UPDATE matches 
        SET status = 'Completed', 
            winner = $2, 
            team1_score = $3, 
            team2_score = $4, 
            game_length = $5,
            notes = $6,
            completed_at = NOW(), 
            reported_by = $7
        WHERE match_id = $1
        RETURNING *
      `;

      const updateResult = await postgresService.query(updateQuery, [
        matchId, winner, team1Score, team2Score, gameLength || null, notes || null, userId
      ]);

      const updatedMatch = updateResult.rows[0];

      logger.info(`Match result reported: ${matchId} - Winner: ${winner} (${team1Score}-${team2Score}) by ${userId}`);
      res.json({
        message: 'Match result reported successfully',
        match: {
          match_id: updatedMatch.match_id,
          status: updatedMatch.status,
          winner: updatedMatch.winner,
          team1_score: updatedMatch.team1_score,
          team2_score: updatedMatch.team2_score,
          completed_at: updatedMatch.completed_at
        }
      });
    } catch (error) {
      logger.error('Error reporting match result:', error);
      res.status(500).json({ error: 'Failed to report match result' });
    }
  }
);

// Start match (admin or team captains)
router.put('/:matchId/start',
  requireAuth,
  [param('matchId').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId } = req.params;
      const userId = req.user.id || req.user.userID;

      // Get match details
      const matchQuery = `
        SELECT 
          m.*,
          t1.team_name as team1_name,
          t1.captain_id as team1_captain_id,
          t2.team_name as team2_name,
          t2.captain_id as team2_captain_id
        FROM matches m
        JOIN teams t1 ON m.team1_id = t1.id
        JOIN teams t2 ON m.team2_id = t2.id
        WHERE m.match_id = $1
      `;
      const matchResult = await postgresService.query(matchQuery, [matchId]);

      if (matchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const match = matchResult.rows[0];

      if (match.status !== 'Scheduled') {
        return res.status(400).json({ error: 'Match can only be started from Scheduled status' });
      }

      // Check permissions - admin or team captain
      const isAdmin = req.user.role === 'admin';
      const isTeam1Captain = match.team1_captain_id === userId;
      const isTeam2Captain = match.team2_captain_id === userId;

      if (!isAdmin && !isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only team captains or admins can start matches' });
      }

      // Update match status
      const updateQuery = `
        UPDATE matches 
        SET status = 'In Progress', started_at = NOW(), started_by = $2
        WHERE match_id = $1
        RETURNING *
      `;
      const updateResult = await postgresService.query(updateQuery, [matchId, userId]);
      const updatedMatch = updateResult.rows[0];

      logger.info(`Match started: ${matchId} by ${userId}`);
      res.json({
        message: 'Match started successfully',
        match: {
          match_id: updatedMatch.match_id,
          status: updatedMatch.status,
          started_at: updatedMatch.started_at
        }
      });
    } catch (error) {
      logger.error('Error starting match:', error);
      res.status(500).json({ error: 'Failed to start match' });
    }
  }
);

// Get specific match details
router.get('/:matchId',
  [param('matchId').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId } = req.params;

      const matchQuery = `
        SELECT 
          m.*,
          t.name as tournament_name,
          t1.team_name as team1_name,
          t1.team_id as team1_ref_id,
          t2.team_name as team2_name,
          t2.team_id as team2_ref_id,
          u1.discord_username as created_by_username,
          u2.discord_username as started_by_username,
          u3.discord_username as reported_by_username
        FROM matches m
        JOIN tournaments t ON m.tournament_id = t.id
        JOIN teams t1 ON m.team1_id = t1.id
        JOIN teams t2 ON m.team2_id = t2.id
        LEFT JOIN users u1 ON m.created_by = u1.id
        LEFT JOIN users u2 ON m.started_by = u2.id
        LEFT JOIN users u3 ON m.reported_by = u3.id
        WHERE m.match_id = $1
      `;
      const matchResult = await postgresService.query(matchQuery, [matchId]);

      if (matchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      res.json(matchResult.rows[0]);
    } catch (error) {
      logger.error('Error getting match:', error);
      res.status(500).json({ error: 'Failed to retrieve match' });
    }
  }
);

// Admin: Delete match
router.delete('/:matchId',
  requireAuth,
  [param('matchId').notEmpty()],
  async (req, res) => {
    try {
      // Check if user is admin
      const isAdmin = req.user.role === 'admin' || req.user.isAdmin || 
                     (req.user.discord_username && req.user.discord_username.toLowerCase().includes('admin'));
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId } = req.params;

      // Check if match exists
      const checkQuery = `SELECT * FROM matches WHERE match_id = $1`;
      const checkResult = await postgresService.query(checkQuery, [matchId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Delete match
      const deleteQuery = `DELETE FROM matches WHERE match_id = $1`;
      await postgresService.query(deleteQuery, [matchId]);

      logger.info(`Match deleted: ${matchId} by admin ${req.user.discord_username}`);
      res.json({ message: 'Match deleted successfully' });
    } catch (error) {
      logger.error('Error deleting match:', error);
      res.status(500).json({ error: 'Failed to delete match' });
    }
  }
);

// Generate tournament bracket (admin only)
router.post('/tournament/:tournamentId/generate',
  requireAuth,
  [
    param('tournamentId').notEmpty(),
    body('teams').isArray({ min: 2 }).withMessage('At least 2 teams required')
  ],
  async (req, res) => {
    try {
      // Check if user is admin
      const isAdmin = req.user.role === 'admin' || req.user.isAdmin || 
                     (req.user.discord_username && req.user.discord_username.toLowerCase().includes('admin'));
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId } = req.params;
      const { teams } = req.body;
      const userId = req.user.id || req.user.userID;

      // Validate tournament exists
      const tournamentQuery = `SELECT * FROM tournaments WHERE tournament_id = $1`;
      const tournamentResult = await postgresService.query(tournamentQuery, [tournamentId]);
      
      if (tournamentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const tournament = tournamentResult.rows[0];

      // Check if matches already exist for this tournament
      const existingMatchesQuery = `SELECT COUNT(*) as count FROM matches WHERE tournament_id = $1`;
      const existingResult = await postgresService.query(existingMatchesQuery, [tournament.id]);
      
      if (parseInt(existingResult.rows[0].count) > 0) {
        return res.status(400).json({ error: 'Matches already exist for this tournament. Delete existing matches first.' });
      }

      // Validate all teams are checked in and registered
      const teamIds = teams.map(team => team.team_id);
      const teamsQuery = `
        SELECT t.*, tr.checked_in, tr.status as registration_status
        FROM teams t
        JOIN tournament_registrations tr ON t.id = tr.team_id
        WHERE tr.tournament_id = $1 AND t.team_id = ANY($2::text[])
      `;
      const teamsResult = await postgresService.query(teamsQuery, [tournament.id, teamIds]);

      if (teamsResult.rows.length !== teams.length) {
        return res.status(400).json({ error: 'Some teams are not registered for this tournament' });
      }

      // Check all teams are checked in
      const notCheckedIn = teamsResult.rows.filter(team => !team.checked_in);
      if (notCheckedIn.length > 0) {
        return res.status(400).json({ 
          error: `The following teams must check in first: ${notCheckedIn.map(t => t.team_name).join(', ')}` 
        });
      }

      // Generate bracket matches
      const generatedMatches = generateBracketMatches(teamsResult.rows, tournament.bracket_type);
      
      // Insert all matches into database
      const insertedMatches = [];
      for (const match of generatedMatches) {
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const insertQuery = `
          INSERT INTO matches 
          (match_id, tournament_id, team1_id, team2_id, round, match_type, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const insertResult = await postgresService.query(insertQuery, [
          matchId,
          tournament.id,
          match.team1_id,
          match.team2_id || null,
          match.round,
          match.match_type,
          userId
        ]);

        insertedMatches.push(insertResult.rows[0]);
      }

      logger.info(`Generated ${insertedMatches.length} matches for tournament ${tournamentId}`);
      
      res.status(201).json({
        message: `Successfully generated ${insertedMatches.length} matches for tournament bracket`,
        matches: insertedMatches.map(match => ({
          id: match.id,
          match_id: match.match_id,
          round: match.round,
          match_type: match.match_type,
          status: match.status,
          created_at: match.created_at
        }))
      });
    } catch (error) {
      logger.error('Error generating tournament bracket:', error);
      res.status(500).json({ error: 'Failed to generate tournament bracket' });
    }
  }
);

// Helper function to generate bracket matches
function generateBracketMatches(teams, bracketType = 'Single Elimination') {
  const matches = [];
  const teamCount = teams.length;
  
  if (teamCount < 2) {
    throw new Error('At least 2 teams required for bracket generation');
  }

  // For single elimination, create bracket structure
  const rounds = Math.ceil(Math.log2(teamCount));
  let currentRoundTeams = [...teams];
  
  // Shuffle teams for random seeding
  for (let i = currentRoundTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentRoundTeams[i], currentRoundTeams[j]] = [currentRoundTeams[j], currentRoundTeams[i]];
  }
  
  for (let round = 1; round <= rounds; round++) {
    const roundName = getRoundName(round, rounds);
    const matchType = getMatchType(round, rounds);
    const matchesInRound = Math.ceil(currentRoundTeams.length / 2);
    
    for (let i = 0; i < matchesInRound; i++) {
      const team1 = currentRoundTeams[i * 2];
      const team2 = currentRoundTeams[i * 2 + 1] || null; // Bye if odd number
      
      matches.push({
        round: roundName,
        match_type: matchType,
        team1_id: team1.id,
        team2_id: team2?.id || null,
        position: i + 1
      });
    }
    
    // For next round, assume winners advance (will be updated when matches complete)
    currentRoundTeams = currentRoundTeams.slice(0, Math.ceil(currentRoundTeams.length / 2));
  }
  
  return matches;
}

function getRoundName(round, totalRounds) {
  if (round === totalRounds) return 'Final';
  if (round === totalRounds - 1) return 'Semi-Final';
  if (round === totalRounds - 2) return 'Quarter-Final';
  return `Round ${round}`;
}

function getMatchType(round, totalRounds) {
  if (round === totalRounds) return 'Grand Final';
  if (round === totalRounds - 1) return 'Semi Final';
  if (round === totalRounds - 2) return 'Quarter Final';
  return 'Group Stage';
}

module.exports = router;