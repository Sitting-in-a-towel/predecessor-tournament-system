# 🧪 Comprehensive Testing Guide

**Last Updated:** July 27, 2025  
**Version:** Complete Feature Set Testing

## 🚀 Quick Start Commands

```bash
# 1. Start the development environment
cd "H:\Project Folder\Predecessor website"
.\launchers\Start_UI_Launcher_Real.bat

# 2. Wait for all services to start (30-60 seconds)
# Frontend: http://localhost:3000
# Backend: http://localhost:3001  
# UI Launcher: http://localhost:4000

# 3. Open your browser to: http://localhost:3000
```

## 📋 Pre-Testing Checklist

### ✅ Environment Setup
- [x] Ensure you're in development environment (`echo %NODE_ENV%` should show nothing or "development")
- [x] All launchers started successfully
- [x] No error messages in terminal windows
- [x] Frontend loads at http://localhost:3000
- [x] Backend health check: http://localhost:3001/health returns JSON

### ✅ Database Connection
- [x] Airtable tables exist (Users, Tournaments, Teams, Matches, DraftSessions, Heroes)
- [x] No "not authorized" errors in backend logs
- [x] Admin user account exists in Airtable Users table
I only got this error looking message when the site was starting up
9:19:28 frontend (node:37944) [DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE] DeprecationWarning: 'onAfterSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option. (Use `node --trace-deprecation ...` to show where the warning was created)
09:19:28 frontend (node:37944) [DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE] DeprecationWarning: 'onBeforeSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option.
---

## 🎯 Core Feature Testing

### 1. Authentication & User Management

#### Test 1.1: Discord Login
**Priority:** CRITICAL
```
1. Navigate to http://localhost:3000
2. Click "Login with Discord"
3. Complete Discord OAuth flow
4. Verify you're redirected back and logged in
5. Check that your username appears in header
6. Verify session persists on page refresh
```

**Expected Results:**
- ✅ Successful Discord login
- ✅ User created in Airtable Users table
- ✅ Session persists across page refreshes
- ✅ Logout functionality works

yep all the discord logins worked as expected.

#### Test 1.2: Admin Access
**Priority:** HIGH
```
1. Ensure your Discord user is marked as admin in Airtable
2. Navigate to http://localhost:3000/admin/dashboard
3. Verify access granted and dashboard loads
4. Check statistics display correctly
```

**Expected Results:**
- ✅ Admin dashboard accessible
- ✅ User/tournament/team statistics display
- ✅ Recent activity logs visible

I can't see any stats, they're all just 0 even though we had created teams and tournaments in some previous tests. 
Its also saying in the 'system health' section that Airtable connection issues detected
### 2. Tournament Management

#### Test 2.1: Tournament Creation
**Priority:** CRITICAL
```
1. Log in as admin user
2. Navigate to /tournaments
3. Click "Create Tournament"
4. Fill out tournament form:
   - Name: "Test Tournament 1"
   - Description: "Testing tournament creation"
   - Bracket: "Single Elimination" 
   - Game Format: "Best of 3"
   - Max Teams: 8
   - Start Date: Tomorrow
5. Submit form
6. Verify tournament appears in listings
```

**Expected Results:**
- ✅ Tournament created successfully
- ✅ Appears in tournament list
- ✅ Tournament detail page accessible
- ✅ Correct information displayed

Errors failed to create tournament, i think this might be due to hitting the API limit for airtable this month. 

#### Test 2.2: Tournament Detail Pages
**Priority:** HIGH
```
1. Click "View Details" on a tournament
2. Test all tabs: Overview, Teams, Check-In, Matches, Bracket
3. Verify information displays correctly
4. Test registration button (if applicable)
```

**Expected Results:**
- ✅ All tabs load without errors
- ✅ Tournament information accurate
- ✅ Registration flow works

this worked as expected

### 3. Team Management

