@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Setting Up Airtable Database
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website\backend"

echo Running database setup script...
node scripts/setup-database.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Database setup completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Database setup failed with errors
    echo ========================================
)

echo.
echo Press any key to close this window...
pause >nul