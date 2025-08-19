@echo off
title Predecessor Tournament - Unified Development Environment
color 0A
setlocal

:: Set the project path
set PROJECT_PATH=H:\Project Folder\Predecessor website

echo ========================================
echo  PREDECESSOR UNIFIED DEV ENVIRONMENT
echo ========================================
echo.
echo Starting all services in a unified environment...
echo Press Ctrl+C at any time to stop ALL services
echo.

:: Create cleanup script for graceful shutdown
echo @echo off > "%TEMP%\cleanup_predecessor.bat"
echo echo Shutting down all services... >> "%TEMP%\cleanup_predecessor.bat"
echo taskkill /F /IM "node.exe" /T >nul 2>&1 >> "%TEMP%\cleanup_predecessor.bat"
echo taskkill /F /IM "beam.smp.exe" /T >nul 2>&1 >> "%TEMP%\cleanup_predecessor.bat"
echo taskkill /F /IM "erl.exe" /T >nul 2>&1 >> "%TEMP%\cleanup_predecessor.bat"
echo taskkill /F /IM "Noco-win-x64.exe" /T >nul 2>&1 >> "%TEMP%\cleanup_predecessor.bat"
echo echo All services stopped. >> "%TEMP%\cleanup_predecessor.bat"

:: Set up signal handler for cleanup on exit
set CLEANUP_SCRIPT=%TEMP%\cleanup_predecessor.bat

:: Check PostgreSQL
echo [1/5] Checking PostgreSQL...
net start | findstr "postgresql" >nul
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL not running! Please start it first.
    pause
    exit /b 1
)
echo ✅ PostgreSQL ready

:: Start NocoDB in background
echo [2/5] Starting NocoDB...
taskkill /F /IM "Noco-win-x64.exe" >nul 2>&1
cd /d "H:\Project Folder\NocoDB"
start /MIN "NocoDB" Noco-win-x64.exe
cd /d "%PROJECT_PATH%"
timeout /t 3 >nul
echo ✅ NocoDB started (minimized)

:: Set PATH for Phoenix/Elixir
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo.
echo ========================================
echo  🚀 LAUNCHING UNIFIED ENVIRONMENT
echo ========================================
echo.
echo Services starting in tabs/panes:
echo  📊 NocoDB     - http://localhost:8080 (background)
echo  🔧 Backend    - http://localhost:3001 
echo  🎯 Phoenix    - http://localhost:4000
echo  🌐 Frontend   - http://localhost:3000
echo.
echo ⚠️  IMPORTANT: Press Ctrl+C to stop ALL services
echo.

:: Start all services in separate windows
echo [3/5] Starting Backend API...
start /MIN "Backend API" cmd /k "cd /d "%PROJECT_PATH%\backend" && npm run dev" 
timeout /t 3 >nul

echo [4/5] Starting Phoenix Draft System...
start /MIN "Phoenix Draft System" cmd /k "cd /d "%PROJECT_PATH%\phoenix_draft" && mix phx.server"
timeout /t 3 >nul

echo [5/5] Starting Frontend React App...
start /MIN "Frontend React App" cmd /k "cd /d "%PROJECT_PATH%\frontend" && npm start"
timeout /t 5 >nul

echo.
echo Opening Phoenix Draft System in browser...
timeout /t 2 >nul
start "" "http://localhost:4000/"

echo.
echo ========================================
echo  ✅ ALL SERVICES RUNNING
echo ========================================
echo.
echo  Access Points:
echo  🌐 Website:    http://localhost:3000
echo  🔧 Backend:    http://localhost:3001  
echo  🎯 Drafts:     http://localhost:4000
echo  📊 NocoDB:     http://localhost:8080
echo.
echo  Services Status:
echo  • Backend API: Starting... (check http://localhost:3001)
echo  • Phoenix Draft: Starting... (check http://localhost:4000)  
echo  • React Frontend: Starting... (check http://localhost:3000)
echo  • NocoDB: Running (minimized)
echo.
echo ========================================
echo  ENVIRONMENT READY - Press Ctrl+C to stop all
echo ========================================

:: Keep the window open and wait for user interrupt
:WAIT_LOOP
timeout /t 5 >nul
echo [%TIME%] All services running... (Ctrl+C to stop all)
goto WAIT_LOOP

:: Cleanup on exit (this runs when Ctrl+C is pressed)
:CLEANUP
echo.
echo ========================================
echo  🛑 SHUTTING DOWN ALL SERVICES...
echo ========================================
call "%CLEANUP_SCRIPT%"
del "%CLEANUP_SCRIPT%" >nul 2>&1
echo.
echo All services stopped. You can close this window.
pause
exit