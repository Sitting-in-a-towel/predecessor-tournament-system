# Bug Tracker - Predecessor Tournament Management System

## 🐛 ACTIVE BUGS (High Priority)

### BUG-001: Teams Tab Not Showing Registered Teams
- **Status**: 🔴 OPEN  
- **Priority**: HIGH
- **Reporter**: User
- **Date Reported**: August 1, 2025
- **URL**: `http://localhost:3000/tournaments/{id}` → Teams Tab
- **Screenshot**: `documentation/Troubleshooting reference images/2025-08-01 19_53_33-Predecessor Tournament Management.png`

**Description**: 
When viewing tournament details and clicking the "Teams" tab, it shows "No teams have registered for this tournament yet" even when teams ARE registered.

**Affected Area**: 
- ALL tournaments (not just specific ones)
- Tournament details page → Teams tab

**Expected Behavior**: 
Should display list of registered teams with team names, captain info, registration date

**Actual Behavior**: 
Shows empty state message regardless of actual registrations

**Technical Details**:
- Teams tab shows "Teams (0)" in tab header
- Database likely has registrations but frontend not loading them
- Possible API endpoint issue or frontend query problem

---

### BUG-002: Tournament Registration Missing Existing Teams
- **Status**: 🔴 OPEN
- **Priority**: HIGH  
- **Reporter**: User
- **Date Reported**: August 1, 2025

**Description**:
Tournament registration only shows options for "Register New Team" and "Solo Player", but missing dropdown/option to register existing teams.

**Expected Behavior**:
Should show existing teams user is captain/member of for registration

**Actual Behavior**: 
Only shows new team creation options

**Notes**:
- User mentioned "several places to register a team" - need clarification on which registration flow

---

## 🛠️ BUG INVESTIGATION PROCESS

### For BUG-001 (Teams Tab):
1. **Check API Endpoint**: Does `/api/tournaments/{id}/teams` return data?
2. **Check Database**: Are registrations actually saved in `tournament_registrations` table?
3. **Check Frontend Component**: Is teams data being loaded and displayed correctly?
4. **Check SQL Query**: Is the JOIN between tournaments/teams/registrations correct?

### Next Steps:
1. Debug the Teams tab API endpoint
2. Verify database has registration data
3. Check frontend Teams component loading logic

---

## 📋 BUG TEMPLATE

```markdown
### BUG-XXX: [Brief Description]
- **Status**: 🔴 OPEN / 🟡 IN PROGRESS / 🟢 FIXED
- **Priority**: HIGH / MEDIUM / LOW
- **Reporter**: [Name]
- **Date Reported**: [Date]
- **URL/Location**: [Where bug occurs]
- **Screenshot**: [Path to screenshot if available]

**Description**: 
[What is wrong]

**Expected Behavior**: 
[What should happen]

**Actual Behavior**: 
[What actually happens]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Technical Details**:
- [Any relevant technical info]
- [Console errors, API failures, etc.]
```

---

## 📊 BUG STATISTICS
- **Total Open**: 2
- **Total High Priority**: 2
- **Avg Resolution Time**: TBD
- **Last Updated**: August 1, 2025