#### Test 3.1: Team Creation
**Priority:** CRITICAL
```
1. Navigate to tournament detail page
2. Click "Register Team" 
3. Fill out team form:
   - Team Name: "Test Team Alpha"
   - Tournament: Select test tournament
   - Logo: Leave empty (should use default)
4. Submit form
5. Verify team creation success
6. Check team appears in "My Teams"
```

**Expected Results:**
- ✅ Team created successfully
- ✅ Appears in "My Teams" section
- ✅ Default logo displayed
- ✅ User is set as captain

Worked as expected. but i'm not set as captain, when i go into a team, it has 'team roster' and just says 'player' under it. also says in the team requirements that a team catpatin needs to be assigned with a X next to it. 

#### Test 3.2: Team Management Features
**Priority:** HIGH
```
1. From "My Teams", open team management
2. Test invite player:
   - Add a player by Discord username
   - Try both "player" and "substitute" roles
3. Test remove player:
   - Remove an invited player
   - Verify captain cannot remove themselves
4. Test team confirmation:
   - Add 4 more players (5 total)
   - Click "Confirm Team"
   - Verify team status changes
```

**Expected Results:**
- ✅ Player invitations work
- ✅ Player removal works correctly
- ✅ Team confirmation requires 5 players
- ✅ Confirmed teams cannot be modified

there is no section for me to invite players to a team or remove or set/change captain. 

### 4. Tournament Check-In System

#### Test 4.1: Team Check-In
**Priority:** HIGH
```
1. Ensure you have a confirmed team
2. Navigate to tournament detail page
3. Go to "Check-In" tab
4. Click "Check In Team"
5. Verify check-in status updates
6. Test admin check-in controls (if admin)
```

**Expected Results:**
- ✅ Check-in only available for confirmed teams
- ✅ Only team captains can check in
- ✅ Check-in status updates in real-time
- ✅ Admin controls work for overrides

can't test this due to previous step being unavailable

#### Test 4.2: Check-In Requirements
**Priority:** MEDIUM
```
1. Try to check in unconfirmed team (should fail)
2. Try to check in as non-captain (should fail)
3. Verify tournament readiness indicators
4. Test multiple team check-ins
```

**Expected Results:**
- ✅ Proper validation prevents invalid check-ins
- ✅ Tournament readiness calculated correctly
- ✅ Check-in time stamps recorded

can't test this due to previous step being unavailable

### 5. Match Management

#### Test 5.1: Match Creation (Admin)
**Priority:** HIGH
```
1. Log in as admin
2. Ensure 2+ teams are checked in
3. Navigate to tournament "Matches" tab
4. Click "Create Match"
5. Fill out match form:
   - Team 1: Select first team
   - Team 2: Select second team
   - Round: "Round 1"
   - Match Type: "Group Stage"
   - Scheduled Time: Optional
6. Submit and verify match creation
```

**Expected Results:**
- ✅ Match created successfully
- ✅ Only allows checked-in teams
- ✅ Match appears in tournament matches
- ✅ Proper validation prevents invalid matches

can't test this due to previous step being unavailable

#### Test 5.2: Match Operations
**Priority:** HIGH
```
1. With created match, test:
   - Start Match (admin/captain)
   - Report Result:
     - Winner selection
     - Score entry (e.g., 2-1)
     - Optional game length and notes
   - View match history
2. Test match deletion (admin only)
```

**Expected Results:**
- ✅ Match status updates correctly
- ✅ Results properly recorded
- ✅ Only authorized users can modify matches
- ✅ Match history preserved

can't test this due to previous step being unavailable

### 6. Draft System (Advanced)

#### Test 6.1: Draft Session Creation
**Priority:** MEDIUM (Backend Complete, Frontend Basic)
```
1. As admin, create draft session via API:
   POST /api/draft
   {
     "matchId": "match_xxx",
     "team1CaptainId": "user_xxx", 
     "team2CaptainId": "user_yyy"
   }
2. Verify draft session created
3. Check access links generated
```

**Expected Results:**
- ✅ Draft session created with proper validation
- ✅ Captain access links generated
- ✅ Initial state set correctly

