@echo off
echo ========================================
echo Add Test Teams to Production Database
echo ========================================
echo.
echo This script will add 10 test teams to the PRODUCTION database.
echo You'll need your production DATABASE_URL from Render.
echo.
echo You can find it in:
echo 1. Render Dashboard → Your Database → Connect → External Connection
echo 2. It should look like: postgresql://user:password@host/database
echo.
set /p DATABASE_URL="Please paste your production DATABASE_URL here: "

if "%DATABASE_URL%"=="" (
    echo ERROR: No DATABASE_URL provided!
    pause
    exit /b 1
)

echo.
echo Connecting to production database...
echo Running SQL script...
echo.

REM Use psql with the DATABASE_URL to run the SQL script
psql "%DATABASE_URL%" -f test-teams-sql.sql

echo.
echo ========================================
echo Script execution complete!
echo ========================================
echo.
echo Check the output above for any errors.
echo The script should have created 10 test teams.
echo.
pause