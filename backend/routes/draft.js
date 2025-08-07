const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get draft sessions (optionally filtered by tournament)
router.get('/', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    
    let query = `
      SELECT DISTINCT
        ds.*,
        t1.team_name as team1_name,
        t2.team_name as team2_name,
        t1.team_id as team1_id,
        t2.team_id as team2_id,
        u1.discord_username as team1_captain_name,
        u2.discord_username as team2_captain_name
      FROM draft_sessions ds
      LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id
      LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id
      LEFT JOIN users u1 ON ds.team1_captain_id = u1.id
      LEFT JOIN users u2 ON ds.team2_captain_id = u2.id
    `;
    
    // If tournamentId provided, filter by teams in that tournament
    if (tournamentId) {
      query += `
        WHERE EXISTS (
          SELECT 1 FROM tournament_registrations tr
          WHERE tr.tournament_id = $1
          AND (tr.team_id = t1.id OR tr.team_id = t2.id)
        )
      `;
    }
    
    query += ` ORDER BY ds.created_at DESC`;
    
    const result = tournamentId 
      ? await postgresService.query(query, [tournamentId])
      : await postgresService.query(query);
    
    logger.info(`Retrieved ${result.rows.length} draft sessions${tournamentId ? ` for tournament ${tournamentId}` : ''}`);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting draft sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve draft sessions' });
  }
});