can't test this due to previous step being unavailable

#### Test 6.2: Draft Operations (API Testing)
**Priority:** MEDIUM
```
1. Test coin toss endpoint
2. Test pick/ban actions
3. Verify real-time Socket.io events
4. Test draft completion flow
```

**Expected Results:**
- ✅ Coin toss determines pick order
- ✅ Pick/ban validation works
- ✅ Real-time updates function
- ✅ Draft completes properly

can't test this due to previous step being unavailable

---

## 🔧 Error Testing & Edge Cases

### Database Connection Issues
```
1. Test with invalid Airtable token
2. Test with missing tables
3. Verify error handling and user messages
```

### User Permission Tests
```
1. Test non-admin accessing admin routes
2. Test non-captain team operations
3. Test accessing other users' data
```

### Data Validation Tests
```
1. Submit forms with invalid data
2. Test SQL injection attempts
3. Test XSS prevention
4. Verify input sanitization
```

### Session Management Tests
```
1. Test login persistence
2. Test session expiration
3. Test concurrent sessions
4. Test logout functionality
```

---

## 🐛 Common Issues & Solutions

### Issue: "Not Authorized" Airtable Error
**Solution:** 
1. Check Airtable personal token has write permissions
2. Regenerate token with proper scopes
3. Verify base ID is correct

### Issue: Discord OAuth Redirect Error
**Solution:**
1. Check Discord app redirect URI exactly matches
2. Ensure `/api/auth/discord/callback` path included
3. Verify environment variables set correctly

### Issue: Teams Not Appearing
**Solution:**
1. Check user is logged in
2. Verify team creation successful in Airtable
3. Check team ownership/membership

### Issue: Ports Already in Use
**Solution:**
```bash
npx kill-port 3000 3001 4000
```

### Issue: Environment Variables Not Loading
**Solution:**
1. Check `.env` file exists
2. Restart backend service
3. Verify environment not overridden

---

## 📊 Testing Checklist Summary

### Core Functionality (Must Pass)
- [ ] User authentication works
- [ ] Tournament creation/viewing
- [ ] Team registration/management  
- [ ] Team check-in system
- [ ] Basic match operations
- [ ] Admin dashboard access

### Advanced Features (Should Pass)
- [ ] Team invitation system
- [ ] Match result reporting
- [ ] Check-in validation
- [ ] Permission controls
- [ ] Real-time updates

### Error Handling (Good to Test)
- [ ] Invalid input validation
- [ ] Permission denied scenarios
- [ ] Database connection issues
- [ ] Session management

---

## 🎯 Performance Testing

### Load Testing (Optional)
```
1. Create multiple tournaments
2. Register many teams
3. Test with 10+ concurrent users
4. Monitor response times
```

### Browser Compatibility
```
1. Test in Chrome (primary)
2. Test in Firefox
3. Test in Edge
4. Verify mobile responsiveness
```

---

## 📝 Test Results Template

Copy this to document your testing:

```
# Test Results - [Date]

## Environment
- [ ] Development environment confirmed
- [ ] All services running
- [ ] Database connected

## Core Features Status
- [ ] Authentication: ✅/❌
- [ ] Tournament Management: ✅/❌  
- [ ] Team Management: ✅/❌
- [ ] Check-In System: ✅/❌
- [ ] Match Management: ✅/❌
- [ ] Admin Functions: ✅/❌

## Issues Found
1. [Description] - [Severity: Critical/High/Medium/Low]
2. [Description] - [Severity: Critical/High/Medium/Low]

## Notes
[Any additional observations or feedback]
```

---

## 🔄 Next Steps After Testing

1. **Report Issues**: Document any bugs or problems found
2. **Feature Feedback**: Note any usability improvements
3. **Performance**: Report any slow operations
4. **Missing Features**: Identify gaps or needed additions

This testing guide covers all currently implemented features. The system should handle the complete tournament lifecycle from creation through team management, check-in, and basic match operations!