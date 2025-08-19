# Draft System Issues Analysis & Troubleshooting Guide

**Last Updated:** August 7, 2025  
**Status:** Critical Issues Identified - Database Migration State  
**Priority:** HIGH - Core functionality broken

## 📋 Current Issues Summary

### Issue #1: Draft Creation Success But No Display
- **Status**: CRITICAL - Core functionality broken
- **Symptom**: Draft creation shows success message but draft doesn't appear on tournament page
- **Screenshots**: `H:\Project Folder\debug-drafts-tab.png`, `H:\Project Folder\debug-after-draft-attempt.png`

### Issue #2: Admin Panel Shows Phantom Drafts
- **Status**: HIGH - Data integrity issue
- **Symptom**: Admin panel shows 80 draft sessions despite database cleanup
- **Impact**: Confusing admin interface, potential data inconsistency

### Issue #3: Tournament Drafts Section Not Working
- **Status**: HIGH - UI/UX broken
- **Symptom**: Drafts tab exists but shows "No draft sessions have been created yet" after successful creation

### Issue #4: User Role Display Issues
- **Status**: MEDIUM - Authorization confusion
- **Impact**: Unclear what different user types (admin/team captain/spectator) should see

---

## 🔍 Root Cause Analysis

### Database Migration State Issues

**Primary Issue: Dual Database System Confusion**

The system is currently in a transitional state between Airtable and PostgreSQL:

1. **Backend Draft Route Analysis**: 
   - `backend/routes/draft.js` contains mixed references to both Airtable and PostgreSQL
   - Lines 240-315 still use `airtableService` for coin toss operations
   - Lines 10-53 use PostgreSQL for draft retrieval
   - This creates inconsistent data flow

2. **Database Schema Mismatch**:
   - PostgreSQL schema expects `match_id` reference in `draft_sessions` table
   - Current frontend sends `tournamentId`, `team1Id`, `team2Id` (registration IDs)
   - Backend attempts to look up teams via tournament registrations (lines 87-97)

3. **API Response vs Frontend Expectations**:
   - Backend returns drafts with `team1_name`, `team2_name` as team names
   - Frontend expects these to be team IDs for comparison
   - This causes the display filtering logic to fail (TournamentDrafts.js lines 254-262)

### Data Flow Problems

**Draft Creation Flow Issues:**

1. **Frontend → Backend**: ✅ Working correctly
   - Frontend correctly sends tournament registration IDs as `team1Id`, `team2Id`

2. **Backend Processing**: ❌ Partial failure
   - Successfully creates draft in PostgreSQL (lines 138-153)
   - Returns success response to frontend
   - But draft data structure doesn't match frontend expectations

3. **Backend → Frontend (Display)**: ❌ Failing
   - GET `/api/draft?tournamentId=X` returns drafts with incorrect team name format
   - Frontend filtering logic fails to match teams (TournamentDrafts.js lines 63-68)

### Caching and State Issues

**Admin Panel Phantom Drafts:**
- The admin panel loads all drafts with `GET /api/draft` (no tournament filter)
- If old data exists from previous Airtable system, it shows phantom records
- The filter logic shows empty by default but counts all records

---

## 🧪 Step-by-Step Reproduction Guide

### Environment Setup Required:
```bash
# 1. Ensure PostgreSQL is running
netstat -ano | findstr :5432

# 2. Ensure NocoDB is running  
netstat -ano | findstr :8080

# 3. Check database has required tables
cd "H:\Project Folder\Predecessor website\backend"
node -e "const pg = require('./services/postgresql'); pg.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \\'public\\' AND table_name IN (\\'draft_sessions\\', \\'teams\\', \\'tournaments\\', \\'tournament_registrations\\')').then(r => console.log(r.rows))"
```

### Reproduce Draft Creation Issue:

1. **Login as Admin**:
   - Navigate to http://localhost:3000/tournaments
   - Click "View Details" on "test admin panel" tournament

2. **Attempt Draft Creation**:
   - Click "Drafts" tab
   - Select a match from dropdown (if available)
   - Click "Create Draft Session"
   - Observe: Success message appears

3. **Verify Issue**:
   - Refresh page or navigate away and back
   - Observe: "No draft sessions have been created yet" still shows
   - Check admin panel: Drafts exist but don't appear in tournament view

---

## 🔧 Technical Fix Recommendations

### Priority 1: Fix Backend Data Flow

