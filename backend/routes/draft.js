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
    
    let query, params = [];
    
    if (tournamentId) {
      // Filter drafts by tournament - use specific team IDs when available
      query = `
        SELECT 
          ds.*,
          t1.team_name as team1_name,
          t2.team_name as team2_name,
          t1.team_id as team1_id_display,
          t2.team_id as team2_id_display,
          u1.discord_username as team1_captain_name,
          u2.discord_username as team2_captain_name
        FROM draft_sessions ds
        -- Join with tournament registrations (ds.team1_id is registration.id)
        LEFT JOIN tournament_registrations tr1 ON ds.team1_id = tr1.id
        LEFT JOIN tournament_registrations tr2 ON ds.team2_id = tr2.id
        -- Then join with teams to get team names
        LEFT JOIN teams t1 ON tr1.team_id = t1.id
        LEFT JOIN teams t2 ON tr2.team_id = t2.id
        LEFT JOIN users u1 ON ds.team1_captain_id = u1.user_id
        LEFT JOIN users u2 ON ds.team2_captain_id = u2.user_id
        WHERE 
          -- Filter by tournament through registrations
          (tr1.tournament_id = $1 OR tr2.tournament_id = $1)
        ORDER BY ds.created_at DESC
      `;
      params = [tournamentId];
    } else {
      // Get all drafts with team info
      query = `
        SELECT 
          ds.*,
          t1.team_name as team1_name,
          t2.team_name as team2_name,
          t1.team_id as team1_id_display,
          t2.team_id as team2_id_display,
          u1.discord_username as team1_captain_name,
          u2.discord_username as team2_captain_name
        FROM draft_sessions ds
        -- Join with tournament registrations (ds.team1_id is registration.id)
        LEFT JOIN tournament_registrations tr1 ON ds.team1_id = tr1.id
        LEFT JOIN tournament_registrations tr2 ON ds.team2_id = tr2.id
        -- Then join with teams to get team names
        LEFT JOIN teams t1 ON tr1.team_id = t1.id
        LEFT JOIN teams t2 ON tr2.team_id = t2.id
        LEFT JOIN users u1 ON ds.team1_captain_id = u1.user_id
        LEFT JOIN users u2 ON ds.team2_captain_id = u2.user_id
        ORDER BY ds.created_at DESC
      `;
    }
    
    const result = await postgresService.query(query, params);
    
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

      const { tournamentId, team1Id, team2Id, phoenixDraftId, draftConfig } = req.body;

      logger.info(`Creating draft - Tournament: ${tournamentId}, Team1: ${team1Id}, Team2: ${team2Id}, Phoenix: ${phoenixDraftId}`);

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
      // Also get the user_id string instead of the binary user.id for Phoenix compatibility
      const team1Result = await postgresService.query(`
        SELECT t.*, u.user_id as captain_user_id FROM teams t
        INNER JOIN tournament_registrations tr ON t.id = tr.team_id
        LEFT JOIN users u ON t.captain_id = u.id
        WHERE tr.id = $1
      `, [team1Id]);
      
      const team2Result = await postgresService.query(`
        SELECT t.*, u.user_id as captain_user_id FROM teams t
        INNER JOIN tournament_registrations tr ON t.id = tr.team_id
        LEFT JOIN users u ON t.captain_id = u.id
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
      
      logger.info(`Team1 captain_user_id: ${team1.captain_user_id}`);
      logger.info(`Team2 captain_user_id: ${team2.captain_user_id}`);
      
      // Check authorization - must be admin or captain of one of the teams
      const isUserAdmin = req.user.isAdmin || false;
      const userIdToCheck = req.user.userID || req.user.id;
      logger.info(`User ID to check: ${userIdToCheck}, isAdmin: ${isUserAdmin}`);
      const isTeam1Captain = team1.captain_user_id === userIdToCheck;
      const isTeam2Captain = team2.captain_user_id === userIdToCheck;
      
      if (!isUserAdmin && !isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only admins or team captains can create drafts' });
      }

      // Check if a draft already exists for these registration IDs (only active drafts)
      const existingDraft = await postgresService.query(`
        SELECT * FROM draft_sessions 
        WHERE ((team1_id = $1 AND team2_id = $2) 
           OR (team1_id = $2 AND team2_id = $1))
           AND status IN ('Waiting', 'In Progress')
      `, [team1Id, team2Id]);
      
      if (existingDraft.rows.length > 0) {
        logger.warn(`Active draft already exists for teams ${team1.team_name} vs ${team2.team_name}`);
        return res.status(409).json({ 
          error: 'A draft session already exists for this match',
          existingDraft: existingDraft.rows[0].draft_id
        });
      }

      // Create draft session using existing schema
      const draftId = phoenixDraftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get the user's binary UUID for created_by field
      let createdBy = null;
      if (req.user.id) {
        createdBy = req.user.id;  // Already a UUID
      } else if (req.user.userID) {
        // Look up UUID from string userID
        const userResult = await postgresService.query(
          'SELECT id FROM users WHERE user_id = $1',
          [req.user.userID]
        );
        createdBy = userResult.rows.length > 0 ? userResult.rows[0].id : null;
      }

      // Prepare timer configuration based on user settings
      const bonusTime = draftConfig?.bonusTime || 10;
      const timerConfig = {
        base_time: 20,  // Always 20 seconds base timer
        team1_extra_time: bonusTime,  // Initialize with bonus time
        team2_extra_time: bonusTime,  // Initialize with bonus time
        bonus_time_per_team: bonusTime,
        timer_strategy_enabled: draftConfig?.timerEnabled || false,
        timer_strategy: draftConfig?.timerStrategy || "20s per pick"
      };

      const result = await postgresService.query(`
        INSERT INTO draft_sessions (
          draft_id, team1_captain_id, team2_captain_id, 
          team1_id, team2_id,
          status, current_phase, current_turn, created_by, timer_config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        draftId,
        team1.captain_user_id,  // Use string user_id instead of binary user.id
        team2.captain_user_id,  // Use string user_id instead of binary user.id
        team1Id,  // Store registration IDs, not team UUIDs
        team2Id,  // Store registration IDs, not team UUIDs
        'Waiting',
        'Coin Toss',
        'team1',
        createdBy,  // Use proper UUID for created_by
        JSON.stringify(timerConfig)  // Timer configuration as JSON
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

      logger.info(`Looking up draft: ${req.params.id}`);
      
      // Get draft with team information - fixed JOIN to handle registration IDs
      const draftResult = await postgresService.query(`
        SELECT 
          ds.*,
          t1.team_name as team1_name,
          t2.team_name as team2_name,
          t1.team_id as team1_id_display,
          t2.team_id as team2_id_display,
          u1.discord_username as team1_captain_name,
          u2.discord_username as team2_captain_name
        FROM draft_sessions ds
        -- Join with tournament registrations (ds.team1_id is registration.id)
        LEFT JOIN tournament_registrations tr1 ON ds.team1_id = tr1.id
        LEFT JOIN tournament_registrations tr2 ON ds.team2_id = tr2.id
        -- Then join with teams to get team names
        LEFT JOIN teams t1 ON tr1.team_id = t1.id
        LEFT JOIN teams t2 ON tr2.team_id = t2.id
        LEFT JOIN users u1 ON ds.team1_captain_id = u1.user_id
        LEFT JOIN users u2 ON ds.team2_captain_id = u2.user_id
        WHERE ds.draft_id = $1
      `, [req.params.id]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }
      
      const finalResult = draftResult.rows[0];
      
      // Parse JSON fields if they exist and are strings
      try {
        if (finalResult.team1_picks && typeof finalResult.team1_picks === 'string') {
          finalResult.team1_picks = JSON.parse(finalResult.team1_picks);
        }
        if (finalResult.team2_picks && typeof finalResult.team2_picks === 'string') {
          finalResult.team2_picks = JSON.parse(finalResult.team2_picks);
        }
        if (finalResult.team1_bans && typeof finalResult.team1_bans === 'string') {
          finalResult.team1_bans = JSON.parse(finalResult.team1_bans);
        }
        if (finalResult.team2_bans && typeof finalResult.team2_bans === 'string') {
          finalResult.team2_bans = JSON.parse(finalResult.team2_bans);
        }
        if (finalResult.pick_order && typeof finalResult.pick_order === 'string') {
          finalResult.pick_order = JSON.parse(finalResult.pick_order);
        }
        if (finalResult.ban_order && typeof finalResult.ban_order === 'string') {
          finalResult.ban_order = JSON.parse(finalResult.ban_order);
        }
      } catch (jsonError) {
        logger.warn('Error parsing JSON fields:', jsonError);
      }

      res.json(finalResult);
    } catch (error) {
      logger.error('Error getting draft session:', error);
      res.status(500).json({ error: 'Failed to retrieve draft session' });
    }
  }
);

