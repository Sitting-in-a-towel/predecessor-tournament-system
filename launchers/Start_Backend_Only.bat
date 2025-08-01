@echo off
echo Starting Backend Server Only...
echo.

cd /d "H:\Project Folder\Predecessor website\backend"

echo Starting backend on port 3001...
start "Backend Server" cmd /k "npm run dev"

echo.
echo Backend server starting in a new window.
echo Check the terminal window for logs.
echo.
pause