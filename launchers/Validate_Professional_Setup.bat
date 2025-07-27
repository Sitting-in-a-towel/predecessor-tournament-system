@echo off
title Validate Professional Setup
color 0A

echo ========================================
echo Validate Professional Setup
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website"

echo Running setup validation...
echo.

node scripts/validate-setup.js

echo.
echo ========================================
echo Validation complete!
echo ========================================
echo.
echo If you see any ❌ issues:
echo 1. Run scripts\professional-setup-complete.bat
echo 2. Follow the fix suggestions above
echo 3. Run this validation again
echo.

pause