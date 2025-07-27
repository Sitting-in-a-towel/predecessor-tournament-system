# Claude Development Assistant Configuration

## Project Overview
This is the Predecessor Tournament Management System - a web-based platform for managing esports tournaments with real-time features.

## Architecture
- **Frontend**: React 18 (Port 3000)
- **Backend**: Node.js/Express (Port 3001) 
- **Database**: Airtable (tournament data) + Supabase (sessions)
- **Auth**: Discord OAuth2
- **Real-time**: Socket.io

## Development Commands

### Start Development Environment
```bash
# Start UI Launcher (recommended)
./launchers/Start_UI_Launcher_Real.bat

# Or start services individually
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
npm run dev           # Both services
```

### Testing Commands
```bash
# Run all tests
npm test

# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Build verification
npm run build:frontend
```

### Deployment Commands
```bash
# Setup deployment
./scripts/deploy-setup.bat

# Professional setup
./scripts/setup-professional.bat
```

### Database Management
```bash
# Setup Airtable tables
./scripts/Setup_Database.bat

# Verify connection
node backend/scripts/test-connection.js
```

## Common Issues & Solutions

### Port Conflicts
```bash
# Kill processes on ports 3000/3001
npx kill-port 3000 3001
```

### Session Issues
- Check SESSION_SECRET in .env
- Verify DATABASE_URL for Supabase
- Restart backend service

### Airtable Connection
- Verify AIRTABLE_PERSONAL_TOKEN has write permissions
- Check AIRTABLE_BASE_ID is correct
- Ensure tables exist: Users, Tournaments, Teams, Heroes, DraftSessions

### Discord OAuth
- Verify DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
- Check redirect URI matches exactly
- Ensure application is not rate limited

## File Structure
```
H:\Project Folder\Predecessor website\
├── frontend/          # React application
├── backend/           # Node.js API
├── launcher-app/      # Development UI launcher
├── scripts/           # Setup and deployment scripts
├── docs/             # Documentation and guides
└── launchers/        # Batch file launchers
```

## Environment Files
- `.env` - Development environment variables
- `docs/env_free.txt` - Free hosting template
- `docs/env_production.txt` - Production template

## Key Endpoints
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- UI Launcher: http://localhost:4000
- Admin Dashboard: http://localhost:3000/admin/dashboard

## Monitoring & Logs
- Backend logs: `logs/` directory
- Frontend console: Browser DevTools
- UI Launcher: Real-time log monitoring

## Deployment Targets
- **Frontend**: Netlify (free)
- **Backend**: Render (free tier)
- **Database**: Supabase PostgreSQL (sessions) + Airtable (data)

## Notes for Claude
- Always run launchers from project root directory
- Use UI launcher for unified development experience
- Check logs directory for error debugging
- Verify environment variables before troubleshooting
- Run tests before making significant changes