@echo off
echo ========================================
echo Predecessor Hero Image Downloader
echo ========================================
echo.

cd /d "%~dp0"

echo Downloading all hero images...
node download_hero_images.js

echo.
echo Done! Check the images folder:
echo H:\Project Folder\Predecessor website\phoenix_draft\priv\static\images\heroes
echo.
pause