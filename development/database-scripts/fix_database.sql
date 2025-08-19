-- Phoenix Database Schema Fix
-- This adds the missing columns that Phoenix expects

-- Add metadata column if it doesn't exist
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add settings column if it doesn't exist  
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'draft_sessions' 
AND column_name IN ('metadata', 'settings');

-- Show success message
SELECT 'Database schema fix completed successfully!' as result;