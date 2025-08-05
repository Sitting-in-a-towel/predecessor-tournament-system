@echo off
title Predecessor Tournament - Simplified Dev Environment
color 0A

echo ========================================
echo  PREDECESSOR DEVELOPMENT (SIMPLIFIED)
echo ========================================
echo.

:: Set the project path
set PROJECT_PATH=H:\Project Folder\Predecessor website

:: Navigate to project root
cd /d "%PROJECT_PATH%"

:: Check PostgreSQL Service
echo [1/4] Checking PostgreSQL service...
net start | findstr "postgresql" >nul
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL service not running!
    echo.
    echo To start PostgreSQL:
    echo 1. Press Win+R, type: services.msc
    echo 2. Find "postgresql-x64-[version]"
    echo 3. Right-click and select "Start"
    echo.
    pause
    exit /b 1
)
echo ✅ PostgreSQL is running

:: Start NocoDB (Required for database UI)
echo [2/4] Starting NocoDB...
taskkill /F /IM "Noco-win-x64.exe" >nul 2>&1
timeout /t 2 >nul
cd /d "H:\Project Folder\NocoDB"
start "NocoDB Database UI" Noco-win-x64.exe
cd /d "%PROJECT_PATH%"
timeout /t 5 >nul
echo ✅ NocoDB started

:: Start Backend
echo [3/4] Starting Backend API...
start "Backend" cmd /k "cd /d "%PROJECT_PATH%\backend" && npm run dev"
timeout /t 5 >nul

:: Start Frontend
echo [4/4] Starting Frontend...
start "Frontend" cmd /k "cd /d "%PROJECT_PATH%\frontend" && npm start"

echo.
echo ========================================
echo  🚀 SIMPLIFIED DEV ENVIRONMENT READY!
echo ========================================
echo.
echo  Running Services (3 windows):
echo  1. NocoDB (minimized) - Database UI
echo  2. Backend - API Server
echo  3. Frontend - React App
echo.
echo  Access Points:
echo  🌐 Website:    http://localhost:3000
echo  🔧 Backend:    http://localhost:3001
echo  📊 NocoDB:     http://localhost:8080
echo  🐘 PostgreSQL: localhost:5432
echo.
echo  This window will close in 10 seconds...
echo ========================================

timeout /t 10
exit