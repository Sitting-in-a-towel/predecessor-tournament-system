# Systematic Troubleshooting Guide for Tournament Draft System

**Version:** 1.0  
**Last Updated:** August 7, 2025  
**Focus:** Draft system critical issues resolution

## 🚀 Quick Diagnostic Commands

Before starting any troubleshooting, run these commands to assess the current state:

```bash
# 1. Check all services are running
netstat -ano | findstr :3000  # Frontend
netstat -ano | findstr :3001  # Backend  
netstat -ano | findstr :8080  # NocoDB
netstat -ano | findstr :5432  # PostgreSQL

# 2. Check database connection and tables
cd "H:\Project Folder\Predecessor website\backend"
node -e "const pg = require('./services/postgresql'); pg.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \\'public\\' AND table_name LIKE \\'%draft%\\'').then(r => console.log('Draft tables:', r.rows.map(row => row.table_name)))"

# 3. Count current draft sessions
node -e "const pg = require('./services/postgresql'); pg.query('SELECT COUNT(*) as count FROM draft_sessions').then(r => console.log('Total drafts in database:', r.rows[0].count))"

# 4. Test draft creation flow
node test-draft-creation.js
```

## 🔧 Problem-Specific Troubleshooting

### Issue 1: "Draft Creation Success But Doesn't Appear"

**Symptoms:**
- Success toast message appears
- "No draft sessions have been created yet" still shows
- Admin panel might show different count than tournament view

**Diagnosis Steps:**
```bash
# Step 1: Verify draft was actually created
cd "H:\Project Folder\Predecessor website\backend"
node -e "const pg = require('./services/postgresql'); pg.query('SELECT draft_id, team1_captain_id, team2_captain_id, status FROM draft_sessions ORDER BY created_at DESC LIMIT 5').then(r => console.log('Recent drafts:', r.rows))"

# Step 2: Test the tournament-specific query
node -e "const pg = require('./services/postgresql'); const tournamentId = '4fe28137-a1c3-426e-bfa0-1ae9c54f58a0'; pg.query('SELECT ds.*, t1.team_name as team1_name, t2.team_name as team2_name FROM draft_sessions ds LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id WHERE EXISTS (SELECT 1 FROM tournament_registrations tr WHERE tr.tournament_id = \$1 AND (tr.team_id = t1.id OR tr.team_id = t2.id))', [tournamentId]).then(r => console.log('Tournament drafts:', r.rows.length))"
```

**Likely Root Cause:** Mixed database service calls or incorrect team ID mapping

**Fix Steps:**
1. **Check backend draft route** (`backend/routes/draft.js`):
   - Lines 240-315: Remove Airtable service calls
   - Lines 10-53: Fix PostgreSQL query team mapping
   
2. **Verify team ID consistency**:
   - Backend should return `team1_id` and `team2_id` (string format)
   - Frontend uses these for filtering matches

### Issue 2: "Admin Panel Shows 80 Drafts"

**Symptoms:**
- Admin shows high draft count despite cleanup
- "Show All" button reveals many old drafts
- Tournament view shows zero drafts

**Diagnosis Steps:**
```bash
# Check what drafts exist and where they come from
node -e "const pg = require('./services/postgresql'); pg.query('SELECT draft_id, created_at, team1_captain_id, team2_captain_id FROM draft_sessions ORDER BY created_at DESC').then(r => console.log('All drafts:', r.rows.length, 'First 3:', r.rows.slice(0,3)))"

# Check team relationships
node -e "const pg = require('./services/postgresql'); pg.query('SELECT ds.draft_id, t1.team_name as team1, t2.team_name as team2 FROM draft_sessions ds LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id LEFT JOIN teams t2 ON ds.team2_captain_id = t2.captain_id LIMIT 10').then(r => console.log('Draft team mapping:', r.rows))"
```

**Likely Root Cause:** Old data from previous system or incorrect default filtering

**Fix Steps:**
1. **Clean phantom data**:
   ```sql
   -- Connect to PostgreSQL and run:
   DELETE FROM draft_sessions WHERE created_at < '2025-08-01' AND status = 'Waiting';
   ```

2. **Fix admin panel filtering** (`frontend/src/components/Admin/DraftManagementModal.js`):
   - Lines 218-222: Default to show no drafts, require explicit filtering
   - Add cleanup button for old drafts

### Issue 3: "Team Captain Can't See Drafts"

**Symptoms:**
- Draft created successfully 
- Captain should see "Your Active Draft" section
- Section doesn't appear or shows wrong information

**Diagnosis Steps:**
```bash
# Check user authentication and team relationships
# In browser console (F12), run:
console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));

# Check team captain relationships
node -e "const pg = require('./services/postgresql'); pg.query('SELECT t.team_name, t.captain_id, u.discord_username FROM teams t LEFT JOIN users u ON t.captain_id = u.id LIMIT 10').then(r => console.log('Team captains:', r.rows))"
```

**Likely Root Cause:** User authentication or team captain mapping issues

