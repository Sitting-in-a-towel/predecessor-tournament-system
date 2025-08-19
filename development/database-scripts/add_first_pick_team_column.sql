-- Add missing first_pick_team column to draft_sessions table
ALTER TABLE draft_sessions 
ADD COLUMN IF NOT EXISTS first_pick_team VARCHAR(10);

-- The column stores either "team1" or "team2" to indicate which team picks first
-- This is determined after the coin toss