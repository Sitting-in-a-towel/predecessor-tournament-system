@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Starting Development Environment
echo ========================================
echo.

REM Check if dependencies are installed
if not exist "%~dp0..\frontend\node_modules" (
    echo Frontend dependencies not found. Running installation...
    call "%~dp0install_dependencies.bat"
)

if not exist "%~dp0..\backend\node_modules" (
    echo Backend dependencies not found. Running installation...
    call "%~dp0install_dependencies.bat"
)

REM Check for environment files
if not exist "%~dp0..\backend\.env" (
    echo WARNING: Backend .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    echo.
    pause
)

if not exist "%~dp0..\frontend\.env" (
    echo WARNING: Frontend .env file not found!
    echo Please copy frontend/.env.example to frontend/.env and configure your settings.
    echo.
)

echo Starting Backend Server (Port 3001)...
cd /d "%~dp0..\backend"
start "Backend Server" cmd /k "npm run dev"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Development Server (Port 3000)...
cd /d "%~dp0..\frontend"
start "Frontend Server" cmd /k "npm start"

echo.
echo ========================================
echo Development servers starting...
echo ========================================
echo.
echo Backend API: http://localhost:3001
echo Frontend App: http://localhost:3000
echo.
echo Press any key to monitor both servers...
pause

REM Open monitoring windows
echo Opening application in browser...
timeout /t 5 /nobreak > nul
start http://localhost:3000

echo.
echo Development environment is running!
echo Close this window or press Ctrl+C to stop all servers.
echo.
pause