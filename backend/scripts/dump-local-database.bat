@echo off
echo ========================================
echo DUMPING LOCAL DATABASE TO PRODUCTION
echo ========================================
echo.

set PGPASSWORD=Antigravity7@!89

echo Step 1: Creating complete database dump from local...
pg_dump -h localhost -p 5432 -U postgres -d predecessor_tournaments --verbose --no-owner --no-acl --clean --if-exists > local_database_dump.sql

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to dump local database!
    pause
    exit /b 1
)

echo.
echo ✅ Database dump created successfully!
echo.
echo Step 2: Creating data-only dump (safer option)...
pg_dump -h localhost -p 5432 -U postgres -d predecessor_tournaments --data-only --no-owner --no-acl > local_data_only.sql

echo.
echo ✅ Data-only dump created successfully!
echo.
echo Files created:
echo - local_database_dump.sql (complete database with schema)
echo - local_data_only.sql (data only, use if schema already exists)
echo.
echo ========================================
echo DUMP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Check the .sql files to ensure they contain your data
echo 2. Run restore-to-production.js to push this data to production
echo.
pause