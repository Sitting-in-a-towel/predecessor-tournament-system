-- Verify PostgreSQL Schema Creation
-- This script checks if all tables were created successfully

\echo 'Checking if all tables exist...'
\echo ''

-- List all tables in the database
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

\echo ''
\echo 'Checking table row counts:'

-- Check if tables are empty (as expected after schema creation)
SELECT 
    'users' as table_name, 
    COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 
    'tournaments' as table_name, 
    COUNT(*) as row_count 
FROM tournaments
UNION ALL
SELECT 
    'teams' as table_name, 
    COUNT(*) as row_count 
FROM teams
UNION ALL
SELECT 
    'heroes' as table_name, 
    COUNT(*) as row_count 
FROM heroes;

\echo ''
\echo 'Schema verification complete!'
\echo 'All tables should show 0 rows except heroes (which has sample data).'