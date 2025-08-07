// Test authentication endpoint - LOCAL DEV ONLY
const express = require('express');
const postgresService = require('../services/postgresql');
const logger = require('../utils/logger');

const router = express.Router();

// Only enable in development mode
if (process.env.NODE_ENV === 'production') {
  logger.warn('Test auth endpoint disabled in production');
  module.exports = router;
  return;
}

// Create/login as test admin user - with database creation
router.post('/login-test-admin', async (req, res) => {
  try {
    logger.info('Creating test admin user for automated testing');
    
    const testUser = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Valid UUID format
      userID: 'test_admin_user',
      user_id: 'test_admin_user', 
      discord_id: 'test_discord_123456',
      discord_username: 'test_admin',
      email: 'test@admin.com',
      isAdmin: true,
      role: 'admin',
      avatar: null
    };

    // Create or update test admin user in database
    await postgresService.query(`
      INSERT INTO users (
        id, user_id, discord_id, discord_username, 
        email, is_admin, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        is_admin = $6,
        updated_at = NOW()
    `, [
      testUser.id,
      testUser.user_id,
      testUser.discord_id,
      testUser.discord_username,
      testUser.email,
      true
    ]);

    // Set up session
    req.session.userId = testUser.id;
    req.session.userID = testUser.userID;
    req.session.user = testUser;

    logger.info('Test admin user created and session established:', {
      userId: req.session.userId,
      userID: req.session.userID,
      isAdmin: testUser.isAdmin
    });
    
    res.json({
      success: true,
      user: testUser,
      message: 'Test admin user created and logged in',
      sessionId: req.session.id
    });

  } catch (error) {
    logger.error('Error creating test admin user:', error);
    res.status(500).json({ 
      error: 'Failed to create test admin user',
      details: error.message 
    });
  }
});

// Check current auth status
router.get('/status', (req, res) => {
  res.json({
    isAuthenticated: !!req.session.userId,
    user: req.session.user || null,
    session: {
      userId: req.session.userId,
      userID: req.session.userID
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;