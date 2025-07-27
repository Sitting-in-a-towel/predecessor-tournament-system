@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Database Backup Utility
echo ========================================
echo.

REM Check if backend .env exists
if not exist "%~dp0..\backend\.env" (
    echo ERROR: Backend .env file not found!
    echo Cannot perform backup without database configuration.
    pause
    exit /b 1
)

echo Creating backup directory...
set BACKUP_DIR=%~dp0..\backups\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%" 2>nul

echo.
echo Starting Airtable backup...
cd /d "%~dp0..\backend"

REM This would need to be implemented with a proper backup script
echo Note: Airtable backup requires manual export or API backup script
echo Backup directory created: %BACKUP_DIR%
echo.
echo Manual backup steps:
echo 1. Go to your Airtable base
echo 2. Click on Help (?) button
echo 3. Select "Download CSV data"
echo 4. Save all CSV files to: %BACKUP_DIR%
echo.
echo Automated backup script can be implemented using Airtable API

echo.
echo ========================================
echo Backup Process Information
echo ========================================
echo Backup Location: %BACKUP_DIR%
echo Timestamp: %date% %time%
echo.
pause