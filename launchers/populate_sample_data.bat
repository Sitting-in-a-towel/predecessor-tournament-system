@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Sample Data Population
echo ========================================
echo.

REM Check if backend .env exists
if not exist "%~dp0..\backend\.env" (
    echo ERROR: Backend .env file not found!
    echo Please run setup_airtable_database.bat first.
    pause
    exit /b 1
)

REM Check if Airtable base ID is configured
findstr /C:"AIRTABLE_BASE_ID=" "%~dp0..\backend\.env" >nul
if %errorlevel% neq 0 (
    echo ERROR: AIRTABLE_BASE_ID not found in .env file!
    echo Please run setup_airtable_database.bat first.
    pause
    exit /b 1
)

echo This will populate your Airtable base with sample data including:
echo - 4 tournaments with different statuses and formats
echo - 5 sample teams
echo - 20 heroes for draft system
echo - 3 player signups looking for teams
echo - Sample notifications
echo.
echo This is useful for testing the complete tournament workflow.
echo.
set /p confirm="Continue with sample data population? (y/n): "
if /i "%confirm%" neq "y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Starting sample data population...
cd /d "%~dp0..\backend"

node scripts/populateSampleTournaments.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Sample data populated successfully!
    echo ========================================
    echo.
    echo You can now test the following workflows:
    echo.
    echo 🏆 Tournament Management:
    echo   - View tournaments with different statuses
    echo   - Test tournament creation forms
    echo   - Practice admin tournament controls
    echo.
    echo 👥 Team Management:
    echo   - Browse existing teams
    echo   - Test team registration process
    echo   - Practice roster management
    echo.
    echo 🎯 Player Features:
    echo   - View player signups looking for teams
    echo   - Test team invitation process
    echo   - Practice player-team matching
    echo.
    echo 🦸 Draft System Preparation:
    echo   - 20 heroes available for drafts
    echo   - Mix of enabled/disabled heroes for testing
    echo   - All roles represented
    echo.
    echo Ready to start development server with:
    echo launchers\start_development.bat
    echo.
) else (
    echo.
    echo ❌ Sample data population failed!
    echo Please check the error messages above.
    echo Make sure your Airtable base is properly set up.
    echo.
)

pause