// Captain connects to draft (for coin toss detection)
router.post('/:id/connect',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const userId = req.user.id || req.user.userID;

      // Get draft session
      const draftResult = await postgresService.query(`
        SELECT ds.*, 
               t1.team_name as team1_name, t2.team_name as team2_name,
               t1.captain_id as team1_captain_id, t2.captain_id as team2_captain_id
        FROM draft_sessions ds
        LEFT JOIN teams t1_specific ON ds.team1_id = t1_specific.id
        LEFT JOIN teams t2_specific ON ds.team2_id = t2_specific.id
        LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id
        LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id
        WHERE ds.draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      const draft = draftResult.rows[0];
      
      // Check if user is one of the captains
      const isTeam1Captain = draft.team1_captain_id === userId;
      const isTeam2Captain = draft.team2_captain_id === userId;
      
      if (!isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only team captains can connect' });
      }

      if (draft.status !== 'Waiting' || draft.current_phase !== 'Coin Toss') {
        return res.status(400).json({ error: 'Not in coin toss phase' });
      }

      // Mark captain as connected
      const updateField = isTeam1Captain ? 'team1_connected' : 'team2_connected';
      await postgresService.query(`
        UPDATE draft_sessions 
        SET ${updateField} = TRUE
        WHERE draft_id = $1
      `, [draftId]);

      // Check if both teams are now connected
      const updatedDraft = await postgresService.query(`
        SELECT team1_connected, team2_connected, both_teams_connected_at
        FROM draft_sessions 
        WHERE draft_id = $1
      `, [draftId]);

      const { team1_connected, team2_connected, both_teams_connected_at } = updatedDraft.rows[0];
      
      // If both teams just connected, set the timestamp and enable coin choices after delay
      if (team1_connected && team2_connected && !both_teams_connected_at) {
        await postgresService.query(`
          UPDATE draft_sessions 
          SET both_teams_connected_at = NOW(),
              coin_choices_enabled_at = NOW() + INTERVAL '2 seconds'
          WHERE draft_id = $1
        `, [draftId]);

        // Emit to all in draft room
        const io = req.app.get('io');
        if (io) {
          io.to(`draft-${draftId}`).emit('both-teams-connected', {
            message: 'Both teams connected! Coin choices available in 2 seconds...',
            enableChoicesAt: new Date(Date.now() + 2000).toISOString()
          });
        }
      }

      // Emit connection update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('captain-connected', {
          team: isTeam1Captain ? 'team1' : 'team2',
          teamName: isTeam1Captain ? draft.team1_name : draft.team2_name,
          bothConnected: team1_connected && team2_connected
        });
      }

      logger.info(`Captain ${userId} connected to draft ${draftId}`);
      res.json({ 
        success: true, 
        team: isTeam1Captain ? 'team1' : 'team2',
        bothConnected: team1_connected && team2_connected
      });
    } catch (error) {
      logger.error('Error connecting to draft:', error);
      res.status(500).json({ error: 'Failed to connect to draft' });
    }
  }
);

// Race-based coin choice (first team to choose wins)
router.post('/:id/race-coin-choice',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('choice').isIn(['heads', 'tails'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const userId = req.user.id || req.user.userID;
      const { choice } = req.body;

      // Get draft session
      const draftResult = await postgresService.query(`
        SELECT * FROM draft_sessions WHERE draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      const draft = draftResult.rows[0];

      // Check if user is a captain
      const isTeam1Captain = draft.team1_captain_id === userId;
      const isTeam2Captain = draft.team2_captain_id === userId;
      
      if (!isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only team captains can choose' });
      }

      const team = isTeam1Captain ? 'team1' : 'team2';

      // Check if choice is already taken (race condition protection)
      if (draft.team1_coin_choice === choice || draft.team2_coin_choice === choice) {
        return res.json({ success: false, alreadyTaken: true, choice });
      }

      // Set choice for this team
      const choiceField = isTeam1Captain ? 'team1_coin_choice' : 'team2_coin_choice';
      await postgresService.query(`
        UPDATE draft_sessions 
        SET ${choiceField} = $1
        WHERE draft_id = $2
      `, [choice, draftId]);

      // Assign the other choice to the other team
      const otherChoice = choice === 'heads' ? 'tails' : 'heads';
      const otherChoiceField = isTeam1Captain ? 'team2_coin_choice' : 'team1_coin_choice';
      await postgresService.query(`
        UPDATE draft_sessions 
        SET ${otherChoiceField} = $1
        WHERE draft_id = $2
      `, [otherChoice, draftId]);

      // Emit the choice to all connected clients
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('coin-choice-made', {
          team,
          choice,
          fastestTeam: team
        });
      }

      // Automatically perform coin flip since both choices are now set
      setTimeout(async () => {
        try {
          const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
          const team1Won = draft.team1_coin_choice === coinResult || choice === coinResult && isTeam1Captain;
          const winner = team1Won ? 'team1' : 'team2';

          await postgresService.query(`
            UPDATE draft_sessions 
            SET coin_toss_result = $1, coin_toss_winner = $2
            WHERE draft_id = $3
          `, [coinResult, winner, draftId]);

          if (io) {
            io.to(`draft-${draftId}`).emit('coin-toss-result', {
              result: coinResult,
              winner,
              team1Choice: isTeam1Captain ? choice : otherChoice,
              team2Choice: isTeam2Captain ? choice : otherChoice
            });
          }
        } catch (error) {
          console.error('Error performing coin flip:', error);
        }
      }, 2000);

      res.json({ success: true, choice, team });
    } catch (error) {
      logger.error('Error making race coin choice:', error);
      res.status(500).json({ error: 'Failed to make coin choice' });
    }
  }
);

