@echo off
echo =============================================
echo  MIGRATING FROM AIRTABLE TO POSTGRESQL
echo =============================================
echo.
echo This will copy all data from Airtable to PostgreSQL:
echo - Users and Discord profiles
echo - Tournaments and settings
echo - Teams and player registrations
echo - Match results and history
echo.
echo IMPORTANT: Make sure PostgreSQL is running and the schema is created.
echo.

set /p POSTGRES_PASS=Enter your PostgreSQL password: 
echo.

echo Setting environment variables...
set POSTGRES_PASSWORD=%POSTGRES_PASS%

echo Starting migration...
node migrate-airtable-to-postgres.js

if %errorlevel% equ 0 (
    echo.
    echo ✅ Migration completed successfully!
    echo Check the migration_log_*.json file for details.
    echo.
) else (
    echo.
    echo ❌ Migration failed!
    echo Check the error messages above and migration log file.
    echo.
)

pause