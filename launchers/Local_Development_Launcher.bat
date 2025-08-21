@echo off
title Predecessor Development Environment - LOCAL DATABASE
color 0B

REM Set PATH for Phoenix/Elixir
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo ========================================
echo  PREDECESSOR DEVELOPMENT ENVIRONMENT
echo  LOCAL DATABASE MODE
echo ========================================
echo  Backend will connect to LOCAL PostgreSQL
echo  Your original tournament data will be used
echo ========================================
echo.

REM Set environment variable for this session
set USE_PRODUCTION_DB=false
echo Database Mode: LOCAL (localhost PostgreSQL)
echo.

REM Kill any existing processes on our ports first
echo Cleaning up any existing processes...
taskkill /F /FI "WINDOWTITLE eq NocoDB*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Backend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Phoenix Draft*" 2>nul
timeout /t 2 /nobreak >nul

echo Starting services...
echo.

REM Start NocoDB
echo [1/4] Starting NocoDB on port 8080...
cd /d "H:\Project Folder\NocoDB"
start "NocoDB Service" /MIN Noco-win-x64.exe
cd /d "H:\Project Folder\Predecessor website"
timeout /t 3 /nobreak >nul

REM Start Backend with LOCAL database
echo [2/4] Starting Backend on port 3001 (LOCAL DATABASE)...
start "Backend Server - LOCAL DB" /D "H:\Project Folder\Predecessor website\backend" cmd /c "set USE_PRODUCTION_DB=false && npm run dev || pause"
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
echo  DATABASE MODE: LOCAL
echo ========================================
echo.
echo  Access Points:
echo  - Website:    http://localhost:3000
echo  - Backend:    http://localhost:3001 (LOCAL DATA)
echo  - Drafts:     http://localhost:4000
echo  - NocoDB:     http://localhost:8080
echo.
echo  Your Tournaments Available:
echo  - Draft Test Tournament
echo  - Testing big bracket  
echo  - test admin panel
echo  - gfdhgfh
echo  - Test 1
echo  - Test Tournament Debug
echo.
echo ========================================
echo  Press Ctrl+C to stop all services
echo  or type 'stop' and press Enter
echo ========================================
echo.



REM Keep this window open and listen for shutdown
:loop
set /p input="Status: Running LOCAL DB (type 'stop' to shutdown): "
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

echo All services stopped.
echo.
pause
exit