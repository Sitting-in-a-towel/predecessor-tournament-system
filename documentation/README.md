# Predecessor Tournament Management System

A locally hosted web application for managing competitive esports tournaments for the game Predecessor.

## Overview

This system provides comprehensive tournament management with features including:
- **Captain's Draft System**: Secure draft rooms with unique captain access
- **Real-time Brackets**: Live tournament progression and match tracking
- **Team Management**: Easy registration, roster management, and player invitations
- **Discord Integration**: OAuth authentication and admin role verification
- **Airtable Database**: Robust data persistence and management

## Quick Start

1. **Run Setup**: Execute `launchers\setup_project.bat` to install dependencies and create environment files
2. **Configure Environment**: Edit `.env` files with your Discord and Airtable credentials
3. **Set up Database**: Create Airtable base and configure tables (see DATABASE_SETUP.md)
4. **Start Development**: Run `launchers\start_development.bat`

## System Requirements

- Node.js 16+ (LTS recommended)
- npm or yarn package manager
- Discord application for OAuth
- Airtable account and personal access token
- Modern web browser (Chrome, Firefox, Edge)

## Project Structure

```
Predecessor website/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── styles/         # CSS stylesheets
│   └── public/             # Static assets
├── backend/                 # Node.js/Express API
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── config/             # Configuration files
│   └── utils/              # Utility functions
├── launchers/              # Batch scripts for easy operation
├── documentation/          # Project documentation
└── tests/                  # Test suites
```

## Features

### Tournament Management
- Multiple bracket types (Single/Double Elimination, Round Robin, Swiss)
- Flexible match formats (Best of 1/3/5)
- Different formats for different tournament stages
- Public tournament viewing for non-registered users

### Draft System
- Captain-only access with secure tokens
- Customizable pick/ban order (up to 5 bans per team)
- Coin toss functionality for first pick determination
- Real-time updates via WebSocket
- Separate spectator viewing interface

### Team System
- Team creation and registration
- Captain-based team management
- Player invitations and roster management
- Support for up to 3 substitute players per team
- Team confirmation system

### Authentication & Security
- Discord OAuth integration
- Role-based access control
- Admin panel with comprehensive controls
- Secure session management
- Captain-specific draft access tokens

## Environment Configuration

See `.env.example` files for all available configuration options.

### Required Environment Variables

**Backend (.env):**
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application client secret
- `AIRTABLE_PERSONAL_TOKEN` - Airtable personal access token
- `AIRTABLE_BASE_ID` - Airtable base ID
- `SESSION_SECRET` - Session encryption secret

**Frontend (.env):**
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:3001/api)

## Development

### Starting Development Environment
```bash
# Use launcher (recommended)
launchers\start_development.bat

# Or manually
cd backend && npm run dev
cd frontend && npm start
```

### Running Tests
```bash
# Use launcher
launchers\run_tests.bat

# Or manually
cd frontend && npm test
cd backend && npm test
```

### Building for Production
```bash
# Use launcher
launchers\start_production.bat

# Or manually
cd frontend && npm run build
cd backend && npm start
```

## Deployment

This application is designed for local hosting. For production deployment:

1. Set `NODE_ENV=production` in backend `.env`
2. Configure production URLs and secrets
3. Build frontend with `npm run build`
4. Use `launchers\start_production.bat` or set up process manager

## Database Schema

The system uses Airtable with the following main tables:
- **Users**: Discord user data and admin flags
- **Tournaments**: Tournament information and settings
- **Teams**: Team rosters and captain assignments
- **Matches**: Match scheduling and results
- **DraftSessions**: Draft room data and pick/ban history
- **Heroes**: Character data for draft system

See `DATABASE_SETUP.md` for detailed schema information.

## API Documentation

RESTful API endpoints:
- `/api/auth/*` - Authentication (Discord OAuth)
- `/api/tournaments/*` - Tournament management
- `/api/teams/*` - Team operations
- `/api/draft/*` - Draft system
- `/api/admin/*` - Administrative functions

WebSocket events for real-time features:
- Draft room updates
- Tournament bracket changes
- Notification system

## Troubleshooting

### Common Issues

1. **Discord OAuth fails**: Verify redirect URL matches exactly
2. **Airtable connection errors**: Check token and base ID
3. **Port conflicts**: Ensure ports 3000/3001 are available
4. **Missing dependencies**: Run `install_dependencies.bat`

### Debug Mode

Set `LOG_LEVEL=debug` in backend `.env` for detailed logging.

## Contributing

This is a custom tournament management system. For modifications:
1. Follow existing code patterns
2. Update tests for new features
3. Document configuration changes
4. Test with full tournament workflow

## Support

For issues and questions:
1. Check logs in `backend/logs/`
2. Review error messages in browser console
3. Verify environment configuration
4. Test with sample data

## Version History

- v1.0.0 - Initial release with core tournament management
- Features planned: Advanced analytics, mobile optimization, API extensions