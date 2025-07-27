const express = require('express');
const passport = require('passport');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Discord OAuth login
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth callback
router.get('/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: process.env.FRONTEND_URL + '/login?error=auth_failed' 
  }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    logger.info(`User ${req.user.userID} successfully authenticated`);
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      userID: req.user.userID,
      discordID: req.user.discordID,
      discordUsername: req.user.discordUsername,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
      createdAt: req.user.createdAt,
      lastActive: req.user.lastActive
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', requireAuth, (req, res) => {
  const userID = req.user.userID;
  
  req.logout((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    logger.info(`User ${userID} logged out`);
    res.json({ message: 'Logged out successfully' });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.isAuthenticated && req.isAuthenticated() ? {
      userID: req.user.userID,
      discordUsername: req.user.discordUsername,
      isAdmin: req.user.isAdmin
    } : null
  });
});

module.exports = router;