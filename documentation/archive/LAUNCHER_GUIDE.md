# Launcher Scripts Guide

This guide explains all the available launcher batch files and their purposes.

## Core Setup Launchers

### `setup_project.bat` 
**Purpose**: Complete initial project setup
- Installs all dependencies (frontend & backend)
- Creates environment files from templates
- Sets up required directories
**When to use**: First time setting up the project

### `setup_airtable_database.bat`
**Purpose**: Creates and configures the Airtable database
- Creates Airtable base with all required tables
- Populates sample hero data
- Updates environment files with Base ID
**When to use**: After configuring your Airtable token in .env

### `install_dependencies.bat`
**Purpose**: Install or reinstall project dependencies
- Installs frontend React dependencies
- Installs backend Node.js dependencies
**When to use**: When dependencies are missing or need updating

## Development Launchers

### `start_development.bat`
**Purpose**: Start development environment with checks
- Validates dependencies and environment files
- Starts backend server (port 3001)
- Starts frontend server (port 3000)
- Opens browser automatically
**When to use**: Daily development work (recommended)

### `Start_UI_Launcher_Real.bat`
**Purpose**: Start development with web-based launcher interface
- Starts the UI launcher server (port 4000)
- Provides web interface for monitoring and control
- Real-time log viewing and filtering
**When to use**: When you want advanced monitoring and control

### `start_production.bat`
**Purpose**: Start in production mode
- Builds optimized frontend
- Starts production server
**When to use**: Testing production deployment locally

## Database & Testing Launchers

### `populate_sample_data.bat`
**Purpose**: Add sample data for testing
- Creates sample tournaments
- Adds sample teams and players
- Populates test notifications
**When to use**: When you want realistic test data

### `backup_database.bat`
**Purpose**: Create database backup
- Provides instructions for manual Airtable backup
- Creates backup directory structure
**When to use**: Before major changes or periodically

### `run_tests.bat`
**Purpose**: Run all test suites
- Executes backend tests
- Executes frontend tests
**When to use**: Before committing changes or deploying

## Debugging Launchers

### `Debug_Airtable.bat`
**Purpose**: Test Airtable connection and configuration
- Verifies API token
- Checks base and table existence
- Reports connection status
**When to use**: When having Airtable connection issues

### `Debug_Teams.bat`
**Purpose**: Debug team-related issues
- Shows all teams in database
- Displays user record IDs
- Reports team membership details
**When to use**: When troubleshooting team creation/management

### `Test_Connection.bat`
**Purpose**: Test API connectivity
- Checks backend server health
- Verifies database connections
**When to use**: When troubleshooting connectivity issues

### `Validate_Professional_Setup.bat`
**Purpose**: Validate professional deployment setup
- Checks environment configuration
- Verifies all required services
**When to use**: Before deploying to production

## UI Development

### `Install_Launcher_UI.bat`
**Purpose**: Install UI launcher dependencies
- Sets up the web-based launcher interface
**When to use**: First time using the UI launcher

## Quick Reference

**First time setup**:
1. `setup_project.bat`
2. Edit `.env` files with your credentials
3. `setup_airtable_database.bat`
4. `start_development.bat`

**Daily development**:
- `start_development.bat` for standard work
- `Start_UI_Launcher_Real.bat` for advanced monitoring

**Troubleshooting**:
- `Debug_Airtable.bat` for database issues
- `Test_Connection.bat` for connectivity
- `run_tests.bat` before major changes

## Archived Launchers

The following launchers have been moved to `archive/old_launchers/` as they were outdated or superseded:
- `Setup_Database.bat` (simpler version, replaced by setup_airtable_database.bat)
- `Start_Development_Fixed.bat` (replaced by improved start_development.bat)
- `Start_UI_Launcher.bat` (replaced by Start_UI_Launcher_Real.bat)

These are kept for reference but should not be used for current development.