**Fix Steps:**
1. **Verify captain authentication** (`frontend/src/components/Tournament/TournamentDrafts.js`):
   - Lines 254-262: Check `getMyTeamDraft()` function logic
   - Ensure user ID format matches database format

2. **Check session data**:
   - Verify user object contains correct ID format
   - Check team captain relationships in database

## 🧪 Systematic Testing Protocol

### Pre-Fix Testing
```bash
# 1. Document current state
cd "H:\Project Folder\Predecessor website"

# Take screenshots of current broken state
# Start development environment
.\launchers\Start_Development_Environment.bat

# Navigate to http://localhost:3000/tournaments
# Click on test tournament -> Drafts tab
# Attempt to create draft and document behavior
```

### Post-Fix Testing
```bash
# 1. Backend API testing
curl -X GET "http://localhost:3001/api/draft?tournamentId=TOURNAMENT_ID" \
  -H "Cookie: connect.sid=SESSION_COOKIE" | jq '.'

# 2. Draft creation testing  
curl -X POST "http://localhost:3001/api/draft" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=SESSION_COOKIE" \
  -d '{"tournamentId":"TOURNAMENT_ID","team1Id":"TEAM1_REG_ID","team2Id":"TEAM2_REG_ID"}'

# 3. End-to-end browser testing
# - Login as admin
# - Create draft
# - Verify appears in tournament view
# - Check admin panel shows correct count
# - Login as team captain
# - Verify can see active draft
```

### Automated Test Suite
```bash
# Run existing tests
cd "H:\Project Folder\Predecessor website"
npx playwright test tests/debug-draft-failure.spec.js

# Run backend tests if they exist
cd backend && npm test

# Run frontend tests
cd frontend && npm test -- --watchAll=false
```

## 🚨 Emergency Recovery Procedures

### If Draft System Completely Breaks
1. **Stop all services**:
   ```bash
   taskkill /f /im node.exe
   ```

2. **Check database integrity**:
   ```bash
   cd "H:\Project Folder\Predecessor website\backend"
   node -e "const pg = require('./services/postgresql'); pg.query('SELECT COUNT(*) FROM draft_sessions WHERE status = \\'Waiting\\'').then(r => console.log('Active drafts:', r.rows[0].count))"
   ```

3. **Reset to clean state if needed**:
   ```sql
   -- CAUTION: This deletes all draft data
   DELETE FROM draft_sessions WHERE status IN ('Waiting', 'In Progress');
   ```

4. **Restart services**:
   ```bash
   .\launchers\Start_Development_Environment.bat
   ```

### If Database Connection Lost
1. **Check PostgreSQL service**:
   ```bash
   # Windows Services -> postgresql-x64-[version] should be Running
   net start postgresql-x64-16  # Adjust version number
   ```

2. **Check NocoDB connection**:
   ```bash
   # Navigate to http://localhost:8080
   # Should show NocoDB dashboard
   ```

3. **Test connection manually**:
   ```bash
   cd "H:\Project Folder\Predecessor website\backend"
   node -e "const pg = require('./services/postgresql'); pg.query('SELECT NOW()').then(r => console.log('DB time:', r.rows[0].now)).catch(e => console.error('DB error:', e.message))"
   ```

## 📋 Success Verification Checklist

After implementing fixes, verify these work:

### Admin User Flow:
- [ ] Can access admin panel without errors
- [ ] Sees accurate draft count (not phantom 80)
- [ ] Can create new drafts successfully
- [ ] Created drafts appear in tournament view immediately
- [ ] Can access draft management tools

### Team Captain Flow:
- [ ] Can see draft creation option for their matches
- [ ] Created drafts appear in "Your Active Draft" section
- [ ] Can click "Enter Draft Room" button
- [ ] Draft status updates correctly

### Spectator Flow:
- [ ] Can see active draft sessions
- [ ] Can click "Watch Live" for ongoing drafts
- [ ] Spectator view loads without errors

### Data Integrity:
- [ ] Database queries return expected results
- [ ] No mixed service calls remain (Airtable/PostgreSQL)
- [ ] Team ID mapping consistent throughout system
- [ ] Tournament filtering works correctly

## 🔄 Ongoing Monitoring

### Daily Health Checks:
```bash
# Check draft system health
cd "H:\Project Folder\Predecessor website\backend"

# Verify active drafts
node -e "const pg = require('./services/postgresql'); pg.query('SELECT status, COUNT(*) as count FROM draft_sessions GROUP BY status').then(r => console.log('Draft status counts:', r.rows))"

# Check for orphaned data
node -e "const pg = require('./services/postgresql'); pg.query('SELECT ds.draft_id FROM draft_sessions ds LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id WHERE t1.id IS NULL LIMIT 5').then(r => console.log('Orphaned drafts:', r.rows.length))"
```

### Performance Monitoring:
- Monitor draft creation response times
- Check for memory leaks in long-running drafts
- Verify WebSocket connections for real-time features

---

**This guide provides systematic approaches to diagnose and fix the tournament draft system issues. Use in conjunction with the detailed technical analysis in DRAFT_SYSTEM_ISSUES_ANALYSIS.md.**