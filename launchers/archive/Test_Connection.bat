@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Testing Airtable Connection
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website\backend"

echo Testing connection to Airtable...
node utils/simple-connection-test.js

echo.
echo Press any key to close this window...
pause >nul