// Choose pick order (after winning coin toss)
router.post('/:id/pick-order',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('order').isIn(['first', 'second'])
  ],
  async (req, res) => {
    try {
      const draftId = req.params.id;
      const { order } = req.body;
      const userId = req.user.id || req.user.userID;

      // Get draft and verify user won coin toss
      const draftResult = await postgresService.query(`
        SELECT * FROM draft_sessions WHERE draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      const draft = draftResult.rows[0];
      const isTeam1Captain = draft.team1_captain_id === userId;
      const isTeam2Captain = draft.team2_captain_id === userId;
      const userTeam = isTeam1Captain ? 'team1' : 'team2';

      if (draft.coin_toss_winner !== userTeam) {
        return res.status(403).json({ error: 'Only coin toss winner can choose pick order' });
      }

      // Set pick order and advance to ban phase
      const firstPick = order === 'first' ? userTeam : (userTeam === 'team1' ? 'team2' : 'team1');
      
      // Create ban/pick orders based on choice
      const banOrder = firstPick === 'team1' ? 
        ['team1', 'team2', 'team1', 'team2'] :
        ['team2', 'team1', 'team2', 'team1'];
      
      const pickOrder = firstPick === 'team1' ? 
        ['team1', 'team2', 'team2', 'team1', 'team1'] :
        ['team2', 'team1', 'team1', 'team2', 'team2'];

      await postgresService.query(`
        UPDATE draft_sessions 
        SET first_pick = $1,
            pick_order = $2,
            ban_order = $3,
            current_phase = 'Ban Phase',
            current_turn = $4,
            status = 'In Progress'
        WHERE draft_id = $5
      `, [firstPick, JSON.stringify(pickOrder), JSON.stringify(banOrder), banOrder[0], draftId]);

      // Emit to all clients
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('pick-order-chosen', {
          order,
          firstPick,
          banOrder,
          pickOrder,
          phase: 'Ban Phase'
        });
      }

      res.json({ success: true, order, firstPick });
    } catch (error) {
      logger.error('Error setting pick order:', error);
      res.status(500).json({ error: 'Failed to set pick order' });
    }
  }
);

// Choose coin side
router.post('/:id/coin-choice',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('choice').isIn(['heads', 'tails'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const userId = req.user.id || req.user.userID;
      const { choice } = req.body;

      // Get draft session
      const draftResult = await postgresService.query(`
        SELECT ds.*, 
               t1.team_name as team1_name, t2.team_name as team2_name,
               t1.captain_id as team1_captain_id, t2.captain_id as team2_captain_id
        FROM draft_sessions ds
        LEFT JOIN teams t1_specific ON ds.team1_id = t1_specific.id
        LEFT JOIN teams t2_specific ON ds.team2_id = t2_specific.id  
        LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id
        LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id
        WHERE ds.draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      const draft = draftResult.rows[0];
      
      // Check if user is one of the captains
      const isTeam1Captain = draft.team1_captain_id === userId;
      const isTeam2Captain = draft.team2_captain_id === userId;
      
      if (!isTeam1Captain && !isTeam2Captain) {
        return res.status(403).json({ error: 'Only team captains can choose' });
      }

      // Check if both teams are connected
      if (!draft.team1_connected || !draft.team2_connected) {
        return res.status(400).json({ error: 'Both teams must be connected' });
      }

      // Check if coin choices are enabled (2 second delay after both connected)
      if (!draft.coin_choices_enabled_at || new Date() < new Date(draft.coin_choices_enabled_at)) {
        return res.status(400).json({ error: 'Coin choices not yet enabled' });
      }

      // Check if choice is already taken by other team
      const otherTeamChoice = isTeam1Captain ? draft.team2_coin_choice : draft.team1_coin_choice;
      if (otherTeamChoice === choice) {
        return res.status(400).json({ error: 'That choice is already taken by the other team' });
      }

      // Set this team's choice
      const choiceField = isTeam1Captain ? 'team1_coin_choice' : 'team2_coin_choice';
      await postgresService.query(`
        UPDATE draft_sessions 
        SET ${choiceField} = $1
        WHERE draft_id = $2
      `, [choice, draftId]);

      // Check if both teams have now chosen
      const updatedDraft = await postgresService.query(`
        SELECT team1_coin_choice, team2_coin_choice, team1_name, team2_name
        FROM draft_sessions ds
        LEFT JOIN teams t1_specific ON ds.team1_id = t1_specific.id
        LEFT JOIN teams t2_specific ON ds.team2_id = t2_specific.id
        LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id  
        LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id
        WHERE ds.draft_id = $1
      `, [draftId]);

      const updated = updatedDraft.rows[0];

      // Emit choice update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('coin-choice-made', {
          team: isTeam1Captain ? 'team1' : 'team2',
          teamName: isTeam1Captain ? updated.team1_name : updated.team2_name,
          choice: choice,
          bothChosen: updated.team1_coin_choice && updated.team2_coin_choice
        });
      }

      // If both teams have chosen, perform the coin toss
      if (updated.team1_coin_choice && updated.team2_coin_choice) {
        const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
        const team1Won = updated.team1_coin_choice === coinResult;
        const winner = team1Won ? 'team1' : 'team2';
        const firstPick = winner;

        // Default pick/ban order
        const pickOrder = firstPick === 'team1' ? 
          ['team1', 'team2', 'team2', 'team1', 'team1'] :
          ['team2', 'team1', 'team1', 'team2', 'team2'];
        
        const banOrder = firstPick === 'team1' ?
          ['team1', 'team2', 'team1', 'team2'] :
          ['team2', 'team1', 'team2', 'team1'];

        // Update draft with results
        await postgresService.query(`
          UPDATE draft_sessions 
          SET coin_toss_result = $1,
              coin_toss_winner = $2, 
              first_pick = $3,
              pick_order = $4, 
              ban_order = $5,
              status = 'In Progress',
              current_phase = 'Ban Phase',
              current_turn = $6,
              start_time = NOW()
          WHERE draft_id = $7
        `, [
          coinResult, winner, firstPick, 
          JSON.stringify(pickOrder), JSON.stringify(banOrder),
          banOrder[0], draftId
        ]);

        // Emit final coin toss result
        if (io) {
          io.to(`draft-${draftId}`).emit('coin-toss-complete', {
            result: coinResult,
            winner: winner,
            winnerTeamName: team1Won ? updated.team1_name : updated.team2_name,
            team1Choice: updated.team1_coin_choice,
            team2Choice: updated.team2_coin_choice,
            team1Name: updated.team1_name,
            team2Name: updated.team2_name,
            firstPick: firstPick,
            pickOrder: pickOrder,
            banOrder: banOrder,
            nextPhase: 'Ban Phase',
            currentTurn: banOrder[0]
          });
        }
      }

      logger.info(`Captain ${userId} chose ${choice} for draft ${draftId}`);
      res.json({ 
        success: true, 
        choice: choice,
        bothChosen: updated.team1_coin_choice && updated.team2_coin_choice
      });
    } catch (error) {
      logger.error('Error making coin choice:', error);
      res.status(500).json({ error: 'Failed to make coin choice' });
    }
  }
);

