@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Complete Project Setup
echo ========================================
echo.

echo Step 1: Installing Dependencies...
call "%~dp0install_dependencies.bat"
if %errorlevel% neq 0 (
    echo Setup failed during dependency installation!
    pause
    exit /b 1
)

echo.
echo Step 2: Setting up Environment Files...
if not exist "%~dp0..\backend\.env" (
    echo Copying backend .env template...
    copy "%~dp0..\backend\.env.example" "%~dp0..\backend\.env" >nul
    echo Backend .env created. Please edit with your configuration.
)

if not exist "%~dp0..\frontend\.env" (
    echo Copying frontend .env template...
    copy "%~dp0..\frontend\.env.example" "%~dp0..\frontend\.env" >nul
    echo Frontend .env created. Please edit with your configuration.
)

echo.
echo Step 3: Creating required directories...
mkdir "%~dp0..\backend\logs" 2>nul
mkdir "%~dp0..\backups" 2>nul
mkdir "%~dp0..\uploads" 2>nul

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Edit backend\.env with your:
echo    - Discord OAuth credentials
echo    - Airtable Base ID (after creating base)
echo    - Session secrets
echo.
echo 2. Edit frontend\.env with your:
echo    - API URLs if different from defaults
echo.
echo 3. Set up your Airtable database:
echo    - Create new base named "Predecessor Tournament Management"
echo    - Copy the Base ID to your .env file
echo.
echo 4. Configure Discord OAuth:
echo    - Create Discord application at https://discord.com/developers/applications
echo    - Add OAuth2 redirect URL: http://localhost:3001/api/auth/discord/callback
echo    - Copy Client ID and Secret to your .env file
echo.
echo 5. Run start_development.bat to start the application
echo.
echo Documentation is available in the documentation/ folder
echo.
pause