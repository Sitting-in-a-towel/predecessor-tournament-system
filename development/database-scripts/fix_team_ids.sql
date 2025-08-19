-- Check current teams in your tournament
SELECT id, name, captain_id, tournament_id 
FROM teams 
WHERE tournament_id = '67e81a0d-1165-4481-ad58-85da372f86d5';

-- If teams don't have proper UUIDs, update them:
-- Example (replace with your actual team names):
/*
UPDATE teams 
SET captain_id = gen_random_uuid() 
WHERE tournament_id = '67e81a0d-1165-4481-ad58-85da372f86d5' 
AND captain_id IS NULL;
*/