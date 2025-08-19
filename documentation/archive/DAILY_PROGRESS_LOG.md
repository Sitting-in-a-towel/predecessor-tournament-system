# Daily Progress Log

## July 30, 2025

### Morning Session (6:00 PM - 7:40 PM AEST)

#### Issues Identified:
1. **Discord OAuth "invalid_client" error** both locally and in production
2. **Frontend calling wrong API endpoints** (missing /api prefix in production)

#### Root Causes Found:
1. **Multiple .env files with conflicting values**:
   - Root .env had correct Discord secret
   - Backend .env had OLD Discord secret
   - Backend was loading its own .env first, overriding the correct values

2. **Production environment variable missing /api**:
   - Local: `REACT_APP_API_URL=http://localhost:3001/api` ✅
   - Production: `REACT_APP_API_URL=https://predecessor-tournament-api.onrender.com` ❌
   - Fixed to: `REACT_APP_API_URL=https://predecessor-tournament-api.onrender.com/api` ✅

#### Actions Taken:
1. Updated `backend/.env` Discord secret to match production
2. Added PostgreSQL configuration to `backend/.env`
3. Updated Netlify environment variable to include `/api`
4. Created documentation to track migration status
5. Fixed pgAdmin4 launcher error message

#### Current Status:
- Local Discord OAuth: ✅ Working
- Production Discord OAuth: ⏳ Pending Netlify redeploy
- Database: ✅ PostgreSQL fully operational
- All Airtable references: ✅ Removed

#### Lessons Learned:
- Always check ALL .env files in the project (root, backend, frontend)
- Document environment variable changes immediately
- Test both local and production after any auth changes

## Previous Sessions (Summary)

### July 29, 2025
- Completed PostgreSQL migration from Airtable
- Deployed frontend to Netlify
- Deployed backend to Render
- Set up PostgreSQL database on Render
- Multiple attempts to fix Discord OAuth (was using wrong secret)

### Key Reminders:
1. **NO AIRTABLE** - Migration is complete, use PostgreSQL only
2. Check all .env files when debugging authentication issues
3. Frontend API calls must include `/api` prefix
4. Always document environment variable changes