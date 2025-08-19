-- Check the exact column types in draft_sessions table
\d draft_sessions;

-- Check if any UUID columns are binary type instead of text
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'draft_sessions' 
AND column_name LIKE '%_id';

-- Check if we have any problematic data
SELECT id, tournament_id, team1_id, team2_id, team1_captain_id, team2_captain_id 
FROM draft_sessions 
LIMIT 5;