@echo off
title Predecessor Tournament System - UI Launcher
echo ========================================
echo Predecessor Tournament Management System
echo Real-Time UI Launcher
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website\launcher-app"

echo Starting UI launcher server...
start "UI Launcher Server" cmd /k "node server.js"

echo Waiting for launcher to start...
timeout /t 3 /nobreak >nul

echo Opening launcher interface...
start http://localhost:4000

echo.
echo ========================================
echo UI Launcher Started!
echo ========================================
echo.
echo Interface: http://localhost:4000
echo.
echo Use the web interface to:
echo - Start/stop development servers
echo - Monitor real-time logs
echo - Track user actions (login, team creation, etc.)
echo - Filter logs by type
echo - View recent events
echo.
echo Close this window when done.
pause >nul