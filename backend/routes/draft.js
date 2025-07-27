const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { airtableService } = require('../services/airtable');
const logger = require('../utils/logger');

const router = express.Router();

// Create draft session
router.post('/',
  requireAuth,
  [
    body('matchID').isLength({ min: 1 }).trim(),
    body('team1CaptainID').isLength({ min: 1 }).trim(),
    body('team2CaptainID').isLength({ min: 1 }).trim(),
    body('banCount').isInt({ min: 0, max: 5 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const draftData = {
        DraftID: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        Match: [req.body.matchID],
        Team1Captain: [req.body.team1CaptainID],
        Team2Captain: [req.body.team2CaptainID],
        BanCount: req.body.banCount,
        Status: 'Waiting',
        StartTime: new Date().toISOString(),
        DraftOrder: JSON.stringify([]), // Will be populated during draft
        Team1Picks: '',
        Team1Bans: '',
        Team2Picks: '',
        Team2Bans: ''
      };

      const draft = await airtableService.createDraftSession(draftData);
      
      // Generate unique access links for captains
      const team1Link = `${process.env.FRONTEND_URL}/draft/${draft.DraftID}?captain=1&token=${generateCaptainToken(draft.DraftID, '1')}`;
      const team2Link = `${process.env.FRONTEND_URL}/draft/${draft.DraftID}?captain=2&token=${generateCaptainToken(draft.DraftID, '2')}`;
      const spectatorLink = `${process.env.FRONTEND_URL}/draft/${draft.DraftID}/spectate`;

      // Update draft with access links
      await airtableService.updateDraftSession(draft.DraftID, {
        Team1CaptainLink: team1Link,
        Team2CaptainLink: team2Link,
        SpectatorLink: spectatorLink
      });

      logger.info(`Draft session created: ${draft.DraftID}`);
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

// Get draft session details
router.get('/:id',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement get draft session
      res.json({ message: 'Draft session details endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error getting draft session:', error);
      res.status(500).json({ error: 'Failed to retrieve draft session' });
    }
  }
);

// Captain access to draft (with token verification)
router.get('/:id/captain',
  [
    param('id').isLength({ min: 1 }).trim(),
    body('token').isLength({ min: 1 }).trim(),
    body('captain').isIn(['1', '2'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement captain token verification
      // - Verify token is valid for this draft and captain
      // - Return draft interface data
      
      res.json({ message: 'Captain draft access endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error accessing captain draft:', error);
      res.status(500).json({ error: 'Failed to access draft' });
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

      // TODO: Implement coin toss logic
      // - Verify user is captain
      // - Perform random coin toss
      // - Update draft session with winner
      // - Broadcast result to all participants
      
      const coinTossWinner = Math.random() < 0.5 ? 'Team1' : 'Team2';
      
      // Get Socket.IO instance from app
      const io = req.app.get('io');
      io.to(`draft-${req.params.id}`).emit('coin-toss-result', {
        winner: coinTossWinner,
        timestamp: new Date().toISOString()
      });

      res.json({ winner: coinTossWinner });
    } catch (error) {
      logger.error('Error performing coin toss:', error);
      res.status(500).json({ error: 'Failed to perform coin toss' });
    }
  }
);

// Make pick/ban
router.post('/:id/action',
  requireAuth,
  [
    param('id').isLength({ min: 1 }).trim(),
    body('action').isIn(['pick', 'ban']),
    body('heroID').isLength({ min: 1 }).trim(),
    body('team').isIn(['1', '2'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement pick/ban logic
      // - Verify user is captain for specified team
      // - Verify it's the team's turn
      // - Verify hero is available
      // - Update draft session
      // - Broadcast action to all participants
      
      const actionData = {
        draftId: req.params.id,
        action: req.body.action,
        heroID: req.body.heroID,
        team: req.body.team,
        timestamp: new Date().toISOString()
      };

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      io.to(`draft-${req.params.id}`).emit('draft-action', actionData);

      res.json({ success: true, action: actionData });
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
      
      // TODO: Filter out already picked/banned heroes for this draft
      
      res.json(heroes);
    } catch (error) {
      logger.error('Error getting draft heroes:', error);
      res.status(500).json({ error: 'Failed to retrieve heroes' });
    }
  }
);

// Helper function to generate captain tokens
function generateCaptainToken(draftId, captainNumber) {
  // In production, use proper JWT or secure token generation
  return Buffer.from(`${draftId}-${captainNumber}-${Date.now()}`).toString('base64');
}

module.exports = router;