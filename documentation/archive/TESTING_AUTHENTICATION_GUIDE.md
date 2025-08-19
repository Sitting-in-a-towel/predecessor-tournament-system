# Testing Authentication Guide - Automated Testing with Admin Access

**Complete guide for testing authenticated features without manual Discord OAuth**

## 🎯 The Problem

Manual testing requires:
- Discord OAuth flow
- Browser interaction
- Real user credentials
- Admin permissions setup

Automated testing (Playwright) needs:
- Programmatic authentication
- Consistent admin access
- No manual intervention
- Reliable test data

## ✅ The Solution: Test Authentication System

### Built-in Test Authentication Endpoint
**Endpoint:** `POST /api/test-auth/login-test-admin`  
**Environment:** Development only (disabled in production)  
**Purpose:** Create admin user session for testing

## 🔧 How to Use Test Authentication

### 1. In Playwright Tests
```javascript
// Login using test authentication
const loginResponse = await page.request.post('http://localhost:3001/api/test-auth/login-test-admin', {
  headers: { 'Content-Type': 'application/json' }
});

if (loginResponse.ok()) {
  const result = await loginResponse.json();
  console.log('✅ Test admin login successful:', result.message);
  
  // Refresh page to pick up authentication
  await page.reload({ waitUntil: 'networkidle' });
} else {
  console.log('❌ Test admin login failed:', loginResponse.status());
}
```

### 2. In Manual API Testing
```bash
curl -X POST http://localhost:3001/api/test-auth/login-test-admin \
  -H "Content-Type: application/json" \
  -c cookies.txt

# Use the cookies for subsequent requests
curl -X POST http://localhost:3001/api/tournaments/TOURNAMENT_ID/bracket \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"bracketData": {...}, "isPublished": true}'
```

### 3. In Node.js Test Scripts
```javascript
const axios = require('axios');

async function testWithAuth() {
  // Create authenticated session
  const loginResponse = await axios.post('http://localhost:3001/api/test-auth/login-test-admin');
  
  if (loginResponse.status === 200) {
    // Extract session cookie
    const cookies = loginResponse.headers['set-cookie'];
    
    // Use for subsequent requests
    const bracketResponse = await axios.post(
      'http://localhost:3001/api/tournaments/TOURNAMENT_ID/bracket',
      { bracketData: {...}, isPublished: true },
      { headers: { Cookie: cookies[0] } }
    );
  }
}
```

## 🗂️ Test User Details

### Automatic Test Admin Creation
```javascript
const testUser = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',    // Fixed UUID
  user_id: 'test_admin_user',                     // Legacy string ID
  discord_id: 'test_discord_123456',              // Discord identifier
  discord_username: 'test_admin',                 // Display name
  email: 'test@admin.com',                        // Email address
  isAdmin: true,                                  // Admin privileges
  role: 'admin'                                   // Role designation
};
```

### Database Integration
- User automatically created/updated in `users` table
- Session properly established with `req.session.user`
- Full admin permissions available
- Persistent across requests (session-based)

## 📋 Available Test Endpoints

### Authentication Management
```
POST /api/test-auth/login-test-admin   - Create admin session
GET  /api/test-auth/status            - Check current auth status
POST /api/test-auth/logout            - Destroy session
```

### Usage Examples
```bash
# Login as test admin
curl -X POST http://localhost:3001/api/test-auth/login-test-admin

# Check auth status
curl http://localhost:3001/api/test-auth/status

# Logout
curl -X POST http://localhost:3001/api/test-auth/logout
```

## 🧪 Complete Test Example

### Full Playwright Test with Authentication
```javascript
const { chromium } = require('playwright');

async function testBracketPublishFlow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to site
  await page.goto('http://localhost:3000');
  
  // Login using test auth
  const loginResponse = await page.request.post(
    'http://localhost:3001/api/test-auth/login-test-admin'
  );
  
  if (loginResponse.ok()) {
    console.log('✅ Authenticated as test admin');
    
    // Refresh to pick up authentication
    await page.reload({ waitUntil: 'networkidle' });
    
    // Navigate to tournament
    await page.locator('text="test admin panel"').first().click();
    
    // Go to bracket tab
    await page.locator('[role="tab"]:has-text("Bracket")').first().click();
    
    // Generate bracket if needed
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible({ timeout: 3000 })) {
      await generateBtn.click();
      await page.waitForTimeout(3000);
    }
    
    // Publish bracket
    const publishBtn = page.locator('button:has-text("Publish")').first();
    if (await publishBtn.isVisible()) {
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      await publishBtn.click();
      await page.waitForTimeout(5000);
      
      console.log('✅ Bracket publish test completed');
    }
  }
  
  await browser.close();
}

testBracketPublishFlow();
```

## 🔒 Security Considerations

### Development Only
- Test auth endpoint **automatically disabled** in production
- Environment check: `process.env.NODE_ENV === 'production'`
- Safe for local development and CI/CD testing

### Session Management
- Test sessions use same session store as real users
- Sessions properly cleaned up on logout
- No persistent authentication tokens

### Permissions
- Test admin has full admin privileges
- Can access all admin-only endpoints
- Should not be used with real production data

## 🚨 Common Issues & Solutions

### Issue: Authentication Not Working in Tests
**Symptoms:** 401 Unauthorized errors despite login
**Solution:** 
1. Ensure session cookies are being sent
2. Reload page after login to pick up session
3. Check that test-auth endpoint returned 200 status

### Issue: Admin Privileges Not Working  
**Symptoms:** 403 Forbidden on admin endpoints
**Solution:**
1. Check `req.user.isAdmin` is true
2. Verify session contains user object
3. Test with `/api/test-auth/status` endpoint

### Issue: Test Auth Disabled
**Symptoms:** 404 on test-auth endpoints
**Solution:**
1. Check `NODE_ENV` - must be development
2. Ensure `backend/routes/test-auth.js` is loaded
3. Check server logs for "Test auth endpoint disabled" message

## 📁 Files Using Test Authentication

### Playwright Test Scripts
```
backend/scripts/playwright-test-auth-bracket.js     - Bracket publish test
backend/scripts/playwright-authenticated-test.js   - General auth test
```

### Authentication Middleware
```
backend/middleware/auth.js                          - Supports test sessions
backend/routes/auth.js                             - Test session detection
backend/routes/test-auth.js                        - Test auth endpoints
```

## 🎯 Testing Checklist

### Before Writing Tests
- [ ] **Use test authentication** - Don't rely on manual Discord login
- [ ] **Check admin permissions** - Verify test user has required access
- [ ] **Handle session cookies** - Ensure cookies persist across requests
- [ ] **Wait for page loads** - Allow time for authentication to take effect

### During Test Development
- [ ] **Test login first** - Verify test auth works before testing features
- [ ] **Monitor network requests** - Check for 401/403 errors
- [ ] **Use proper selectors** - Ensure UI elements exist for authenticated users
- [ ] **Handle confirmation dialogs** - Set up dialog handlers for admin actions

### After Test Completion
- [ ] **Clean up sessions** - Logout test users when done
- [ ] **Take screenshots** - Capture final state for debugging
- [ ] **Check test data** - Verify no test data affects production

---

**This test authentication system enables reliable, automated testing of all authenticated features without the complexity of real OAuth flows or manual user interaction.**