@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Airtable Database Setup
echo ========================================
echo.

REM Check if backend .env exists
if not exist "%~dp0..\backend\.env" (
    echo Creating backend .env file from template...
    copy "%~dp0..\.env.example" "%~dp0..\backend\.env" >nul
    echo.
    echo ⚠️  IMPORTANT: Please edit backend\.env and add your AIRTABLE_PERSONAL_TOKEN
    echo You can get your token from: https://airtable.com/developers/web/api/introduction
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "%~dp0..\backend\node_modules" (
    echo Installing backend dependencies first...
    cd /d "%~dp0..\backend"
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies!
        pause
        exit /b 1
    )
)

echo Starting Airtable database setup...
cd /d "%~dp0..\backend"

node scripts/setupAirtableDatabase.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Database setup completed successfully!
    echo ========================================
    echo.
    echo Your Airtable base has been created with all required tables:
    echo ✅ Users
    echo ✅ Tournaments  
    echo ✅ Teams
    echo ✅ Matches
    echo ✅ DraftSessions
    echo ✅ PlayerSignups
    echo ✅ Notifications
    echo ✅ Heroes
    echo.
    echo Sample data has been populated including heroes and test users.
    echo.
    echo Next steps:
    echo 1. Configure Discord OAuth credentials in your .env files
    echo 2. Run start_development.bat to start the application
    echo.
) else (
    echo.
    echo ❌ Database setup failed!
    echo Please check the error messages above and ensure:
    echo 1. Your AIRTABLE_PERSONAL_TOKEN is valid
    echo 2. You have internet connection
    echo 3. Your Airtable account has sufficient permissions
    echo.
)

pause