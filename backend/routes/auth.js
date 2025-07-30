const express = require('express');
const passport = require('passport');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Discord OAuth login
router.get('/discord', (req, res, next) => {
  // Store remember preference in session
  req.session.rememberMe = req.query.remember === 'true';
  passport.authenticate('discord')(req, res, next);
});

// Discord OAuth callback
router.get('/discord/callback', (req, res, next) => {
  passport.authenticate('discord', (err, user, info) => {
    if (err) {
      logger.error('Discord OAuth callback error:', err);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Discord authentication failed',
        details: err.message 
      });
    }
    
    if (!user) {
      logger.error('Discord OAuth callback: No user returned', info);
      return res.redirect(process.env.FRONTEND_URL + '/login?error=auth_failed');
    }
    
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('Login session error:', loginErr);
        return res.status(500).json({ 
          error: 'Internal server error', 
          message: 'Login session failed',
          details: loginErr.message 
        });
      }
      
      logger.info(`User ${user.userID} successfully authenticated`);
      
      // Set session duration based on remember preference
      if (req.session.rememberMe) {
        // 30 days if remember me is checked
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        // 1 day if not checked
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
      }
      
      // Ensure session is saved before redirecting
      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error('Session save error:', saveErr);
          return res.status(500).json({ 
            error: 'Internal server error', 
            message: 'Session save failed'
          });
        }
        
        logger.info(`Session saved for user ${user.userID}`);
        res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
      });
    });
  })(req, res, next);
});

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