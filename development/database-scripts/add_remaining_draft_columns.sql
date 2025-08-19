-- Add all remaining missing columns to draft_sessions table
ALTER TABLE draft_sessions 
ADD COLUMN IF NOT EXISTS coin_toss_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS coin_toss_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS draft_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS draft_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team1_coin_choice VARCHAR(10),
ADD COLUMN IF NOT EXISTS team2_coin_choice VARCHAR(10),
ADD COLUMN IF NOT EXISTS coin_toss_result VARCHAR(10),
ADD COLUMN IF NOT EXISTS coin_toss_winner VARCHAR(10),
ADD COLUMN IF NOT EXISTS team1_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team2_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team1_picks TEXT[],
ADD COLUMN IF NOT EXISTS team2_picks TEXT[],
ADD COLUMN IF NOT EXISTS team1_bans TEXT[],
ADD COLUMN IF NOT EXISTS team2_bans TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN draft_sessions.coin_toss_started_at IS 'When coin toss phase began';
COMMENT ON COLUMN draft_sessions.coin_toss_completed_at IS 'When coin toss was completed';
COMMENT ON COLUMN draft_sessions.draft_started_at IS 'When hero selection phase began';
COMMENT ON COLUMN draft_sessions.draft_completed_at IS 'When draft was completed';
COMMENT ON COLUMN draft_sessions.team1_coin_choice IS 'Team 1 coin choice: heads or tails';
COMMENT ON COLUMN draft_sessions.team2_coin_choice IS 'Team 2 coin choice: heads or tails';
COMMENT ON COLUMN draft_sessions.coin_toss_result IS 'Actual coin toss result: heads or tails';
COMMENT ON COLUMN draft_sessions.coin_toss_winner IS 'Which team won: team1 or team2';
COMMENT ON COLUMN draft_sessions.team1_connected IS 'Is team 1 captain connected';
COMMENT ON COLUMN draft_sessions.team2_connected IS 'Is team 2 captain connected';
COMMENT ON COLUMN draft_sessions.team1_picks IS 'Array of hero IDs picked by team 1';
COMMENT ON COLUMN draft_sessions.team2_picks IS 'Array of hero IDs picked by team 2';
COMMENT ON COLUMN draft_sessions.team1_bans IS 'Array of hero IDs banned by team 1';
COMMENT ON COLUMN draft_sessions.team2_bans IS 'Array of hero IDs banned by team 2';