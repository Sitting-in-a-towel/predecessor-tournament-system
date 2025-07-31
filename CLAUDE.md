# Claude Development Assistant Configuration

## Project Overview
This is the Predecessor Tournament Management System - a web-based platform for managing esports tournaments with real-time features.

## CRITICAL: Database Migration Status
**⚠️ POSTGRESQL ONLY - NO AIRTABLE ⚠️**
- Migration completed: July 29-30, 2025
- ALL Airtable code has been removed
- Database: PostgreSQL (local: localhost:5432, production: Render)
- Service file: `backend/services/postgresql.js`

## Architecture
- **Frontend**: React 18 (Port 3000)
- **Backend**: Node.js/Express (Port 3001) 
- **Database**: PostgreSQL ONLY (no Airtable)
- **Auth**: Discord OAuth2
- **Real-time**: Socket.io

## Environment Files (CHECK ALL OF THESE)
```
/ (root)
├── .env                        # Root environment
├── backend/
│   └── .env                    # Backend-specific (TAKES PRECEDENCE)
├── frontend/
│   ├── .env                    # Frontend local dev
│   └── .env.production         # Frontend production
```

## Current Discord OAuth Credentials
- Client ID: `1398158696797700096`
- Client Secret: `76AdCNAl2UxVitiYpZO-mUUD03ekh6DU`
- Redirect URIs:
  - Local: `http://localhost:3001/api/auth/discord/callback`
  - Production: `https://predecessor-tournament-api.onrender.com/api/auth/discord/callback`

## API Endpoints Structure
Frontend MUST use `/api` prefix:
- ✅ `https://predecessor-tournament-api.onrender.com/api/auth/me`
- ❌ `https://predecessor-tournament-api.onrender.com/auth/me`

## Deployment Information
- **Frontend**: Netlify (https://ocl-predecessor.netlify.app)
- **Backend**: Render (https://predecessor-tournament-api.onrender.com)
- **Git**: Connected to https://github.com/Sitting-in-a-towel/predecessor-tournament-system
- **Auto-deploy**: Both Netlify and Render auto-deploy on git push

## Development Commands

### Start Development Environment
```bash
# Start UI Launcher (recommended)
./launchers/Start_Development_Environment.bat

# Or start services individually
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
npm run dev           # Both services
```

### Git Deployment
```bash
git add .
git commit -m "Your message"
git push origin main
# Triggers auto-deploy on both Netlify and Render
```

## Common Issues & Solutions

### Discord OAuth "invalid_client" Error
1. Check ALL .env files (especially backend/.env)
2. Verify Discord Developer Portal credentials
3. Ensure redirect URIs are whitelisted in Discord app
4. Check if backend is loading correct .env file

### Session Not Persisting (Production)
1. Verify SESSION_STORE=postgres in Render env vars
2. Check if cookies are blocked (cross-domain issue)
3. Ensure trust proxy is enabled for Render
4. Verify FRONTEND_URL has no trailing slash

### API 404 Errors
1. Check if frontend is using correct API URL with `/api`
2. Verify REACT_APP_API_URL in frontend env files
3. Ensure backend routes include /api prefix

### CORS Errors
1. Check FRONTEND_URL in backend (no trailing slash)
2. Verify credentials: true in CORS config
3. Ensure sameSite and secure cookie settings match environment

## PostgreSQL Configuration
- **Local**:
  - Host: localhost
  - Port: 5432
  - Database: predecessor_tournaments
  - User: postgres
  - Password: Antigravity7@!89

- **Production**:
  - Uses DATABASE_URL from Render
  - Auto-configured with SSL

## File Structure
```
H:\Project Folder\Predecessor website\
├── frontend/          # React application
├── backend/           # Node.js API
├── launcher-app/      # Development UI launcher
├── scripts/           # Setup and deployment scripts
├── documentation/     # Project documentation
└── launchers/        # Batch file launchers
```

## Testing Checklist
When debugging issues, always check:
- [ ] Which .env file is being used?
- [ ] Are credentials consistent across all .env files?
- [ ] Is the frontend calling the correct API endpoints?
- [ ] Are sessions persisting (check logs)?
- [ ] Is CORS configured correctly?
- [ ] Are cookies being set/sent?

## Key Endpoints
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- UI Launcher: http://localhost:4000
- Admin Dashboard: http://localhost:3000/admin/dashboard

## Monitoring & Logs
- Backend logs: `backend/logs/` directory
- Render logs: https://dashboard.render.com/web/srv-ctqhqelds78s73aeb6e0/logs
- Netlify logs: https://app.netlify.com/sites/ocl-predecessor/deploys

## Session Configuration
- Local: Memory store (default)
- Production: PostgreSQL store (SESSION_STORE=postgres)
- Cookie settings differ between environments for security

## Notes for Claude
- NEVER add Airtable code - migration is complete
- Always check ALL .env files when debugging
- Backend .env takes precedence over root .env
- Use git push to deploy (don't ask how to deploy)
- Frontend and backend are on different domains in production
- Always verify environment variables in deployment dashboards