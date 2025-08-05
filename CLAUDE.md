# Claude Development Assistant Configuration

## Project Overview
This is the Predecessor Tournament Management System - a web-based platform for managing esports tournaments with real-time features.

## CRITICAL: Database Migration Status
**⚠️ POSTGRESQL + NOCODB - NO AIRTABLE ⚠️**
- Migration completed: July 29-30, 2025
- ALL Airtable code has been removed
- Database: PostgreSQL (local: localhost:5432, production: Render)
- Database UI: NocoDB (local: localhost:8080) - Web interface for PostgreSQL
- Service file: `backend/services/postgresql.js`
- **Omeda.city Migration**: Auto-runs on server startup (August 1, 2025)

## CRITICAL: Admin Issues Identified
**⚠️ ADMIN FUNCTIONALITY HAS ISSUES ⚠️**
- Admin dashboard showing all 0s for statistics in production
- "Failed to load dashboard statistics" error on page load
- Admin page not working in dev/local environment
- Recent activity showing empty
- Root cause: Likely authentication/authorization issues with admin endpoints

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
# Simplified launcher (3 windows only) - RECOMMENDED
./launchers/Start_Development_Simple.bat

# Full launcher (5 windows, includes unused UI)
./launchers/Start_Development_Environment.bat

# Or start services manually:
# 1. Check PostgreSQL is running (Windows Service)
# 2. Start NocoDB: cd NocoDB && Noco-win-x64.exe
# 3. Start Backend: cd backend && npm run dev
# 4. Start Frontend: cd frontend && npm start
```

### What Actually Runs
- **PostgreSQL**: Windows Service (must be running separately)
- **NocoDB**: Web UI for PostgreSQL database (localhost:8080)
- **Backend**: Node.js/Express API (localhost:3001)
- **Frontend**: React application (localhost:3000)

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

## UI/UX Style Guide

### **CRITICAL: Modal Anti-Pattern Prevention**
**❌ NEVER DO THIS - White Bar Issues:**
- Setting modal header background to white or light colors
- Using default browser/framework modal headers without custom styling
- Missing dark theme styling on modal containers
- Inconsistent background colors between modal parts

**✅ ALWAYS DO THIS - Proper Modal Design:**
```css
/* Modal Container */
backgroundColor: '#1a1a1a'
border: '1px solid #333'
borderRadius: '8px'

/* Modal Header - CRITICAL */
backgroundColor: '#1a1a1a'  // Same as modal container
borderBottom: '1px solid #333'
color: '#fff'

