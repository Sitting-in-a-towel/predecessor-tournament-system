@echo off
echo ========================================
echo PROJECT CLEANUP SCRIPT
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website"

echo Creating organized folders if they don't exist...
if not exist "testing\screenshots" mkdir testing\screenshots
if not exist "testing\debug-scripts" mkdir testing\debug-scripts  
if not exist "testing\test-reports" mkdir testing\test-reports
if not exist "development\database-scripts" mkdir development\database-scripts
if not exist "development\debug-files" mkdir development\debug-files
if not exist "archive\loose-files" mkdir archive\loose-files

echo.
echo Moving loose files to organized folders...

REM Move screenshots
if exist *.png (
    echo Moving screenshots...
    move *.png testing\screenshots\
)

REM Move debug and test scripts
if exist *test*.js (
    echo Moving test scripts...
    move *test*.js testing\debug-scripts\
)

if exist *debug*.js (
    echo Moving debug scripts...
    move *debug*.js testing\debug-scripts\
)

REM Move analysis reports
if exist *ANALYSIS*.md (
    echo Moving analysis reports...
    move *ANALYSIS*.md testing\test-reports\
)

if exist *REPORT*.md (
    echo Moving reports...
    move *REPORT*.md testing\test-reports\
)

REM Move database scripts
if exist *.sql (
    echo Moving SQL files...
    move *.sql development\database-scripts\
)

REM Move other loose files
if exist temp_* (
    echo Moving temporary files...
    move temp_* archive\loose-files\
)

echo.
echo ========================================
echo CLEANUP COMPLETE!
echo ========================================
echo Main folder is now organized.
echo Check CLAUDE.md for what shouldn't be changed.
echo Check TROUBLESHOOTING.md when stuck.
echo.
pause