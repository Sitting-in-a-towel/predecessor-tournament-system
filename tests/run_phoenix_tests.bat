@echo off
echo ============================================
echo    PHOENIX DRAFT SYSTEM - PLAYWRIGHT TESTS
echo ============================================
echo.
echo Testing Phoenix LiveView Draft System
echo URL: http://localhost:4000
echo.

REM Check if Phoenix is running
curl -s http://localhost:4000 > nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Phoenix server is not running on localhost:4000
    echo.
    echo Please start Phoenix first:
    echo 1. Open PowerShell
    echo 2. Navigate to: H:\Project Folder\Predecessor website\phoenix_draft
    echo 3. Run: mix phx.server
    echo.
    pause
    exit /b 1
)

echo ✅ Phoenix server is running
echo.
echo Running Playwright tests...
echo.

npx playwright test tests\phoenix-draft-system.spec.js --headed

echo.
echo ============================================
echo Tests complete! Check results above.
echo ============================================
pause