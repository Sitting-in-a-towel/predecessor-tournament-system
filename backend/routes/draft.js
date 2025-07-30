const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get all draft sessions
router.get('/', async (req, res) => {
  try {
    const drafts = await airtableService.getDraftSessions();
    logger.info(`Retrieved ${drafts.length} draft sessions`);
    res.json(drafts);
  } catch (error) {
    logger.error('Error getting draft sessions:', error);
    res.status(500).json({ error: 'Failed to retrieve draft sessions' });
  }
});

// Create new draft session for a match
router.post('/',
  requireAdmin,
  [
    body('matchId').isLength({ min: 1 }).trim(),
    body('team1CaptainId').isLength({ min: 1 }).trim(),
    body('team2CaptainId').isLength({ min: 1 }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { matchId, team1CaptainId, team2CaptainId } = req.body;

      // Validate match exists
      const matches = await airtableService.getMatches();
      const match = matches.find(m => m.MatchID === matchId);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Validate captains exist
      const team1Captain = await airtableService.getUserByID(team1CaptainId);
      const team2Captain = await airtableService.getUserByID(team2CaptainId);
      
      if (!team1Captain || !team2Captain) {
        return res.status(404).json({ error: 'One or both captains not found' });
      }

      const draftData = {
        DraftID: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        Match: [match.recordId],
        Team1Captain: [team1Captain.recordId],
        Team2Captain: [team2Captain.recordId],
        Status: 'Waiting',
        CreatedAt: new Date().toISOString(),
        CreatedBy: req.user.userID,
        PickOrder: JSON.stringify([]), // Will be set during coin toss
        BanOrder: JSON.stringify([]),
        Team1Picks: JSON.stringify([]),
        Team2Picks: JSON.stringify([]),
        Team1Bans: JSON.stringify([]),
        Team2Bans: JSON.stringify([]),
        CurrentPhase: 'Coin Toss',
        CurrentTurn: 'team1'
      };

      const draft = await airtableService.createDraftSession(draftData);
      
      // Generate access links
      const team1Link = `${process.env.FRONTEND_URL}/draft/${draft.DraftID}?captain=1&token=${generateCaptainToken(draft.DraftID, '1')}`;
      const team2Link = `${process.env.FRONTEND_URL}/draft/${draft.DraftID}?captain=2&token=${generateCaptainToken(draft.DraftID, '2')}`;
      const spectatorLink = `${process.env.FRONTEND_URL}/draft/${draft.DraftID}/spectate`;

      logger.info(`Draft session created: ${draft.DraftID} for match ${matchId}`);
      
      res.status(201).json({
        ...draft,
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

      const drafts = await airtableService.getDraftSessions();
      const draft = drafts.find(d => d.DraftID === req.params.id);

      if (!draft) {
        return res.status(404).json({ error: 'Draft session not found' });
      }

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
router.get('/:id/heroes',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const heroes = await airtableService.getHeroes();
      res.json(heroes);
    } catch (error) {
      logger.error('Error getting heroes:', error);
      res.status(500).json({ error: 'Failed to retrieve heroes' });
    }
  }
);

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