@echo off
echo ========================================
echo Update Specific Hero
echo ========================================
echo.

cd /d "%~dp0"

if "%1"=="" (
    echo Usage: update_hero.bat "Hero Name"
    echo Example: update_hero.bat "Aurora"
    echo.
    pause
    exit /b
)

echo Updating hero: %1
node download_hero_images.js --hero=%1 --update-all

echo.
echo Done! Updated hero: %1
echo.
pause