@echo off
title Predecessor Tournament System - Development Console
color 0A

echo ========================================
echo Predecessor Tournament Management System
echo Development Environment (Fixed)
echo ========================================
echo.

:: Set working directory
cd /d "H:\Project Folder\Predecessor website"

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm run dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting Frontend Development Server...
cd ../frontend
start "Frontend Server" cmd /k "npm start"

echo.
echo ========================================
echo Services Started Successfully!
echo ========================================
echo.
echo Backend API: http://localhost:3001
echo Frontend App: http://localhost:3000
echo.
echo Two separate windows opened:
echo - Backend Server (with API logs)
echo - Frontend Server (with build logs)
echo.
echo ========================================
echo Monitor both windows for error messages
echo ========================================
echo.

:: Wait a moment then open the frontend
timeout /t 8 /nobreak >nul
start http://localhost:3000

echo Frontend opened in browser.
echo.
echo Press any key to close this window...
echo (Backend and Frontend will keep running)
pause >nul