# SYSTEMS ARCHITECTURE DOCUMENTATION
*Last Updated: 2025-01-20*

## 🏗️ SYSTEM OVERVIEW

### Multi-Service Architecture
The Predecessor Tournament Management System consists of four core services working together:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │ Phoenix Draft   │
│   (React)       │◄──►│  (Node.js)      │◄──►│   (Elixir)      │
│   Port 3000     │    │   Port 3001     │    │   Port 4000     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    │   Port 5432     │
                    └─────────────────┘
```

## 🎯 SERVICE RESPONSIBILITIES

### Frontend Service (React - Port 3000)
**Purpose**: User interface for tournament management and administration
**Technologies**: React, React Router, CSS modules, Axios
**Key Features**:
- Tournament creation and management
- Team registration and management
- Admin dashboard and controls
- User authentication UI
- Bracket visualization
- Tournament viewing and statistics

**Key Files**:
- `src/components/Tournament/` - Tournament management components
- `src/components/Admin/` - Admin dashboard components  
- `src/services/backendService.js` - API communication layer
- `src/contexts/AuthContext.js` - Authentication state management

### Backend Service (Node.js/Express - Port 3001)
**Purpose**: API server, database management, and authentication
**Technologies**: Node.js, Express, Passport, PostgreSQL, Socket.io
**Key Features**:
- RESTful API for all data operations
- Discord OAuth authentication
- Database schema management
- Real-time WebSocket events
- File uploads and processing
- Admin tools and migration scripts

**Key Files**:
- `server.js` - Main server configuration
- `routes/` - API endpoint definitions
- `services/postgresql.js` - Database service layer
- `middleware/auth.js` - Authentication middleware
- `config/discord.js` - OAuth configuration

### Phoenix Draft Service (Elixir/Phoenix LiveView - Port 4000)
**Purpose**: Real-time draft system with live updates
**Technologies**: Elixir, Phoenix LiveView, PostgreSQL, PubSub
**Key Features**:
- Real-time hero drafting interface
- Live timer synchronization
- Multi-user draft sessions
- Hero grid and selection
- Pick/ban phase management
- Spectator mode

**Key Files**:
- `lib/predecessor_draft_web/live/draft_live.ex` - Main draft logic
- `lib/predecessor_draft_web/live/components/` - UI components
- `lib/predecessor_draft/drafts.ex` - Draft business logic
- `config/` - Phoenix configuration

### Database Service (PostgreSQL - Port 5432)
**Purpose**: Data persistence and integrity
**Technologies**: PostgreSQL 17
**Key Features**:
- Tournament and team data
- User authentication records
- Draft session state
- Match and bracket data
- Audit logs and timestamps

## 🌐 DEPLOYMENT ARCHITECTURE

### Production Environment
```
Internet
    │
    ├── Netlify (Frontend) ──┐
    │   - Static React build │
    │   - CDN distribution   │
    │                        │
    └── Render (Backend) ────┼── Render PostgreSQL
        - Node.js API       │   - Managed database
        - Phoenix LiveView  │   - Automated backups
        - WebSocket support │   - SSL connections
                           │
                     Direct DB Access
```

**URLs**:
- Frontend: `https://exfang.netlify.app`
- Backend API: `https://predecessor-tournament-api.onrender.com`
- Phoenix Draft: `https://predecessor-tournament-api.onrender.com` (proxied)
- Database: Internal Render PostgreSQL (SSL required)

### Local Development Environment
```
Localhost
    │
    ├── Frontend (3000) ──┐
    ├── Backend (3001) ───┼── Local PostgreSQL (5432)
    └── Phoenix (4000) ───┘   - Direct connections
                              - No SSL required
```

## 🔄 DATA FLOW PATTERNS

### Tournament Creation Flow
```
User → Frontend → Backend API → PostgreSQL → Success Response → Frontend Update
```

### Draft Session Flow
```
User → Frontend → Backend API → Draft Session Created → 
Phoenix LiveView → Real-time Updates → Multiple Clients → 
Database Persistence → State Synchronization
```

### Authentication Flow
```
User → Discord OAuth → Backend Token Exchange → 
Session Cookie → API Requests → Database Validation
```

## 🔌 API INTEGRATION POINTS

### Internal Service Communication
- **Frontend ↔ Backend**: REST API calls via axios
- **Backend ↔ Database**: Direct PostgreSQL connections
- **Phoenix ↔ Database**: Ecto ORM connections
- **Backend ↔ Phoenix**: Shared database state

### External Service Integrations
- **Discord OAuth**: User authentication and profile data
- **Omeda City API**: Player statistics and match data (future)
- **Netlify**: Static hosting and deployment
- **Render**: Application hosting and managed database

