# ID Format Troubleshooting Guide

## Common ID Format Error Patterns

### 1. **400 Bad Request - "Team ID must be a valid UUID"**

**Symptoms:**
- Admin check-in buttons failing
- Team-related API calls returning 400 errors
- Frontend shows "failed to update" messages

**Root Cause:**
API validation expects UUID format but receives string team_id format.

**Examples:**
```
Expected: UUID like "3e3e02ca-11ee-4e70-8162-e14524bd4ca1"
Received: String like "team_1754039608317_q04z7jynx"
```

**Fix:**
```javascript
// WRONG - expects UUID
param('teamId').isUUID().withMessage('Team ID must be a valid UUID')

// CORRECT - accepts string format
param('teamId').notEmpty().withMessage('Team ID is required')
```

**Files to check:**
- `backend/routes/tournament-registration.js`
- `backend/routes/teams.js`
- Any endpoint receiving team_id parameters

### 2. **Database Join Failures - "column does not exist"**

**Symptoms:**
- Queries returning empty results
- "column does not exist" errors
- Data relationships broken

**Root Cause:**
Database joins mixing UUID and string ID formats.

**Examples:**
```sql
-- WRONG - mixing UUID with string
JOIN teams t ON tr.team_id = t.team_id

-- CORRECT - UUID to UUID relationship
JOIN teams t ON tr.team_id = t.id
```

**Fix Pattern:**
- Foreign keys in database always reference UUID primary keys
- `tr.team_id` references `teams.id` (UUID)
- `t.captain_id` references `users.id` (UUID)

### 3. **Frontend Display Issues - Undefined team IDs**

**Symptoms:**
- Teams showing as undefined in lists
- API calls with undefined parameters
- Frontend console errors about missing IDs

**Root Cause:**
Frontend using wrong ID field for display or API calls.

**Examples:**
```javascript
// WRONG - uses UUID for API calls
axios.get(`/api/teams/${team.id}`)

// CORRECT - uses string team_id for API calls  
axios.get(`/api/teams/${team.team_id}`)
```

**Fix Pattern:**
- Use `team.team_id` for frontend display and API calls
- Use `team.id` only for internal React keys
- Map API responses to correct field names

### 4. **Authentication Issues - "User ID not found"**

**Symptoms:**
- Login working but API calls failing
- "User ID not found" errors
- Session data incomplete

**Root Cause:**
Mixing `req.user.id` (UUID) with `req.user.userID` (string) inconsistently.

**Examples:**
```javascript
// Check which format your session uses
console.log('User UUID:', req.user.id);        // UUID format
console.log('User ID:', req.user.userID);      // String format

// Use appropriate format for database queries
const userId = req.user.id || req.user.userID; // Fallback pattern
```

## Quick Diagnosis Checklist

When encountering ID-related errors:

### Step 1: Identify the Error Pattern
- [ ] 400 validation error → Check API parameter validation
- [ ] Database query error → Check JOIN statements
- [ ] Frontend undefined → Check field name mapping
- [ ] Authentication error → Check user ID format usage

### Step 2: Find the Problematic Code
```bash
# Search for problematic patterns
grep -r "\.isUUID()" backend/routes/     # Find UUID validations
grep -r "team\.id[^_]" frontend/src/     # Find UUID usage in frontend
grep -r "JOIN.*team_id.*team_id" backend/ # Find wrong joins
```

### Step 3: Apply the Fix Pattern
- **API validation**: Use `.notEmpty()` instead of `.isUUID()` for team/user IDs
- **Database joins**: Always join UUID to UUID (`tr.team_id = t.id`)
- **Frontend calls**: Use string IDs (`team.team_id`, `user.user_id`)
- **Authentication**: Use consistent user ID format throughout request handler

## Prevention Patterns

### Always Use These Patterns:

**Database Relationships:**
```sql
-- Teams to Users (captain relationship)
ALTER TABLE teams ADD CONSTRAINT fk_teams_captain 
  FOREIGN KEY (captain_id) REFERENCES users(id);

-- Tournament registrations to Teams
ALTER TABLE tournament_registrations ADD CONSTRAINT fk_reg_team
  FOREIGN KEY (team_id) REFERENCES teams(id);
```

**API Response Mapping:**
```javascript
// Always map to display-friendly field names
teams: registrationsResult.rows.map(reg => ({
  id: reg.id,                    // Registration UUID for React keys
  team_id: reg.team_ref_id,      // String team_id for frontend
  team_name: reg.team_name,
  // ... other fields
}))
```

**Frontend API Calls:**
```javascript
// Always use string IDs in API calls
const response = await axios.get(`${API_BASE_URL}/teams/${team.team_id}`);
const result = await axios.post(`${API_BASE_URL}/tournaments/${tournamentId}/admin-toggle-checkin/${team.team_id}`);
```

**Backend Validation:**
```javascript
// String IDs - use notEmpty()
param('teamId').notEmpty().withMessage('Team ID is required'),
param('userId').notEmpty().withMessage('User ID is required'),

// UUID IDs - use isUUID() 
param('tournamentId').isUUID().withMessage('Tournament ID must be a valid UUID'),
```

## Testing ID Format Fixes

After making ID format changes, test:

1. **Database queries** - Run in psql to verify joins work
2. **API endpoints** - Test with actual string/UUID values  
3. **Frontend display** - Check team lists show correct data
4. **Admin functions** - Verify admin buttons work without validation errors

## Files Most Likely to Have ID Issues

**High Priority:**
- `backend/routes/tournament-registration.js`
- `backend/routes/teams.js`
- `frontend/src/components/Tournament/TournamentCheckIn.js`
- `backend/services/postgresql.js`

**Medium Priority:**
- `backend/routes/admin.js`
- `frontend/src/pages/Teams.js`
- Any component using team or user data

Remember: When in doubt, check the ID Format Reference Guide in CLAUDE.md for the correct patterns to use.