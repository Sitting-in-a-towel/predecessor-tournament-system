@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Starting Production Environment
echo ========================================
echo.

REM Check for environment files
if not exist "%~dp0..\backend\.env" (
    echo ERROR: Backend .env file not found!
    echo Please copy .env.example to .env and configure your production settings.
    pause
    exit /b 1
)

if not exist "%~dp0..\frontend\.env" (
    echo ERROR: Frontend .env file not found!
    echo Please copy frontend/.env.example to frontend/.env and configure your production settings.
    pause
    exit /b 1
)

echo Building Frontend for Production...
cd /d "%~dp0..\frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)

echo.
echo Starting Production Backend Server...
cd /d "%~dp0..\backend"
set NODE_ENV=production
start "Production Server" cmd /k "npm start"

echo.
echo ========================================
echo Production server starting...
echo ========================================
echo.
echo Server will be available at the configured production URL
echo Check the server window for detailed startup information
echo.
echo Press any key to continue...
pause