**File**: `backend/routes/draft.js`

1. **Clean up mixed database references**:
   - Remove all Airtable service calls (lines 240-315, 339-551)
   - Implement PostgreSQL versions of coin toss and draft actions

2. **Fix team name mapping in draft retrieval**:
   ```javascript
   // Current problematic query (lines 14-28)
   SELECT DISTINCT
     ds.*,
     t1.team_name as team1_name,  -- This should be team_id for frontend
     t2.team_name as team2_name,  -- This should be team_id for frontend
     t1.team_id as team1_id,      -- Add actual team_id fields
     t2.team_id as team2_id
   ```

3. **Fix tournament filtering logic**:
   - Current query assumes direct team relationship
   - Need to join through `tournament_registrations` table

### Priority 2: Fix Frontend Display Logic

**File**: `frontend/src/components/Tournament/TournamentDrafts.js`

1. **Fix team matching logic** (lines 63-68):
   ```javascript
   // Current problematic code:
   const hasExistingDraft = uniqueDrafts.some(d => {
     const matchTeam1Id = getTeamId(match.team1);
     const matchTeam2Id = getTeamId(match.team2);
     return (d.team1_id === matchTeam1Id && d.team2_id === matchTeam2Id) ||
            (d.team1_id === matchTeam2Id && d.team2_id === matchTeam1Id);
   });
   ```

2. **Ensure proper team ID comparison**:
   - Backend should return consistent team identifiers
   - Frontend should use same identifier format for matching

### Priority 3: Clean Up Admin Panel

**File**: `frontend/src/components/Admin/DraftManagementModal.js`

1. **Add data cleanup option**:
   - Button to clear old/phantom draft records
   - Better filtering to show only relevant tournaments

2. **Improve default view**:
   - Don't show empty list by default
   - Show meaningful statistics instead

---

## 🧪 Systematic Testing Plan

### Phase 1: Database Verification
```bash
# Test database connectivity and schema
cd "H:\Project Folder\Predecessor website\backend"
node test-draft-creation.js

# Expected: Should complete without errors
```

### Phase 2: API Testing
```bash
# Test draft creation endpoint directly
curl -X POST http://localhost:3001/api/draft \
  -H "Content-Type: application/json" \
  -d '{"tournamentId":"TOURNAMENT_ID","team1Id":"TEAM1_REG_ID","team2Id":"TEAM2_REG_ID"}' \
  --cookie-jar cookies.txt

# Test draft retrieval
curl -X GET "http://localhost:3001/api/draft?tournamentId=TOURNAMENT_ID" \
  --cookie cookies.txt
```

### Phase 3: End-to-End Testing
1. Create tournament with teams
2. Publish bracket with matches
3. Attempt draft creation
4. Verify draft appears in tournament view
5. Verify admin panel shows correct count

---

## 🚨 Critical Fixes Needed Immediately

### 1. Database Migration Completion
- **Priority**: CRITICAL
- **Action**: Complete PostgreSQL migration, remove Airtable dependencies
- **Files**: `backend/routes/draft.js`, `backend/services/postgresql.js`

### 2. Team ID Consistency
- **Priority**: HIGH  
- **Action**: Ensure team identifiers are consistent between API and frontend
- **Impact**: Fixes draft display and creation matching

### 3. Tournament Registration Integration
- **Priority**: HIGH
- **Action**: Properly join tournament registrations in draft queries
- **Impact**: Fixes tournament-specific draft filtering

---

## 📊 User Role Expectations

### Admin Users Should See:
- All tournament drafts across system
- Draft creation tools for any tournament
- Draft management and cleanup tools
- Complete draft statistics in admin panel

### Team Captains Should See:
- Draft creation option for their team's matches
- Access to their team's active drafts
- Draft room entry links for their matches

### Spectators Should See:
- Live spectator links for active drafts
- No creation or management capabilities
- Read-only view of draft status

---

## 📝 Next Steps Priority Order

1. **[CRITICAL]** Fix backend PostgreSQL migration issues
2. **[HIGH]** Resolve team ID mapping inconsistencies  
3. **[HIGH]** Test and verify draft creation flow end-to-end
4. **[MEDIUM]** Clean up admin panel phantom data
5. **[MEDIUM]** Improve user role visibility and permissions
6. **[LOW]** Add better error handling and user feedback

This analysis provides a clear roadmap for resolving the draft system issues systematically.