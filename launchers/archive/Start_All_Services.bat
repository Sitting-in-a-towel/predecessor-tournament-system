@echo off
title Predecessor Tournament - All Services Manager
color 0A

echo ========================================
echo  PREDECESSOR SERVICES MANAGER
echo ========================================
echo.
echo Choose your preferred launcher:
echo.
echo [1] Unified Launcher (All in background + status window)
echo [2] PowerShell Launcher (Advanced monitoring)  
echo [3] Windows Terminal (Separate tabs - requires Windows Terminal)
echo [4] Original Simple Launcher (Separate windows)
echo [5] Help / Information
echo.
echo [Q] Quit
echo.

set /p choice="Enter your choice (1-5, Q): "

if /i "%choice%"=="1" goto UNIFIED
if /i "%choice%"=="2" goto POWERSHELL
if /i "%choice%"=="3" goto TERMINAL
if /i "%choice%"=="4" goto SIMPLE
if /i "%choice%"=="5" goto HELP
if /i "%choice%"=="q" goto QUIT

echo Invalid choice. Please try again.
pause
cls
goto START

:UNIFIED
echo.
echo Starting Unified Launcher...
call "%~dp0launchers\Unified_Development_Launcher.bat"
goto END

:POWERSHELL
echo.
echo Starting PowerShell Launcher...
powershell -ExecutionPolicy Bypass -File "%~dp0launchers\PowerShell_Unified_Launcher.ps1"
goto END

:TERMINAL
echo.
echo Starting Windows Terminal Launcher...
echo.
echo Instructions:
echo 1. Copy the contents of: launchers\Windows_Terminal_Launcher.json
echo 2. Add to your Windows Terminal settings
echo 3. Or manually open tabs for each service
echo.
echo Opening Windows Terminal...
wt -p "Backend API" ; split-pane -p "Phoenix Draft System" ; split-pane -p "React Frontend" ; split-pane -p "NocoDB Database UI"
goto END

:SIMPLE
echo.
echo Starting Simple Launcher (Original)...
call "%~dp0launchers\Start_Development_Simple.bat"
goto END

:HELP
cls
echo ========================================
echo  PREDECESSOR LAUNCHERS - HELP
echo ========================================
echo.
echo OPTION 1 - UNIFIED LAUNCHER (Recommended)
echo   • All services run in background
echo   • Single status window shows all services  
echo   • Ctrl+C stops everything cleanly
echo   • Least resource intensive
echo.
echo OPTION 2 - POWERSHELL LAUNCHER
echo   • Advanced monitoring and status
echo   • Real-time service health checks
echo   • Better error handling
echo   • Automatic cleanup on exit
echo.
echo OPTION 3 - WINDOWS TERMINAL  
echo   • Each service in separate tab
echo   • Clean, organized interface
echo   • Requires Windows Terminal app
echo   • Best for debugging individual services
echo.
echo OPTION 4 - SIMPLE LAUNCHER (Original)
echo   • Each service in separate window
echo   • Traditional approach
echo   • Easy to see all outputs
echo   • Can be cluttered with many windows
echo.
echo ========================================
echo  SERVICE URLS (Same for all launchers)
echo ========================================
echo   🌐 Website:    http://localhost:3000
echo   🔧 Backend:    http://localhost:3001
echo   🎯 Drafts:     http://localhost:4000  
echo   📊 NocoDB:     http://localhost:8080
echo.
pause
cls
goto START

:QUIT
echo.
echo Goodbye!
timeout /t 2 >nul
exit

:END
echo.
echo Launcher finished.
pause

:START