## 🗄️ DATABASE SCHEMA

### Core Tables
```sql
-- User management
users (id, discord_id, discord_username, is_admin, created_at)

-- Tournament system
tournaments (id, name, description, bracket_type, status, created_at)
teams (id, team_name, team_tag, captain_id, confirmed, created_at)
tournament_registrations (id, tournament_id, team_id, registered_by, status)

-- Draft system
draft_sessions (id, tournament_id, session_id, team1_id, team2_id, status)
draft_picks (id, session_id, team_id, hero_name, pick_order, phase)
draft_bans (id, session_id, team_id, hero_name, ban_order, phase)

-- Team management
team_players (id, team_id, player_id, role, position, accepted)
team_invitations (id, team_id, invited_user_id, status, created_at)
```

### Critical Relationships
- `tournament_registrations.tournament_id` → `tournaments.id`
- `draft_sessions.tournament_id` → `tournaments.id`
- `team_players.team_id` → `teams.id`
- `team_players.player_id` → `users.id`

## 🚀 DEPLOYMENT PROCESS

### Automated Deployment Pipeline
1. **Pre-deployment Checklist**: `/api/deployment/checklist`
2. **Frontend Build**: Netlify auto-build from GitHub
3. **Backend Deployment**: Render auto-deploy from GitHub
4. **Database Migration**: Automatic schema updates
5. **Health Checks**: Service availability verification

### Environment Configuration
```bash
# Local Development
NODE_ENV=development
USE_PRODUCTION_DB=false
DATABASE_URL=postgresql://postgres:password@localhost:5432/tournament_system

# Production
NODE_ENV=production  
USE_PRODUCTION_DB=true
DATABASE_URL=postgresql://[render-provided-url]
```

## 🔒 SECURITY ARCHITECTURE

### Authentication Layer
- **Discord OAuth 2.0**: Secure user authentication
- **Session Cookies**: httpOnly, secure, sameSite settings
- **JWT Tokens**: Stateless authentication for Phoenix drafts
- **Admin Role Checks**: Database-level permission validation

### Network Security
- **HTTPS Everywhere**: SSL/TLS for all external communications
- **CORS Configuration**: Restricted to known frontend domains
- **Rate Limiting**: API endpoint protection
- **SQL Injection Protection**: Parameterized queries only

## 🔍 MONITORING & DEBUGGING

### Logging Strategy
- **Frontend**: Browser console, user interaction tracking
- **Backend**: Morgan HTTP logging, custom application logs
- **Phoenix**: Elixir Logger with structured logging
- **Database**: Query logging and performance monitoring

### Debug Access Points
```bash
# Health check endpoints
GET /health                    # Backend service health
GET /api/deployment/checklist  # Pre-deployment validation

# Database access
psql -h [host] -U [user] -d tournament_system

# Local development
http://localhost:3000  # Frontend
http://localhost:3001  # Backend API  
http://localhost:4000  # Phoenix draft
```

## 🔧 CRITICAL DEPENDENCIES

### Frontend Dependencies
- React 18, React Router, Axios, React Toastify
- Authentication: Discord OAuth integration
- Styling: CSS modules, responsive design

### Backend Dependencies  
- Express, Passport, PostgreSQL driver, Socket.io
- Security: Helmet, CORS, rate limiting
- Authentication: Passport Discord strategy

### Phoenix Dependencies
- Phoenix LiveView, Ecto, PubSub
- Real-time: WebSocket connections
- Database: PostgreSQL adapter

### Infrastructure Dependencies
- PostgreSQL 17+ (local and Render)
- Node.js 18+ for backend services
- Elixir/OTP 25+ for Phoenix service

## 🚨 CRITICAL FAILURE POINTS

### Single Points of Failure
1. **Render PostgreSQL Database**: All services depend on this
2. **Discord OAuth Service**: Authentication relies on external service
3. **Render Backend Hosting**: Both API and Phoenix run here

### Mitigation Strategies
- **Database**: Render provides automated backups
- **Authentication**: Graceful degradation for draft spectators
- **Hosting**: Multiple deployment targets available

## 📋 MAINTENANCE PROCEDURES

### Regular Maintenance
- **Weekly**: Run deployment checklist, check error logs
- **Monthly**: Database cleanup, dependency updates
- **Quarterly**: Security audit, performance review

### Emergency Procedures
- **Database Recovery**: Restore from Render backup
- **Service Outage**: Check Render status, restart services
- **Authentication Issues**: Clear cookies, check Discord app status

---

**Next Review Date**: 2025-02-20
**Document Owner**: Tournament Management System
**Related Documents**: CLAUDE.md, TROUBLESHOOTING.md, ORGANIZATION_STRATEGY.md