# Predecessor Tournament Management - Launchers

## Daily Use Launchers (Main Directory)

### 🚀 Primary Development
- **`Start_Development_Environment.bat`** - Main launcher for daily development
  - Starts PostgreSQL, NocoDB, UI Launcher, Backend, Frontend
  - Optional pgAdmin 4 startup
  - Opens all browser windows
  - **Use this for daily development work**

- **`Start_UI_Launcher_Real.bat`** - UI Launcher only
  - Starts just the UI launcher application
  - Good for quick testing or when other services are already running

### 🔧 Database & Setup
- **`setup_airtable_database.bat`** - Set up Airtable tables
- **`populate_sample_data.bat`** - Add sample tournament data
- **`backup_database.bat`** - Backup current database state

### 🧪 Testing & Debugging
- **`run_tests.bat`** - Run all test suites
- **`Debug_Airtable.bat`** - Debug Airtable connection issues
- **`Debug_Teams.bat`** - Debug team-related issues
- **`Test_Connection.bat`** - Test database connections
- **`Validate_Professional_Setup.bat`** - Validate complete setup

## Archive Directory

Contains old/deprecated launchers that have been superseded by newer versions:
- Old development environment launchers
- Legacy setup scripts
- Previous versions of installers

## Quick Start

For new developers:
1. Run `Start_Development_Environment.bat`
2. Follow the prompts (say 'y' to open pgAdmin if needed)
3. Wait for all services to start
4. Browser windows will open automatically

## Service Ports

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- UI Launcher: http://localhost:4000
- NocoDB: http://localhost:8080
- PostgreSQL: localhost:5432

## Troubleshooting

If services don't start properly:
1. Close all terminal windows
2. Run: `npx kill-port 3000 3001 4000 8080`
3. Restart the main launcher

For database issues, check the setup and debug launchers.