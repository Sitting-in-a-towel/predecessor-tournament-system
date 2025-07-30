const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Get admin dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // TODO: Implement dashboard statistics
    // - Active tournaments count
    // - Registered users count
    // - Active teams count
    // - Ongoing matches count
    
    const stats = {
      activeTournaments: 0,
      registeredUsers: 0,
      activeTeams: 0,
      ongoingMatches: 0
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting admin dashboard:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

// Get all users (admin only)
router.get('/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement user listing with pagination
      res.json({ message: 'Admin user listing endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }
);

// Update user (admin only)
router.put('/users/:id',
  [
    param('id').isLength({ min: 1 }).trim(),
    body('isAdmin').optional().isBoolean(),
    body('discordUsername').optional().isLength({ min: 1, max: 50 }).trim().escape()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement user update logic
      res.json({ message: 'Admin user update endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// Get all tournaments (admin view with more details)
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await airtableService.getTournaments();
    
    // TODO: Add additional admin-specific data like:
    // - Registration statistics
    // - Creator information
    // - Detailed status information
    
    res.json(tournaments);
  } catch (error) {
    logger.error('Error getting tournaments for admin:', error);
    res.status(500).json({ error: 'Failed to retrieve tournaments' });
  }
});

// Force update tournament status
router.put('/tournaments/:id/status',
  [
    param('id').isLength({ min: 1 }).trim(),
    body('status').isIn(['Planning', 'Registration', 'In Progress', 'Completed', 'Cancelled'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement tournament status update
      logger.info(`Admin ${req.user.userID} updating tournament ${req.params.id} status to ${req.body.status}`);
      res.json({ message: 'Tournament status update endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error updating tournament status:', error);
      res.status(500).json({ error: 'Failed to update tournament status' });
    }
  }
);

// Get system logs
router.get('/logs',
  [
    query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
    query('limit').optional().isInt({ min: 1, max: 1000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement log retrieval
      res.json({ message: 'System logs endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error getting system logs:', error);
      res.status(500).json({ error: 'Failed to retrieve system logs' });
    }
  }
);

// Manage heroes (enable/disable for drafts)
router.put('/heroes/:id',
  [
    param('id').isLength({ min: 1 }).trim(),
    body('enabled').isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement hero enable/disable
      logger.info(`Admin ${req.user.userID} ${req.body.enabled ? 'enabled' : 'disabled'} hero ${req.params.id}`);
      res.json({ message: 'Hero management endpoint - to be implemented' });
    } catch (error) {
      logger.error('Error managing hero:', error);
      res.status(500).json({ error: 'Failed to manage hero' });
    }
  }
);

// Emergency stop draft
router.post('/drafts/:id/emergency-stop',
  [param('id').isLength({ min: 1 }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Implement emergency draft stop
      logger.warn(`Admin ${req.user.userID} performed emergency stop on draft ${req.params.id}`);
      
      // Broadcast emergency stop to all draft participants
      const io = req.app.get('io');
      io.to(`draft-${req.params.id}`).emit('emergency-stop', {
        reason: 'Emergency stop by administrator',
        timestamp: new Date().toISOString()
      });

      res.json({ message: 'Emergency draft stop executed' });
    } catch (error) {
      logger.error('Error performing emergency stop:', error);
      res.status(500).json({ error: 'Failed to perform emergency stop' });
    }
  }
);

// Backup database
router.post('/backup', async (req, res) => {
  try {
    // TODO: Implement database backup
    logger.info(`Database backup initiated by admin ${req.user.userID}`);
    res.json({ message: 'Database backup endpoint - to be implemented' });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

module.exports = router;