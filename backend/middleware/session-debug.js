// Session debugging middleware
module.exports = function sessionDebugMiddleware(req, res, next) {
  // Log session operations in production
  if (process.env.NODE_ENV === 'production') {
    console.log(`[SESSION-DEBUG] ${req.method} ${req.path}`);
    console.log(`[SESSION-DEBUG] Session ID: ${req.sessionID}`);
    console.log(`[SESSION-DEBUG] Session exists: ${!!req.session}`);
    console.log(`[SESSION-DEBUG] User in session: ${req.session?.passport?.user || 'none'}`);
    console.log(`[SESSION-DEBUG] Cookie header: ${req.headers.cookie || 'none'}`);
    
    // Log when session is modified
    const originalSave = req.session?.save;
    if (req.session && originalSave) {
      req.session.save = function(callback) {
        console.log('[SESSION-DEBUG] Session.save() called');
        return originalSave.call(this, callback);
      };
    }
  }
  
  next();
};