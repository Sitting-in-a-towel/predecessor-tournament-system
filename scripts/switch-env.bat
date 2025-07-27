@echo off
title Environment Switcher
color 0A

echo ========================================
echo Environment Switcher
echo ========================================
echo.
echo Current Environment: %NODE_ENV%
echo.
echo 1. Development (Local)
echo 2. Staging (Test)
echo 3. Production (Live)
echo.

set /p choice="Select environment (1-3): "

if "%choice%"=="1" (
    copy .env.development .env
    echo.
    echo ✅ Switched to DEVELOPMENT environment
    echo - Local development
    echo - Memory sessions (reset on restart)
    echo - No external connections needed
) else if "%choice%"=="2" (
    copy .env.staging .env
    echo.
    echo ✅ Switched to STAGING environment
    echo - Testing environment
    echo - PostgreSQL sessions (persistent)
    echo - Uses Supabase database
) else if "%choice%"=="3" (
    copy .env.production .env
    echo.
    echo ✅ Switched to PRODUCTION environment
    echo - Live website configuration
    echo - PostgreSQL sessions (persistent)
    echo - Uses Supabase database
) else (
    echo ❌ Invalid choice!
    pause
    exit /b 1
)

echo.
echo Environment switched successfully!
echo.
echo 📝 Next steps:
echo 1. Restart your services (close and reopen UI launcher)
echo 2. The new environment will be active
echo.
pause