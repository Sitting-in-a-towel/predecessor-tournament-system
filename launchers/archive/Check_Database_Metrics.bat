@echo off
title Check Database Size and Bandwidth Usage
color 0A

echo ====================================================
echo   PREDECESSOR WEBSITE - DATABASE METRICS CHECK
echo ====================================================
echo.
echo This tool will analyze:
echo - PostgreSQL database size (if configured)
echo - Table sizes and row counts
echo - Estimated bandwidth usage
echo - Optimization recommendations
echo.
echo Press any key to start the analysis...
pause >nul

cd /d "H:\Project Folder\Predecessor website"

echo.
echo Running database metrics check...
echo.

node scripts\check-database-metrics.js

echo.
echo ====================================================
echo Analysis complete!
echo.
echo Note: If PostgreSQL is not set up, you'll see
echo connection errors. The project currently uses
echo Airtable as configured in config.ini
echo ====================================================
echo.
echo Press any key to exit...
pause >nul