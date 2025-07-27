@echo off
echo ========================================
echo Predecessor Tournament Management System
echo External Access Setup
echo ========================================
echo.

echo This script will help you set up external access to your tournament system.
echo.
echo Choose an option:
echo 1. Set up Ngrok tunneling (Recommended for testing)
echo 2. Configure local network access
echo 3. View production deployment guide
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto setup_ngrok
if "%choice%"=="2" goto setup_local
if "%choice%"=="3" goto view_guide
goto invalid_choice

:setup_ngrok
echo.
echo Setting up Ngrok tunneling...
echo.
echo 1. Download ngrok from https://ngrok.com/download
echo 2. Extract to: H:\Project Folder\Predecessor website\tools\
echo 3. Sign up for free account at https://ngrok.com/
echo 4. Run these commands in separate terminals:
echo.
echo    ngrok http 3001   (for backend)
echo    ngrok http 3000   (for frontend)
echo.
echo 5. Update your Discord OAuth settings with the ngrok URLs
echo 6. Update your .env files with the new URLs
echo.
echo For detailed instructions, see: docs\External_Access_Setup.md
goto end

:setup_local
echo.
echo Setting up local network access...
echo.
echo Your current IP address:
ipconfig | findstr /R /C:"IPv4 Address"
echo.
echo 1. Configure Windows Firewall to allow Node.js
echo 2. Share these URLs with your network users:
echo    Frontend: http://YOUR_IP:3000
echo    Backend: http://YOUR_IP:3001
echo.
echo For detailed instructions, see: docs\External_Access_Setup.md
goto end

:view_guide
echo.
echo Opening production deployment guide...
start "" "docs\External_Access_Setup.md"
goto end

:invalid_choice
echo.
echo Invalid choice. Please run the script again.
goto end

:end
echo.
echo Press any key to exit...
pause >nul