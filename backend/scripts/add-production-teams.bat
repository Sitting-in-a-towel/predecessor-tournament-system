@echo off
echo ===============================================
echo Add Test Teams to Render Production Database
echo ===============================================
echo.
echo This script will add 10 test teams to your PRODUCTION database on Render.
echo.
echo You need your production DATABASE_URL from Render Dashboard:
echo 1. Go to https://dashboard.render.com
echo 2. Click on your PostgreSQL database
echo 3. Go to "Connect" tab  
echo 4. Copy the "External Database URL"
echo.
echo The URL should look like:
echo postgresql://username:password@dpg-xxxxx.render.com/database_name
echo.
set /p DATABASE_URL="Paste your production DATABASE_URL here: "

if "%DATABASE_URL%"=="" (
    echo.
    echo ❌ ERROR: No DATABASE_URL provided!
    echo Please run the script again with your production database URL.
    pause
    exit /b 1
)

echo.
echo 🚀 Setting environment variable and running script...
echo.

REM Set the environment variable and run the script
set PRODUCTION_DATABASE_URL=%DATABASE_URL%
node add-test-teams-to-render-production.js

echo.
echo ===============================================
echo Script execution complete!
echo ===============================================
echo.
echo If successful, you should now have 10 test teams in production.
echo You can verify by checking your production app.
echo.
pause