const logger = require('../utils/logger');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  // Check Passport.js authentication OR test admin session
  const isPassportAuth = req.isAuthenticated && req.isAuthenticated();
  const isTestAdminAuth = req.session && req.session.user && req.session.userId;
  
  if (isPassportAuth) {
    return next();
  }
  
  if (isTestAdminAuth) {
    // Set up req.user for test admin session compatibility
    req.user = req.session.user;
    return next();
  }
  
  logger.warn(`Unauthorized access attempt to ${req.path}`);
  return res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  // Check Passport.js authentication OR test admin session
  const isPassportAuth = req.isAuthenticated && req.isAuthenticated();
  const isTestAdminAuth = req.session && req.session.user && req.session.userId;
  
  if (!isPassportAuth && !isTestAdminAuth) {
    logger.warn(`Unauthenticated admin access attempt to ${req.path}`);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Set up req.user for test admin session if needed
  if (isTestAdminAuth && !req.user) {
    req.user = req.session.user;
  }
  
  if (!req.user || !req.user.isAdmin) {
    logger.warn(`Non-admin user ${req.user?.userID} attempted to access ${req.path}`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  return next();
};

// Middleware to check if user is team captain for specific team
const requireTeamCaptain = (teamId) => {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      // This would need to be implemented with actual team lookup
      // const team = await airtableService.getTeamByID(teamId);
      // if (team && team.Captain === req.user.userID) {
      //   return next();
      // }
      
      // For now, just check authentication
      return next();
    } catch (error) {
      logger.error('Team captain check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to validate user owns resource
const requireResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      // This would need to be implemented based on resource type
      // Check if user owns the resource they're trying to access/modify
      return next();
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireTeamCaptain,
  requireResourceOwnership
};