/* Modal Content */
backgroundColor: '#1a1a1a'
color: '#fff'
```

### **Complete Modal Template:**
- **Background**: Dark theme (#1a1a1a)
- **Border**: #333 (dark gray) for all elements
- **Text**: White (#fff) for labels and headings
- **Header**: Dark background (#1a1a1a) matching modal, NO white bars
- **Form fields**: White background with dark borders (#ddd)
- **Buttons**: Primary blue (#007bff), Secondary light gray (#f8f9fa)
- **Overlay**: Semi-transparent black (rgba(0, 0, 0, 0.5))
- **Border radius**: 8px for rounded corners
- **Box shadow**: 0 4px 20px rgba(0, 0, 0, 0.5)

### **Form Styling Standards:**
- **Labels**: White text (#fff), bold font-weight
- **Input fields**: White background, padding 8px, border-radius 4px, border: 1px solid #ddd
- **Select dropdowns**: backgroundColor: '#background-color' (dark), color: '#fff'
- **Help text**: Light gray (#666), font-size 12px
- **Spacing**: 15px margin between form groups
- **Buttons**: Consistent hover effects and transitions

### **Card/Section Styling:**
- **Background**: var(--surface-color) 
- **Border**: 1px solid var(--border-color)
- **Border radius**: var(--border-radius)
- **Padding**: 2rem
- **Box shadow**: var(--shadow)
- **Headers**: var(--primary-color) with bottom border
- **Grid layouts**: Use CSS Grid with proper gap spacing

### **Color Palette:**
- **Primary dark**: #1a1a1a (var(--background-color))
- **Surface**: #36393f (var(--surface-color)) 
- **Border gray**: #333 (#4f545c var(--border-color))
- **Text white**: #fff (var(--text-color))
- **Text secondary**: #b3b3b3 (var(--text-secondary))
- **Primary blue**: #5865f2 (var(--primary-color))
- **Success**: #57f287 (var(--success-color))
- **Error**: #ed4245 (var(--error-color))
- **Warning**: #fee75c (var(--warning-color))

## Tournament Registration System
- **Database**: `tournament_registrations` table stores team registrations
- **Backend Endpoints**: 
  - `POST /api/tournaments/:id/register-team` - Register existing team
  - `GET /api/tournaments/:id/registrations` - Get registered teams
- **Frontend**: Tournament registration modal with existing team dropdown
- **Teams Tab**: Shows registered teams with captain info and registration date

## Omeda.city Integration
- **Database Fields**: Added to `users` table:
  - `omeda_player_id` - Player ID for API calls
  - `omeda_profile_data` - Cached profile data (JSONB)
  - `omeda_last_sync` - Last sync timestamp
  - `omeda_sync_enabled` - Auto-sync preference
- **Game Data**: `omeda_game_data` table for match history storage
- **Profile UI**: Connect/disconnect/sync interface in Profile page
- **Future**: Admin tools for bulk data sync, API rate limiting

## Profile Page Layout
- **Collapsible Sections**: Account management details can be expanded/collapsed
- **Compact Design**: Invitations and preferences shown as summaries
- **Full Details**: Shown when account management section is expanded
- **Responsive**: Grid layouts adapt to screen size

## Current Status & Issues (August 1, 2025)

### ✅ WORKING Features
- **Authentication**: Discord OAuth login/logout
- **Profile Management**: User profiles with collapsible sections
- **Omeda.city Integration**: Player stats, favorite hero/role (production working)
- **Team Management**: Create teams, send/receive invitations
- **Tournament Registration**: Users can register teams for tournaments
- **Tournament Viewing**: Browse tournaments, view details
- **UI/UX**: Dark theme, responsive design, proper modal styling

### 🚨 BROKEN Features (Need Immediate Attention)
- **Admin Dashboard**: All statistics showing 0, authentication issues
- **Admin Endpoints**: Not properly authenticating admin users
- **Tournament Check-in**: Tab functionality not implemented
- **Tournament Brackets**: Not implemented
- **Tournament Matches**: Not implemented
- **System Health Monitoring**: Not accurately reflecting status

### 🔧 NEXT PRIORITIES (In Order)
1. **Fix Admin Authentication** - Admin endpoints failing auth checks
2. **Fix Admin Dashboard Statistics** - Connect to real database queries
3. **Fix Tournament Registration** - "Failed to register team for tournament" error
4. **Admin Team Visibility** - Admins can only see teams they created, not all teams
5. **Implement Tournament Check-in** - Allow teams to check in before tournaments
6. **Fix Tournament Tabs** - Brackets, matches, standings
7. **Implement Bracket Generation** - Create tournament brackets

### 🐛 KNOWN ISSUES
- Admin page not working in dev/local environment
- Production admin dashboard shows "Failed to load dashboard statistics"
- All admin statistics showing 0 values
- Recent activity feed empty
- Admin user management may have authentication issues

## Database Management & Adding Test Data

### **CRITICAL: How to Add Teams/Data to Databases**

**❌ NEVER manually add data through NocoDB interface** - This causes relationship issues and incomplete records.

**✅ ALWAYS use proper scripts or API endpoints:**

#### **For Local/Development Database:**
- Use existing scripts in `backend/scripts/add-test-teams.js`
- This handles all relationships and registrations correctly
- Run with: `cd backend && node scripts/add-test-teams.js`

#### **For Production Database (Render):**
- **Method 1 (Recommended)**: Use API endpoint
  ```bash
  curl -X POST "https://predecessor-tournament-api.onrender.com/api/admin-tools/add-test-teams"
  ```
- **Method 2**: Direct database connection using production DATABASE_URL
- **NEVER** try to connect locally to production - Use the API endpoint

#### **Available Admin Tools Endpoints:**
- `POST /api/admin-tools/add-test-teams` - Adds 10 test teams to current database
- Creates teams with proper captain relationships
- Auto-registers teams to existing tournaments (if registration table exists)
- Returns detailed success/failure report

#### **Database Structure Differences:**
- **Local**: Full schema with all tables
- **Production**: May have different table structure (e.g., missing `tournament_registrations`)
- **Always check schema** before writing scripts: `node scripts/check-schema.js`

#### **When Creating New Data Scripts:**
1. Use the existing `postgresService` (connects to current environment automatically)
2. Handle existing data checks (avoid duplicates)
3. Create proper relationships (teams → users → tournaments)
4. Include error handling and detailed logging
5. Test locally first, then use API endpoint for production

## Notes for Claude
- NEVER add Airtable code - migration is complete
- Always check ALL .env files when debugging
- Backend .env takes precedence over root .env
- Use git push to deploy (don't ask how to deploy)
- Frontend and backend are on different domains in production
- Always verify environment variables in deployment dashboards
- Follow the dark theme UI style guide above for all modals and forms
- Tournament registration endpoints are functional - test with existing teams
- **CRITICAL**: Admin functionality has authentication issues - investigate requireAdmin middleware
- **CRITICAL**: For adding test data, ALWAYS use API endpoints or proper scripts - NEVER manual database entry
- **DO NOT** claim things are "working perfectly" - always acknowledge issues exist
- **TROUBLESHOOTING**: When encountering errors, follow the TROUBLESHOOTING_CHECKLIST.md