@echo off
title Kill All Development Services
color 0C

echo ========================================
echo  STOPPING ALL DEVELOPMENT SERVICES
echo ========================================
echo.

echo Closing all service windows...
REM Kill windows by title
taskkill /F /FI "WINDOWTITLE eq NocoDB*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Backend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Phoenix Draft*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Predecessor Development*" 2>nul

echo.
echo Killing processes on ports...
REM Kill processes by port
npx kill-port 3000 2>nul
npx kill-port 3001 2>nul
npx kill-port 4000 2>nul
npx kill-port 8080 2>nul

echo.
echo Cleaning up Node processes...
REM Kill any hanging node processes
taskkill /F /IM node.exe 2>nul

echo.
echo Cleaning up Elixir/Phoenix processes...
REM Kill Elixir beam processes
taskkill /F /IM erl.exe 2>nul
taskkill /F /IM beam.smp.exe 2>nul
taskkill /F /IM epmd.exe 2>nul

echo.
echo ========================================
echo  All services have been stopped!
echo ========================================
echo.
pause