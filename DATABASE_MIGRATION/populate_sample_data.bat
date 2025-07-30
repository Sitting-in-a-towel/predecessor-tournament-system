@echo off
echo =============================================
echo  POPULATING SAMPLE DATA IN POSTGRESQL
echo =============================================
echo.
echo This will add sample test data to all tables:
echo - 1 test admin user
echo - 1 sample tournament
echo - 1 sample team with captain
echo - 1 sample match
echo - 1 sample draft session
echo - Heroes already populated by schema
echo.
echo You will be prompted for the postgres user password.
echo.
pause

echo Connecting to PostgreSQL and inserting sample data...
psql -U postgres -d predecessor_tournaments -f "populate_sample_data.sql"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Sample data populated successfully!
    echo.
    echo You can now test the tournament system with:
    echo - Test admin user with Discord ID: 123456789012345678
    echo - Sample tournament: "Sample Championship Tournament"
    echo - Sample team: "Sample Esports Team"
    echo.
    echo The system is ready for testing!
    echo.
) else (
    echo.
    echo ❌ Error populating sample data!
    echo Please check the error messages above.
    echo.
)

pause