// Create new draft session for tournament teams
router.post('/',
  requireAuth,  // Changed from requireAdmin to allow team captains
  [
    body('tournamentId').isUUID(),
    body('team1Id').isUUID(),
    body('team2Id').isUUID()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournamentId, team1Id, team2Id } = req.body;

      logger.info(`Creating draft - Tournament: ${tournamentId}, Team1: ${team1Id}, Team2: ${team2Id}`);

      // Validate tournament exists
      const tournamentResult = await postgresService.query(
        'SELECT * FROM tournaments WHERE id = $1', 
        [tournamentId]
      );
      if (tournamentResult.rows.length === 0) {
        logger.error(`Tournament not found: ${tournamentId}`);
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Frontend sends registration IDs, not team IDs - handle dual ID system
      // Query joins tournament_registrations to get the actual team
      // tr.team_id is UUID referencing teams.id (not teams.team_id which is string)
      const team1Result = await postgresService.query(`
        SELECT t.* FROM teams t
        INNER JOIN tournament_registrations tr ON t.id = tr.team_id
        WHERE tr.id = $1
      `, [team1Id]);
      
      const team2Result = await postgresService.query(`
        SELECT t.* FROM teams t
        INNER JOIN tournament_registrations tr ON t.id = tr.team_id
        WHERE tr.id = $1
      `, [team2Id]);
      
      logger.info(`Team1 query result: ${team1Result.rows.length} rows`);
      logger.info(`Team2 query result: ${team2Result.rows.length} rows`);
      
      if (team1Result.rows.length === 0 || team2Result.rows.length === 0) {
        logger.error(`Teams not found - Team1: ${team1Id} (${team1Result.rows.length}), Team2: ${team2Id} (${team2Result.rows.length})`);
        return res.status(404).json({ error: 'One or both teams not found' });
      }

      const team1 = team1Result.rows[0];
      const team2 = team2Result.rows[0];
      
      // Check authorization - must be admin or captain of one of the teams
      const isUserAdmin = req.user.isAdmin || false;
      const isTeam1Captain = team1.captain_id === req.user.id;
      const isTeam2Captain = team2.captain_id === req.user.id;
      
      if (!isUserAdmin && !isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only admins or team captains can create drafts' });
      }

      // Check if a draft already exists for these teams (only active drafts)
      const existingDraft = await postgresService.query(`
        SELECT * FROM draft_sessions 
        WHERE ((team1_captain_id = $1 AND team2_captain_id = $2) 
           OR (team1_captain_id = $2 AND team2_captain_id = $1))
           AND status IN ('Waiting', 'In Progress')
      `, [team1.captain_id, team2.captain_id]);
      
      if (existingDraft.rows.length > 0) {
        logger.warn(`Active draft already exists for teams ${team1.team_name} vs ${team2.team_name}`);
        return res.status(409).json({ 
          error: 'A draft session already exists for this match',
          existingDraft: existingDraft.rows[0].draft_id
        });
      }

      // Create draft session using existing schema
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await postgresService.query(`
        INSERT INTO draft_sessions (
          draft_id, team1_captain_id, team2_captain_id, 
          status, current_phase, current_turn, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        draftId,
        team1.captain_id,
        team2.captain_id,
        'Waiting',
        'Coin Toss',
        'team1',
        req.user.id || req.user.userID
      ]);

      const draft = result.rows[0];
      
      // Generate access links
      const team1Link = `${process.env.FRONTEND_URL}/draft/${draftId}?captain=1&token=${generateCaptainToken(draftId, '1')}`;
      const team2Link = `${process.env.FRONTEND_URL}/draft/${draftId}?captain=2&token=${generateCaptainToken(draftId, '2')}`;
      const spectatorLink = `${process.env.FRONTEND_URL}/draft/${draftId}/spectate`;

      logger.info(`Draft session created: ${draftId} for teams ${team1.team_id} vs ${team2.team_id}`);
      
      res.status(201).json({
        ...draft,
        team1_name: team1.team_name,
        team2_name: team2.team_name,
        team1Link,
        team2Link,
        spectatorLink
      });
    } catch (error) {
      logger.error('Error creating draft session:', error);
      res.status(500).json({ error: 'Failed to create draft session' });
    }
  }
);

// Get specific draft session
router.get('/:id',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await postgresService.query(`
        SELECT 
          ds.*,
          t1.team_id as team1_name,
          t2.team_id as team2_name,
          u1.user_id as team1_captain_name,
          u2.user_id as team2_captain_name
        FROM draft_sessions ds
        LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id
        LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id
        LEFT JOIN users u1 ON ds.team1_captain_id = u1.id
        LEFT JOIN users u2 ON ds.team2_captain_id = u2.id
        WHERE ds.draft_id = $1
      `, [req.params.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      const draft = result.rows[0];
      
      // Parse JSON fields if they exist
      if (draft.team1_picks) draft.team1_picks = JSON.parse(draft.team1_picks);
      if (draft.team2_picks) draft.team2_picks = JSON.parse(draft.team2_picks);
      if (draft.team1_bans) draft.team1_bans = JSON.parse(draft.team1_bans);
      if (draft.team2_bans) draft.team2_bans = JSON.parse(draft.team2_bans);
      if (draft.pick_order) draft.pick_order = JSON.parse(draft.pick_order);
      if (draft.ban_order) draft.ban_order = JSON.parse(draft.ban_order);

      res.json(draft);
    } catch (error) {
      logger.error('Error getting draft session:', error);
      res.status(500).json({ error: 'Failed to retrieve draft session' });
    }
  }
);

// Perform coin toss
router.post('/:id/coin-toss',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const userID = req.user.userID;

      // Get draft session
      const drafts = await airtableService.getDraftSessions();
      const draft = drafts.find(d => d.DraftID === draftId);

      if (!draft) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      // Check if user is one of the captains or admin
      const userRecord = await airtableService.getUserByID(userID);
      const isCaptain = draft.Team1Captain?.includes(userRecord.recordId) || 
                       draft.Team2Captain?.includes(userRecord.recordId);
      const isAdmin = userRecord.IsAdmin;

      if (!isCaptain && !isAdmin) {
        return res.status(403).json({ error: 'Only captains or admins can perform coin toss' });
      }

      if (draft.Status !== 'Waiting' || draft.CurrentPhase !== 'Coin Toss') {
        return res.status(400).json({ error: 'Coin toss not available in current phase' });
      }

      // Perform coin toss
      const coinResult = Math.random() < 0.5 ? 'team1' : 'team2';
      const winner = coinResult;
      const firstPick = winner;

      // Default pick/ban order (team with first pick bans second)
      const pickOrder = firstPick === 'team1' ? 
        ['team1', 'team2', 'team2', 'team1', 'team1'] :
        ['team2', 'team1', 'team1', 'team2', 'team2'];
      
      const banOrder = firstPick === 'team1' ?
        ['team1', 'team2', 'team1', 'team2'] :
        ['team2', 'team1', 'team2', 'team1'];

      // Update draft session
      const updates = {
        Status: 'In Progress',
        CurrentPhase: 'Ban Phase',
        CurrentTurn: banOrder[0],
        CoinTossWinner: winner,
        FirstPick: firstPick,
        PickOrder: JSON.stringify(pickOrder),
        BanOrder: JSON.stringify(banOrder),
        StartTime: new Date().toISOString()
      };

      await airtableService.updateDraftSession(draftId, updates);

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('coin-toss-result', {
          winner,
          firstPick,
          pickOrder,
          banOrder,
          currentPhase: 'Ban Phase',
          currentTurn: banOrder[0]
        });
      }

      logger.info(`Coin toss performed in draft ${draftId}: winner=${winner}, firstPick=${firstPick}`);
      res.json({
        winner,
        firstPick,
        pickOrder,
        banOrder,
        currentPhase: 'Ban Phase',
        currentTurn: banOrder[0]
      });
    } catch (error) {
      logger.error('Error performing coin toss:', error);
      res.status(500).json({ error: 'Failed to perform coin toss' });
    }
  }
);

// Perform draft action (pick or ban)
router.post('/:id/action',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('action').isIn(['pick', 'ban']),
    body('heroID').isLength({ min: 1 }).trim(),
    body('team').isIn(['team1', 'team2'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const { action, heroID, team } = req.body;
      const userID = req.user.userID;

      // Get draft session
      const drafts = await airtableService.getDraftSessions();
      const draft = drafts.find(d => d.DraftID === draftId);

      if (!draft) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      // Check if user is the correct captain for this team
      const userRecord = await airtableService.getUserByID(userID);
      const isCorrectCaptain = (team === 'team1' && draft.Team1Captain?.includes(userRecord.recordId)) ||
                               (team === 'team2' && draft.Team2Captain?.includes(userRecord.recordId));
      const isAdmin = userRecord.IsAdmin;

      if (!isCorrectCaptain && !isAdmin) {
        return res.status(403).json({ error: 'Only the team captain can make picks/bans for their team' });
      }

      // Validate draft state
      if (draft.Status !== 'In Progress') {
        return res.status(400).json({ error: 'Draft is not in progress' });
      }

      // Check if it's this team's turn
      if (draft.CurrentTurn !== team) {
        return res.status(400).json({ error: 'It is not your team\'s turn' });
      }

      // Check if the action matches the current phase
      const validAction = (draft.CurrentPhase === 'Ban Phase' && action === 'ban') ||
                          (draft.CurrentPhase === 'Pick Phase' && action === 'pick');
      
      if (!validAction) {
        return res.status(400).json({ error: `Cannot ${action} during ${draft.CurrentPhase}` });
      }

      // Validate hero hasn't been picked/banned already
      const currentPicks = [
        ...JSON.parse(draft.Team1Picks || '[]'),
        ...JSON.parse(draft.Team2Picks || '[]')
      ];
      const currentBans = [
        ...JSON.parse(draft.Team1Bans || '[]'),
        ...JSON.parse(draft.Team2Bans || '[]')
      ];

      if (currentPicks.includes(heroID) || currentBans.includes(heroID)) {
        return res.status(400).json({ error: 'Hero has already been picked or banned' });
      }

      // Add the pick/ban
      const team1Picks = JSON.parse(draft.Team1Picks || '[]');
      const team2Picks = JSON.parse(draft.Team2Picks || '[]');
      const team1Bans = JSON.parse(draft.Team1Bans || '[]');
      const team2Bans = JSON.parse(draft.Team2Bans || '[]');

      if (action === 'pick') {
        if (team === 'team1') {
          team1Picks.push(heroID);
        } else {
          team2Picks.push(heroID);
        }
      } else {
        if (team === 'team1') {
          team1Bans.push(heroID);
        } else {
          team2Bans.push(heroID);
        }
      }

      // Determine next turn and phase
      const pickOrder = JSON.parse(draft.PickOrder || '[]');
      const banOrder = JSON.parse(draft.BanOrder || '[]');
      
      let nextPhase = draft.CurrentPhase;
      let nextTurn = draft.CurrentTurn;
      let draftComplete = false;

      if (draft.CurrentPhase === 'Ban Phase') {
        const totalBans = team1Bans.length + team2Bans.length;
        if (totalBans >= banOrder.length) {
          nextPhase = 'Pick Phase';
          nextTurn = pickOrder[0];
        } else {
          nextTurn = banOrder[totalBans];
        }
      } else if (draft.CurrentPhase === 'Pick Phase') {
        const totalPicks = team1Picks.length + team2Picks.length;
        if (totalPicks >= pickOrder.length) {
          nextPhase = 'Complete';
          nextTurn = null;
          draftComplete = true;
        } else {
          nextTurn = pickOrder[totalPicks];
        }
      }

      // Update draft session
      const updates = {
        Team1Picks: JSON.stringify(team1Picks),
        Team2Picks: JSON.stringify(team2Picks),
        Team1Bans: JSON.stringify(team1Bans),
        Team2Bans: JSON.stringify(team2Bans),
        CurrentPhase: nextPhase,
        CurrentTurn: nextTurn
      };

      if (draftComplete) {
        updates.Status = 'Completed';
        updates.CompletedAt = new Date().toISOString();
      }

      await airtableService.updateDraftSession(draftId, updates);

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('draft-action', {
          action,
          heroID,
          team,
          team1Picks,
          team2Picks,
          team1Bans,
          team2Bans,
          currentPhase: nextPhase,
          currentTurn: nextTurn,
          draftComplete
        });
      }

      logger.info(`Draft action in ${draftId}: ${team} ${action}ed ${heroID}`);
      res.json({
        action,
        heroID,
        team,
        team1Picks,
        team2Picks,
        team1Bans,
        team2Bans,
        currentPhase: nextPhase,
        currentTurn: nextTurn,
        draftComplete
      });
    } catch (error) {
      logger.error('Error performing draft action:', error);
      res.status(500).json({ error: 'Failed to perform draft action' });
    }
  }
);

// Get available heroes for draft
router.get('/heroes', async (req, res) => {
  try {
    const result = await postgresService.query(`
      SELECT id, name, role, image_url
      FROM heroes 
      ORDER BY role, name
    `);
    
    // Group heroes by role for easier frontend consumption
    const herosByRole = result.rows.reduce((acc, hero) => {
      if (!acc[hero.role]) {
        acc[hero.role] = [];
      }
      acc[hero.role].push(hero);
      return acc;
    }, {});
    
    res.json({
      heroes: result.rows,
      herosByRole
    });
  } catch (error) {
    logger.error('Error getting heroes:', error);
    res.status(500).json({ error: 'Failed to retrieve heroes' });
  }
});

// Admin: Emergency stop/reset draft
router.post('/:id/emergency-stop',
  requireAdmin,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;

      await airtableService.updateDraftSession(draftId, {
        Status: 'Stopped',
        StoppedAt: new Date().toISOString(),
        StoppedBy: req.user.userID
      });

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('draft-stopped', {
          reason: 'Emergency stop by admin'
        });
      }

      logger.info(`Draft ${draftId} emergency stopped by admin ${req.user.userID}`);
      res.json({ message: 'Draft stopped successfully' });
    } catch (error) {
      logger.error('Error stopping draft:', error);
      res.status(500).json({ error: 'Failed to stop draft' });
    }
  }
);

// Helper function to generate captain tokens
function generateCaptainToken(draftId, captainNumber) {
  // In production, use proper JWT or secure token generation
  return Buffer.from(`${draftId}-${captainNumber}-${Date.now()}`).toString('base64');
}

module.exports = router;