// Perform coin toss (legacy endpoint - now replaced by coin-choice system)
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
      const userId = req.user.id || req.user.userID;

      // Get draft session from PostgreSQL
      const draftResult = await postgresService.query(`
        SELECT ds.*, 
               t1.team_name as team1_name, t2.team_name as team2_name,
               t1.captain_id as team1_captain_id, t2.captain_id as team2_captain_id
        FROM draft_sessions ds
        LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id
        LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id
        WHERE ds.draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      const draft = draftResult.rows[0];

      // Check if user is one of the captains or admin
      const isTeam1Captain = draft.team1_captain_id === userId;
      const isTeam2Captain = draft.team2_captain_id === userId;
      const isAdmin = req.user.isAdmin || req.user.role === 'admin';

      if (!isTeam1Captain && !isTeam2Captain && !isAdmin) {
        return res.status(403).json({ error: 'Only captains or admins can perform coin toss' });
      }

      if (draft.status !== 'Waiting' || draft.current_phase !== 'Coin Toss') {
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

      // Update draft session in PostgreSQL
      await postgresService.query(`
        UPDATE draft_sessions 
        SET status = $1, current_phase = $2, current_turn = $3,
            coin_toss_winner = $4, first_pick = $5,
            pick_order = $6, ban_order = $7, start_time = NOW()
        WHERE draft_id = $8
      `, [
        'In Progress',
        'Ban Phase', 
        banOrder[0],
        winner,
        firstPick,
        JSON.stringify(pickOrder),
        JSON.stringify(banOrder),
        draftId
      ]);

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
    body('heroId').isLength({ min: 1 }).trim(),
    body('team').isIn(['team1', 'team2'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const { action, heroId, team } = req.body;
      const userId = req.user.id || req.user.userID;

      // Get draft session
      const draftResult = await postgresService.query(`
        SELECT * FROM draft_sessions WHERE draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      const draft = draftResult.rows[0];

      // Verify user is authorized (captain of the team making the action)
      const isTeam1Captain = draft.team1_captain_id === userId;
      const isTeam2Captain = draft.team2_captain_id === userId;
      
      if (!isTeam1Captain && !isTeam2Captain && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to make draft actions' });
      }

      // Verify it's the correct team's turn
      if (draft.current_turn !== team && !req.user.isAdmin) {
        return res.status(400).json({ error: 'Not your turn' });
      }

      // Verify we're in the correct phase
      const expectedPhase = action === 'ban' ? 'Ban Phase' : 'Pick Phase';
      if (!draft.current_phase?.includes(expectedPhase.split(' ')[0])) {
        return res.status(400).json({ error: `Not in ${action} phase` });
      }

      // Get hero info from our hero data
      const heroMap = {
        'grux': 'Grux',
        'kwang': 'Kwang', 
        'sevarog': 'Sevarog',
        'steel': 'Steel',
        'terra': 'Terra',
        'zinx': 'Zinx',
        'khaimera': 'Khaimera',
        'rampage': 'Rampage',
        'kallari': 'Kallari',
        'feng_mao': 'Feng Mao',
        'crunch': 'Crunch',
        'gideon': 'Gideon',
        'howitzer': 'Howitzer',
        'the_fey': 'The Fey',
        'belica': 'Lt. Belica',
        'gadget': 'Gadget',
        'countess': 'Countess',
        'murdock': 'Murdock',
        'twinblast': 'TwinBlast',
        'sparrow': 'Sparrow',
        'revenant': 'Revenant',
        'muriel': 'Muriel',
        'dekker': 'Dekker',
        'narbash': 'Narbash'
      };
      
      const heroName = heroMap[heroId] || heroId;
      const heroImage = `/heroes/${heroId}.jpg`;

      // Update the appropriate team's picks or bans
      let updateQuery;
      if (action === 'ban') {
        const banField = team === 'team1' ? 'team1_bans' : 'team2_bans';
        updateQuery = `
          UPDATE draft_sessions 
          SET ${banField} = ${banField} || $1::jsonb,
              updated_at = NOW()
          WHERE draft_id = $2
        `;
      } else {
        const pickField = team === 'team1' ? 'team1_picks' : 'team2_picks';
        updateQuery = `
          UPDATE draft_sessions 
          SET ${pickField} = ${pickField} || $1::jsonb,
              updated_at = NOW()
          WHERE draft_id = $2
        `;
      }

      await postgresService.query(updateQuery, [
        JSON.stringify([{ hero_id: heroId, hero_name: heroName, hero_image: heroImage }]),
        draftId
      ]);

      // Advance to next turn
      const pickOrder = JSON.parse(draft.pick_order || '["team1", "team2"]');
      const banOrder = JSON.parse(draft.ban_order || '["team1", "team2"]');
      
      // Calculate next turn and phase
      let nextTurn = draft.current_turn;
      let nextPhase = draft.current_phase;
      
      // Logic to determine next turn based on pick/ban order
      // This is simplified - you'll need to implement full logic based on your draft format
      if (team === 'team1') {
        nextTurn = 'team2';
      } else {
        nextTurn = 'team1';
      }

      // Update draft session with next turn
      await postgresService.query(`
        UPDATE draft_sessions 
        SET current_turn = $1,
            turn_timer_end = NOW() + INTERVAL '20 seconds'
        WHERE draft_id = $2
      `, [nextTurn, draftId]);

      // Emit socket event for real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('draft-update', {
          action,
          heroId,
          heroName,
          team,
          nextTurn,
          draft: await getDraftData(draftId)
        });
      }

      logger.info(`Draft action: ${action} ${heroName} by ${team} in draft ${draftId}`);
      res.json({ 
        success: true,
        action,
        heroId,
        nextTurn
      });

    } catch (error) {
      logger.error('Error performing draft action:', error);
      res.status(500).json({ error: 'Failed to perform draft action' });
    }
  }
);

