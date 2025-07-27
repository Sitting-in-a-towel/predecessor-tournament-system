@echo off
title Predecessor Tournament System - UI Launcher
echo ========================================
echo Predecessor Tournament Management System
echo UI Launcher
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website"

echo Opening development launcher UI...
start "" "launcher-ui\index.html"

echo.
echo Development launcher opened in your browser.
echo This provides a unified interface for:
echo - Starting/stopping services
echo - Monitoring logs in real-time
echo - Quick access to all URLs
echo.

timeout /t 3 /nobreak >nul

echo Starting actual development services...
echo.

:: Start backend
cd backend
start "Backend Server" cmd /k "echo Backend Server Started && npm run dev"

:: Wait a moment
timeout /t 3 /nobreak >nul

:: Start frontend
cd ../frontend
start "Frontend Server" cmd /k "echo Frontend Server Started && npm start"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo UI Launcher: Check your browser
echo Backend: Terminal window opened
echo Frontend: Terminal window opened
echo.
echo Press any key to close this launcher...
pause >nul