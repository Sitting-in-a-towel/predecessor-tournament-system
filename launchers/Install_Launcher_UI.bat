@echo off
title Predecessor Tournament System - Installing UI Launcher
echo ========================================
echo Installing UI Launcher Dependencies
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website\launcher-app"

echo Installing required packages...
echo.
call npm install

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo The UI Launcher is now ready to use.
echo Run "Start_UI_Launcher_Real.bat" to launch it.
echo.

pause