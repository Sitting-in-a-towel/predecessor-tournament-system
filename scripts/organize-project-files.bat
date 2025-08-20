@echo off
echo ==========================================
echo PROJECT FILE ORGANIZATION
echo ==========================================
echo.

echo Moving screenshot files to testing/screenshots...
if not exist "testing\screenshots" mkdir "testing\screenshots"
move *.png "testing\screenshots\" 2>nul

echo Moving SQL files to development/database-scripts...
if not exist "development\database-scripts" mkdir "development\database-scripts"
move *.sql "development\database-scripts\" 2>nul

echo Moving test HTML files to testing/debug-scripts...
if not exist "testing\debug-scripts" mkdir "testing\debug-scripts"
move *.html "testing\debug-scripts\" 2>nul

echo Moving JavaScript files to testing/debug-scripts...
move migrate_database.js "testing\debug-scripts\" 2>nul

echo Moving tests folder files...
if exist "tests" (
    xcopy /E /I /Y "tests\*" "testing\playwright-tests\"
    rmdir /S /Q "tests"
)

echo Moving phoenix-4000 folder to archive...
if not exist "archive\old-screenshots" mkdir "archive\old-screenshots"
if exist "phoenix-4000" (
    xcopy /E /I /Y "phoenix-4000\*" "archive\old-screenshots\phoenix-4000\"
    rmdir /S /Q "phoenix-4000"
)

echo Moving DATABASE_MIGRATION to development...
if exist "DATABASE_MIGRATION" (
    xcopy /E /I /Y "DATABASE_MIGRATION\*" "development\database-migration\"
    rmdir /S /Q "DATABASE_MIGRATION"
)

echo Moving Notes folder to Project Info...
if exist "Notes" (
    xcopy /E /I /Y "Notes\*" "Project Info\notes\"
    rmdir /S /Q "Notes"
)

echo Moving PRODUCTION_DATABASE_CONFIG.md to Project Info...
if exist "PRODUCTION_DATABASE_CONFIG.md" (
    move "PRODUCTION_DATABASE_CONFIG.md" "Project Info\"
)

echo Removing empty folders...
if exist "New folder" rmdir "New folder" 2>nul

echo.
echo ==========================================
echo FILE ORGANIZATION COMPLETE
echo ==========================================
echo.
echo Files have been organized into:
echo - testing/screenshots (PNG files)
echo - development/database-scripts (SQL files)
echo - testing/debug-scripts (test scripts)
echo - testing/playwright-tests (test specs)
echo - archive/old-screenshots (old screenshots)
echo - Project Info (documentation)
echo.
pause