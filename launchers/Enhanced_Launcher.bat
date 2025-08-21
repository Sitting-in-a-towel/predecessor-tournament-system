@echo off
title Predecessor Development Environment - Enhanced Launcher
color 0A

REM Set PATH for Phoenix/Elixir
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo ========================================
echo  PREDECESSOR DEVELOPMENT ENVIRONMENT
echo  Enhanced Launcher with Clean Shutdown
echo ========================================
echo.

REM Kill any existing processes on our ports first
echo Cleaning up any existing processes...
taskkill /F /FI "WINDOWTITLE eq NocoDB*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Backend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Phoenix Draft*" 2>nul
REM Skip npx kill-port as it may cause script to exit
timeout /t 2 /nobreak >nul

echo Starting services...
echo.

REM Start NocoDB
echo [1/4] Starting NocoDB on port 8080...
cd /d "H:\Project Folder\NocoDB"
start "NocoDB Service" /MIN Noco-win-x64.exe
cd /d "H:\Project Folder\Predecessor website"
timeout /t 3 /nobreak >nul

REM Start Backend
echo [2/4] Starting Backend on port 3001...
start "Backend Server" /D "H:\Project Folder\Predecessor website\backend" cmd /c "npm run dev || pause"
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [3/4] Starting Frontend on port 3000...
start "Frontend Server" /D "H:\Project Folder\Predecessor website\frontend" cmd /c "npm start || pause"
timeout /t 3 /nobreak >nul

REM Start Phoenix Draft System
echo [4/4] Starting Phoenix Draft System on port 4000...
start "Phoenix Draft System" /D "H:\Project Folder\Predecessor website" cmd /c "mix phx.server || pause"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo  All services started successfully!
echo ========================================
echo.
echo  Access Points:
echo  - Website:    http://localhost:3000
echo  - Backend:    http://localhost:3001
echo  - Drafts:     http://localhost:4000
echo  - NocoDB:     http://localhost:8080
echo.
echo ========================================
echo  Press Ctrl+C to stop all services
echo  or type 'stop' and press Enter
echo ========================================
echo.

REM Open browsers
timeout /t 2 /nobreak >nul
start http://localhost:3000
start http://localhost:4000

REM Keep this window open and listen for shutdown
:loop
set /p input="Status: Running (type 'stop' to shutdown): "
if /i "%input%"=="stop" goto shutdown
goto loop

:shutdown
echo.
echo Shutting down all services...
echo.

REM Kill all the services by window title
taskkill /F /FI "WINDOWTITLE eq NocoDB Service*" 2>nul
taskkill /F /IM "Noco-win-x64.exe" 2>nul
taskkill /F /FI "WINDOWTITLE eq Backend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Phoenix Draft System*" 2>nul

REM Also kill by port just to be sure
REM npx kill-port 3000 3001 4000 8080 2>nul

echo All services stopped.
echo.
pause
exit