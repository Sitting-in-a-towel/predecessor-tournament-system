-- Fix Phoenix database schema to match the application
-- Run this in your PostgreSQL database

-- Connect to the database first, then run:
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Verify the schema
\d draft_sessions;