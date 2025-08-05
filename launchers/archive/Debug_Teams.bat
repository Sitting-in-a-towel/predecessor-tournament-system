@echo off
title Debug Teams Issue
color 0E

echo ========================================
echo Debug Teams Issue
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website\backend"

echo Running teams debug script...
echo.

node scripts/debug-teams.js

echo.
echo ========================================
echo Debug complete!
echo ========================================
echo.
echo Check the output above to see:
echo - All teams in the database
echo - User record IDs
echo - Team membership details
echo.

pause