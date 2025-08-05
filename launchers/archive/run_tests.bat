@echo off
echo ========================================
echo Predecessor Tournament Management System
echo Running Test Suite
echo ========================================
echo.

echo Running Backend Tests...
cd /d "%~dp0..\backend"
if exist "package.json" (
    call npm test
    if %errorlevel% neq 0 (
        echo WARNING: Backend tests failed or not configured
    )
) else (
    echo No backend package.json found
)

echo.
echo Running Frontend Tests...
cd /d "%~dp0..\frontend"
if exist "package.json" (
    call npm test -- --coverage --watchAll=false
    if %errorlevel% neq 0 (
        echo WARNING: Frontend tests failed or not configured
    )
) else (
    echo No frontend package.json found
)

echo.
echo ========================================
echo Test Suite Complete
echo ========================================
echo.
pause