-- Add missing columns to draft_sessions table
-- These columns are required by Phoenix but missing from the current table

-- Add team ID columns
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS team1_id TEXT;
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS team2_id TEXT;

-- Add captain ID columns  
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS team1_captain_id TEXT;
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS team2_captain_id TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'draft_sessions' 
AND column_name IN ('team1_id', 'team2_id', 'team1_captain_id', 'team2_captain_id');