# Project File Organization

## Current Structure (After Cleanup)

### Root Directory
- `CLAUDE.md` - Claude assistant configuration
- `PROJECT_SUMMARY.md` - High-level project overview
- `README.md` - Main project readme
- `netlify.toml` - Netlify deployment configuration
- `package.json` - Root package configuration

### Core Application
- `frontend/` - React application
- `backend/` - Node.js API server
- `launcher-app/` - Development UI launcher

### Documentation (All in One Place)
- `documentation/` - **ALL** guides, docs, and references
  - `DEPLOYMENT_STEPS.md` - Netlify + Render deployment
  - `DEPLOYMENT_GUIDE.md` - Alternative deployment options
  - `HOSTING_COMPARISON.md` - Hosting platform comparison
  - `LAUNCHER_GUIDE.md` - How to use development launchers
  - `QUICK_START_GUIDE.md` - Getting started guide
  - `COMPLETE_PROFESSIONAL_SETUP.md` - Advanced setup
  - `External_Access_Setup.md` - Internet access options
  - `KNOWN_ISSUES.md` - Common problems and solutions
  - `MONITORING.md` - Monitoring and logging
  - `env_*.txt` - Environment configuration templates

### Development Tools
- `launchers/` - Batch files for easy development
  - `Start_UI_Launcher_Real.bat` - **Main launcher to use**
  - `Start_Development_Environment.bat` - Start both frontend/backend
  - `Check_Database_Metrics.bat` - Database health check
  - `Debug_Teams.bat` - Debug team functionality
  - `Test_Connection.bat` - Test database connections
  - `run_tests.bat` - Run test suites

### Scripts & Utilities
- `scripts/` - Development and deployment scripts
  - `check-database-metrics.js` - Database monitoring
  - `deploy-setup.bat` - Deployment preparation
  - `setup-external-access.bat` - External access setup
  - `setup-professional.bat` - Professional environment setup
  - `validate-setup.js` - Validate configuration

### Archive & Backups
- `archive/` - Old files kept for reference
- `backups/` - Database and configuration backups
- `uploads/` - User uploaded files

### Development
- `tests/` - Test suites (unit, integration, e2e)
- `logs/` - Application logs
- `node_modules/` - Dependencies

## Removed Files (No Longer Needed)

### Airtable-Related (Migrated to PostgreSQL)
- `Debug_Airtable.bat`
- `setup_airtable_database.bat`
- `backup_database.bat`
- `populate_sample_data.bat`

### Outdated Setup Scripts
- `test-supabase.js`
- `professional-setup-complete.bat`
- `setup-summary.bat`
- `switch-env.bat`

### Duplicate Documentation
- Old `docs/` folder (merged into `documentation/`)
- `COMPREHENSIVE_TESTING_GUIDE.md` (functionality complete)

## Key Files to Use

### For Development
1. `launchers/Start_UI_Launcher_Real.bat` - Start development environment
2. `documentation/QUICK_START_GUIDE.md` - Get started quickly
3. `CLAUDE.md` - Configuration for Claude assistant

### For Deployment
1. `documentation/DEPLOYMENT_STEPS.md` - Deploy to Netlify + Render
2. `documentation/HOSTING_COMPARISON.md` - Compare hosting options
3. `netlify.toml` - Netlify configuration

### For Troubleshooting
1. `documentation/KNOWN_ISSUES.md` - Common problems
2. `launchers/Check_Database_Metrics.bat` - Check database health
3. `documentation/MONITORING.md` - Monitor application

## File Naming Convention
- ALL_CAPS.md - Important reference documents
- Title_Case.bat - Launcher batch files
- lowercase-with-dashes.js - JavaScript files
- camelCase.js - React components and services