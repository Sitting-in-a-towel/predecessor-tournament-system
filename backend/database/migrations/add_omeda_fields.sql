-- Add Omeda.city integration fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS omeda_player_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS omeda_profile_data JSONB,
ADD COLUMN IF NOT EXISTS omeda_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS omeda_sync_enabled BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_omeda_player_id ON users(omeda_player_id);

-- Create omeda_game_data table to store match history
CREATE TABLE IF NOT EXISTS omeda_game_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    omeda_match_id VARCHAR(255) NOT NULL,
    match_data JSONB NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, omeda_match_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_omeda_game_data_user_id ON omeda_game_data(user_id);
CREATE INDEX IF NOT EXISTS idx_omeda_game_data_match_date ON omeda_game_data(match_date DESC);

-- Comments for documentation
COMMENT ON COLUMN users.omeda_player_id IS 'Omeda.city player ID for API integration';
COMMENT ON COLUMN users.omeda_profile_data IS 'Cached Omeda.city profile data (JSON)';
COMMENT ON COLUMN users.omeda_last_sync IS 'Last time profile was synced from Omeda.city';
COMMENT ON COLUMN users.omeda_sync_enabled IS 'Whether automatic sync is enabled for this user';
COMMENT ON TABLE omeda_game_data IS 'Stores match history data from Omeda.city API';
COMMENT ON COLUMN omeda_game_data.match_data IS 'Full match data from Omeda.city API (JSON)';