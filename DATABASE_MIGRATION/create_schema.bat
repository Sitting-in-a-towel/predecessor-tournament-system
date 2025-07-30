@echo off
echo =============================================
echo  CREATING PREDECESSOR TOURNAMENT SCHEMA
echo =============================================
echo.
echo This will create all tables in the PostgreSQL database.
echo You will be prompted for the postgres user password.
echo.
pause

echo Connecting to PostgreSQL and creating schema...
psql -U postgres -d predecessor_tournaments -f "postgresql_schema.sql"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Schema created successfully!
    echo.
    echo The following tables have been created:
    echo - users
    echo - tournaments  
    echo - teams
    echo - team_players
    echo - matches
    echo - match_results
    echo - heroes
    echo - draft_sessions
    echo - draft_actions
    echo.
) else (
    echo.
    echo ❌ Error creating schema!
    echo Please check the error messages above.
    echo.
)

pause