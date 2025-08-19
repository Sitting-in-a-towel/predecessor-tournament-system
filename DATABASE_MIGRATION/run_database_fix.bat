@echo off
title Fix Phoenix Database Schema
color 0A

echo ========================================
echo   FIXING PHOENIX DATABASE SCHEMA
echo ========================================
echo.
echo This will add missing columns to the draft_sessions table
echo that Phoenix requires to work properly.
echo.
echo Database: predecessor_tournaments
echo Host: localhost:5432
echo User: postgres
echo.
pause

echo Setting password...
set PGPASSWORD=Antigravity7@!89

echo.
echo Running database fix...
echo.

psql -h localhost -p 5432 -U postgres -d predecessor_tournaments -f "fix_database.sql"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   ✅ DATABASE FIX COMPLETED SUCCESSFULLY!
    echo ========================================
    echo.
    echo The Phoenix database schema has been updated.
    echo You can now test the Phoenix API integration.
    echo.
) else (
    echo.
    echo ========================================
    echo   ❌ DATABASE FIX FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo Common issues:
    echo - PostgreSQL service not running
    echo - Incorrect password
    echo - Database doesn't exist
    echo.
)

pause