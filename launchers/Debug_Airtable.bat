@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Debugging Airtable Connection
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website\backend"

echo Running Airtable debug script...
node utils/debug-airtable.js

echo.
echo Press any key to close this window...
pause >nul