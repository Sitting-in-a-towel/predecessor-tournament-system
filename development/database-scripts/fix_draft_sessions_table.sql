-- Fix missing columns in draft_sessions table
-- Run this in PostgreSQL to add the missing tournament_id column

-- First, let's see what exists
\d draft_sessions;

-- Add the missing tournament_id column
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS tournament_id UUID;

-- Verify the table structure now has all required columns
\d draft_sessions;

-- Optional: Add some constraints if needed
-- ALTER TABLE draft_sessions ADD CONSTRAINT fk_tournament_id FOREIGN KEY (tournament_id) REFERENCES tournaments(id);