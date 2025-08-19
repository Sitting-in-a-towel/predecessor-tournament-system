const express = require('express');
const app = express();

// Quick debug server to check auth state
app.use((req, res, next) => {
  console.log('=== AUTH DEBUG ===');
  console.log('req.isAuthenticated():', req.isAuthenticated?.());
  console.log('req.user:', req.user);
  console.log('req.session:', req.session);
  console.log('req.sessionID:', req.sessionID);
  console.log('==================');
  res.json({
    isAuthenticated: req.isAuthenticated?.(),
    user: req.user,
    sessionID: req.sessionID,
    session: req.session
  });
});

app.listen(3002, () => {
  console.log('Debug server running on http://localhost:3002');
});