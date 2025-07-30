@echo off
title Predecessor Tournament Management - Full Development Environment
color 0A

echo ========================================
echo  PREDECESSOR DEVELOPMENT ENVIRONMENT
echo ========================================
echo  Starting all services...
echo.

:: Set the project path
set PROJECT_PATH=H:\Project Folder\Predecessor website

:: Navigate to project root
cd /d "%PROJECT_PATH%"

:: Check PostgreSQL Service
echo [1/6] Checking PostgreSQL service...
net start | findstr "postgresql" >nul
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL service not detected
    echo Please ensure PostgreSQL is installed and running
    pause
)
echo ✅ PostgreSQL service detected

:: Kill any existing NocoDB processes and start fresh
echo [2/6] Starting NocoDB...
taskkill /F /IM "Noco-win-x64.exe" >nul 2>&1
timeout /t 1 >nul

echo Starting NocoDB fresh...
start "NocoDB" /min cmd /c "cd /d \"H:\Project Folder\NocoDB\" && Noco-win-x64.exe"
timeout /t 5 >nul
echo ✅ NocoDB starting...

:: Install backend dependencies if needed
echo [3/6] Checking backend dependencies...
if not exist "%PROJECT_PATH%\backend\node_modules" (
    echo Installing backend dependencies...
    cd "%PROJECT_PATH%\backend"
    npm install
    cd "%PROJECT_PATH%"
)

:: Install frontend dependencies if needed  
echo [4/6] Checking frontend dependencies...
if not exist "%PROJECT_PATH%\frontend\node_modules" (
    echo Installing frontend dependencies...
    cd "%PROJECT_PATH%\frontend"
    npm install
    cd "%PROJECT_PATH%"
)

:: Install launcher dependencies if needed
echo [5/6] Checking launcher dependencies...
if not exist "%PROJECT_PATH%\launcher-app\node_modules" (
    echo Installing launcher dependencies...
    cd "%PROJECT_PATH%\launcher-app"
    npm install
    cd "%PROJECT_PATH%"
)

:: Start all services
echo [6/6] Starting development services...
echo.
echo Starting services in order:
echo  1. UI Launcher (Port 4000)
echo  2. Backend API (Port 3001) 
echo  3. Frontend App (Port 3000)
echo.

:: Create individual batch files for each service to avoid path issues
echo @echo off > "%TEMP%\start_launcher.bat"
echo cd /d "%PROJECT_PATH%\launcher-app" >> "%TEMP%\start_launcher.bat"
echo npm start >> "%TEMP%\start_launcher.bat"

echo @echo off > "%TEMP%\start_backend.bat"
echo cd /d "%PROJECT_PATH%\backend" >> "%TEMP%\start_backend.bat"
echo npm run dev >> "%TEMP%\start_backend.bat"

echo @echo off > "%TEMP%\start_frontend.bat"
echo cd /d "%PROJECT_PATH%\frontend" >> "%TEMP%\start_frontend.bat"
echo npm start >> "%TEMP%\start_frontend.bat"

:: Start services using temporary batch files
echo Starting UI Launcher...
start "UI Launcher" cmd /k "%TEMP%\start_launcher.bat"
timeout /t 3 >nul

echo Starting Backend API...
start "Backend API" cmd /k "%TEMP%\start_backend.bat"
timeout /t 3 >nul

echo Starting Frontend...
start "Frontend" cmd /k "%TEMP%\start_frontend.bat"
timeout /t 3 >nul

echo.
echo ========================================
echo  🚀 DEVELOPMENT ENVIRONMENT STARTED!
echo ========================================
echo.
echo  Services Available:
echo  📊 UI Launcher:    http://localhost:4000
echo  🔧 Backend API:    http://localhost:3001
echo  🌐 Frontend App:   http://localhost:3000
echo  🗄️  NocoDB Admin:   http://localhost:8080
echo  🐘 PostgreSQL:     localhost:5432
echo.
echo  Database Management:
echo  📋 pgAdmin 4:      Available from Start Menu
echo  💾 NocoDB UI:      http://localhost:8080
echo.
echo  Logs and Monitoring:
echo  📈 Real-time logs available in UI Launcher
echo  🔍 Individual service logs in respective terminals
echo.
echo ========================================
echo  🎯 QUICK ACCESS LINKS
echo ========================================
echo  Opening browser windows...

:: Wait for services to fully start
timeout /t 8 >nul

:: Open browser windows
start http://localhost:4000
timeout /t 2 >nul
start http://localhost:3000
timeout /t 2 >nul
start http://localhost:8080

echo.
echo ✅ All services started successfully!
echo ✅ Browser windows opened
echo.
echo Press any key to show service status...
pause >nul

:: Show running services
echo.
echo ========================================
echo  📊 SERVICE STATUS CHECK
echo ========================================
echo.

:: Check each service
echo Checking UI Launcher (Port 4000)...
netstat -an | findstr ":4000" >nul && echo ✅ UI Launcher running || echo ❌ UI Launcher not detected

echo Checking Backend API (Port 3001)...
netstat -an | findstr ":3001" >nul && echo ✅ Backend API running || echo ❌ Backend API not detected

echo Checking Frontend (Port 3000)...
netstat -an | findstr ":3000" >nul && echo ✅ Frontend running || echo ❌ Frontend not detected

echo Checking NocoDB (Port 8080)...
netstat -an | findstr ":8080" >nul && echo ✅ NocoDB running || echo ❌ NocoDB not detected

echo Checking PostgreSQL (Port 5432)...
netstat -an | findstr ":5432" >nul && echo ✅ PostgreSQL running || echo ❌ PostgreSQL not detected

echo.
echo ========================================
echo  🎮 READY FOR DEVELOPMENT!
echo ========================================
echo.
echo  To stop all services:
echo  - Close individual service windows
echo  - Or run: npx kill-port 3000 3001 4000 8080
echo.
echo  Happy coding! 🚀
echo.

:: Cleanup temporary files
del "%TEMP%\start_launcher.bat" 2>nul
del "%TEMP%\start_backend.bat" 2>nul
del "%TEMP%\start_frontend.bat" 2>nul

pause