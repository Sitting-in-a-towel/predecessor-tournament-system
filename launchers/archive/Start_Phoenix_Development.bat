@echo off
title Predecessor Development with Phoenix LiveView
color 0A
cls

echo ========================================
echo   PREDECESSOR TOURNAMENT SYSTEM
echo   Phoenix LiveView Development Mode
echo ========================================
echo.

:: Check if PostgreSQL is running
echo [1/5] Checking PostgreSQL Service...
sc query "postgresql-x64-17" | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo PostgreSQL is not running. Starting service...
    net start "postgresql-x64-17"
) else (
    echo PostgreSQL is already running.
)
echo.

:: Start NocoDB
echo [2/5] Starting NocoDB Database UI...
cd /d "%~dp0..\NocoDB"
start "NocoDB Database UI" cmd /k "Noco-win-x64.exe"
timeout /t 2 >nul
echo NocoDB started on http://localhost:8080
echo.

:: Start Phoenix Draft System (when implemented)
echo [3/5] Phoenix Draft System...
if exist "%~dp0..\phoenix_draft" (
    cd /d "%~dp0..\phoenix_draft"
    start "Phoenix Draft System" cmd /k "mix phx.server"
    echo Phoenix Draft System starting on http://localhost:4000
) else (
    echo Phoenix draft system not yet implemented - skipping
)
echo.

:: Start Backend Server
echo [4/5] Starting Node.js Backend Server...
cd /d "%~dp0..\backend"
start "Backend Server" cmd /k "npm run dev"
timeout /t 3 >nul
echo Backend server started on http://localhost:3001
echo.

:: Start Frontend
echo [5/5] Starting React Frontend...
cd /d "%~dp0..\frontend"
start "Frontend Server" cmd /k "npm start"
echo Frontend starting on http://localhost:3000
echo.

echo ========================================
echo   All services are starting up!
echo ========================================
echo.
echo Services:
echo - PostgreSQL:    Running as Windows Service
echo - NocoDB:        http://localhost:8080
echo - Phoenix Draft: http://localhost:4000 (when implemented)
echo - Backend API:   http://localhost:3001
echo - Frontend:      http://localhost:3000
echo.
echo Phoenix LiveView migration in progress.
echo See documentation/PHOENIX_MIGRATION_GUIDE.md for details.
echo.
echo Press any key to close this launcher (services will continue running)
pause >nul