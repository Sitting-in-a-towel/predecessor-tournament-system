@echo off
echo Checking what's using port 4000...
echo.

netstat -ano | findstr :4000

echo.
echo Killing any process using port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    echo Killing PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Port 4000 should now be free!
pause