// Skip turn
router.post('/:id/skip',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('team').isIn(['team1', 'team2'])
  ],
  async (req, res) => {
    try {
      const draftId = req.params.id;
      const { team } = req.body;

      // Get draft and verify turn
      const draftResult = await postgresService.query(`
        SELECT * FROM draft_sessions WHERE draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      const draft = draftResult.rows[0];

      if (draft.current_turn !== team) {
        return res.status(400).json({ error: 'Not your turn' });
      }

      // Advance turn
      const nextTurn = team === 'team1' ? 'team2' : 'team1';
      
      await postgresService.query(`
        UPDATE draft_sessions 
        SET current_turn = $1,
            turn_timer_end = NOW() + INTERVAL '20 seconds'
        WHERE draft_id = $2
      `, [nextTurn, draftId]);

      // Emit socket update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('turn-skipped', {
          team,
          nextTurn
        });
      }

      res.json({ success: true, nextTurn });
    } catch (error) {
      logger.error('Error skipping turn:', error);
      res.status(500).json({ error: 'Failed to skip turn' });
    }
  }
);

// Helper function to get complete draft data
async function getDraftData(draftId) {
  const result = await postgresService.query(`
    SELECT ds.*, 
           t1.team_name as team1_name, 
           t2.team_name as team2_name
    FROM draft_sessions ds
    LEFT JOIN teams t1 ON ds.team1_id = t1.id
    LEFT JOIN teams t2 ON ds.team2_id = t2.id
    WHERE ds.draft_id = $1
  `, [draftId]);
  
  return result.rows[0];
}

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

      // Update draft session status in PostgreSQL
      await postgresService.query(`
        UPDATE draft_sessions 
        SET status = $1, stopped_at = NOW(), stopped_by = $2
        WHERE draft_id = $3
      `, ['Stopped', req.user.id || req.user.userID, draftId]);

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('draft-stopped', {
          reason: 'Emergency stop by admin'
        });
      }

      logger.info(`Draft ${draftId} emergency stopped by admin ${req.user.id || req.user.userID}`);
      res.json({ message: 'Draft stopped successfully' });
    } catch (error) {
      logger.error('Error stopping draft:', error);
      res.status(500).json({ error: 'Failed to stop draft' });
    }
  }
);

// Admin: Reset draft to initial state (for testing)
router.post('/:id/reset',
  requireAdmin,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;

      // Check if draft exists
      const draftResult = await postgresService.query(`
        SELECT draft_id FROM draft_sessions WHERE draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      // Reset draft to initial state
      await postgresService.query(`
        UPDATE draft_sessions 
        SET status = 'Waiting',
            current_phase = 'Coin Toss',
            current_turn = 'team1',
            team1_connected = FALSE,
            team2_connected = FALSE,
            team1_coin_choice = NULL,
            team2_coin_choice = NULL,
            coin_toss_result = NULL,
            coin_toss_winner = NULL,
            first_pick = NULL,
            both_teams_connected_at = NULL,
            coin_choices_enabled_at = NULL,
            team1_picks = '[]'::jsonb,
            team2_picks = '[]'::jsonb,
            team1_bans = '[]'::jsonb,
            team2_bans = '[]'::jsonb,
            pick_order = NULL,
            ban_order = NULL,
            start_time = NULL,
            end_time = NULL,
            stopped_at = NULL,
            stopped_by = NULL,
            updated_at = NOW()
        WHERE draft_id = $1
      `, [draftId]);

      // Emit real-time update to all connected clients
      const io = req.app.get('io');
      if (io) {
        io.to(`draft-${draftId}`).emit('draft-reset', {
          message: 'Draft has been reset by an administrator',
          status: 'Waiting',
          phase: 'Coin Toss'
        });
      }

      logger.info(`Draft ${draftId} reset by admin ${req.user.id || req.user.userID}`);
      res.json({ 
        message: 'Draft reset successfully',
        status: 'Waiting',
        phase: 'Coin Toss'
      });
    } catch (error) {
      logger.error('Error resetting draft:', error);
      res.status(500).json({ error: 'Failed to reset draft' });
    }
  }
);

