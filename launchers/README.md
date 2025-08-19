# Predecessor Tournament Management - Launchers

## 🚀 Main Launchers (Choose Your Database)

### **`Local_Development_Launcher.bat`** - LOCAL DATABASE
- **Use this for daily development work**
- Connects to your local PostgreSQL database
- Your original tournament data (6 tournaments, 38 teams)
- All services: Frontend (3000), Backend (3001), Phoenix (4000), NocoDB (8080)
- **Best for: Normal development and testing**

### **`Production_Testing_Launcher.bat`** - PRODUCTION DATABASE  
- **Use this for production testing only**
- Connects to Render PostgreSQL (live production data)
- Test data we created (Test tournament 101 with 4 teams)
- Same services but connected to production database
- **⚠️ WARNING: Changes affect live production data!**

### Legacy Launchers
- **`Enhanced_Launcher.bat`** - Old general launcher (still works)

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