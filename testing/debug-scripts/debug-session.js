// Add this route temporarily to debug session issues
const express = require('express');
const router = express.Router();

router.get('/debug-session', (req, res) => {
  console.log('=== SESSION DEBUG ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('Is Authenticated:', req.isAuthenticated?.());
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  console.log('==================');
  
  res.json({
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated?.() || false,
    user: req.user || null,
    cookies: req.cookies
  });
});

module.exports = router;