// Sync draft status from Phoenix
router.put('/:id/sync',
  requireAuth,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      const { phoenixStatus, status, currentPhase, results } = req.body;

      // Verify draft exists
      const draftResult = await postgresService.query(`
        SELECT * FROM draft_sessions WHERE draft_id = $1
      `, [draftId]);

      if (draftResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      // Update React backend with Phoenix data
      let updateFields = ['status = $1', 'current_phase = $2', 'updated_at = NOW()'];
      let updateValues = [status, currentPhase];
      let paramCount = 2;

      // Update picks and bans if provided
      if (results) {
        if (results.team1) {
          paramCount++;
          updateFields.push(`team1_picks = $${paramCount}::jsonb`);
          updateValues.push(JSON.stringify(results.team1.picks || []));
          
          paramCount++;
          updateFields.push(`team1_bans = $${paramCount}::jsonb`);
          updateValues.push(JSON.stringify(results.team1.bans || []));
        }
        
        if (results.team2) {
          paramCount++;
          updateFields.push(`team2_picks = $${paramCount}::jsonb`);
          updateValues.push(JSON.stringify(results.team2.picks || []));
          
          paramCount++;
          updateFields.push(`team2_bans = $${paramCount}::jsonb`);
          updateValues.push(JSON.stringify(results.team2.bans || []));
        }
      }

      // Add coin toss results if provided
      if (phoenixStatus && phoenixStatus.coin_toss) {
        const coinToss = phoenixStatus.coin_toss;
        if (coinToss.result) {
          paramCount++;
          updateFields.push(`coin_toss_result = $${paramCount}`);
          updateValues.push(coinToss.result);
        }
        if (coinToss.winner) {
          paramCount++;
          updateFields.push(`coin_toss_winner = $${paramCount}`);
          updateValues.push(coinToss.winner);
        }
        if (coinToss.first_pick_team) {
          paramCount++;
          updateFields.push(`first_pick = $${paramCount}`);
          updateValues.push(coinToss.first_pick_team);
        }
      }

      // Mark as completed if needed
      if (status === 'completed') {
        paramCount++;
        updateFields.push(`end_time = NOW()`);
      }

      // Build final query
      paramCount++;
      updateValues.push(draftId);
      
      const query = `
        UPDATE draft_sessions 
        SET ${updateFields.join(', ')}
        WHERE draft_id = $${paramCount}
        RETURNING *
      `;

      await postgresService.query(query, updateValues);

      logger.info(`Draft ${draftId} synced from Phoenix: ${status} - ${currentPhase}`);
      res.json({ success: true, message: 'Draft synced successfully' });

    } catch (error) {
      logger.error('Error syncing draft from Phoenix:', error);
      res.status(500).json({ error: 'Failed to sync draft status' });
    }
  }
);

// Admin: Delete draft session
router.delete('/:id',
  requireAdmin,
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftId = req.params.id;
      
      // Check if draft exists
      const existingDraft = await postgresService.query(
        'SELECT * FROM draft_sessions WHERE draft_id = $1',
        [draftId]
      );
      
      if (existingDraft.rows.length === 0) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

      // Delete the draft
      await postgresService.query(
        'DELETE FROM draft_sessions WHERE draft_id = $1',
        [draftId]
      );
      
      logger.info(`Draft ${draftId} deleted by admin ${req.user.id || req.user.userID}`);
      res.json({ 
        message: 'Draft deleted successfully',
        draftId: draftId
      });
      
    } catch (error) {
      logger.error('Error deleting draft:', error);
      res.status(500).json({ error: 'Failed to delete draft' });
    }
  }
);

// Helper function to generate captain tokens
function generateCaptainToken(draftId, captainNumber) {
  // In production, use proper JWT or secure token generation
  return Buffer.from(`${draftId}-${captainNumber}-${Date.now()}`).toString('base64');
}

module.exports = router;


// trigger restart
