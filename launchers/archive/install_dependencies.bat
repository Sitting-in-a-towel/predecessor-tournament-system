@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Installing Dependencies
echo ========================================
echo.

echo Installing Frontend Dependencies...
cd /d "%~dp0..\frontend"
if not exist "package.json" (
    echo ERROR: Frontend package.json not found!
    pause
    exit /b 1
)

call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend dependency installation failed!
    pause
    exit /b 1
)

echo.
echo Installing Backend Dependencies...
cd /d "%~dp0..\backend"
if not exist "package.json" (
    echo ERROR: Backend package.json not found!
    pause
    exit /b 1
)

call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend dependency installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Dependencies installed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Copy .env.example files and configure your environment variables
echo 2. Set up your Airtable database
echo 3. Configure Discord OAuth application
echo 4. Run start_development.bat to start the application
echo.
pause