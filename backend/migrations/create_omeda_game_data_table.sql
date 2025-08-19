-- Omeda Game Data Table
-- Created: August 19, 2025
-- Purpose: Store game data from Omeda City API integration

CREATE TABLE IF NOT EXISTS omeda_game_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    omeda_match_id VARCHAR(255) NOT NULL,
    match_data JSONB NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, omeda_match_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_omeda_game_data_user_id ON omeda_game_data(user_id);
CREATE INDEX IF NOT EXISTS idx_omeda_game_data_match_date ON omeda_game_data(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_omeda_game_data_omeda_match_id ON omeda_game_data(omeda_match_id);

-- Comments
COMMENT ON TABLE omeda_game_data IS 'Store game data from Omeda City API integration';
COMMENT ON COLUMN omeda_game_data.match_data IS 'JSON data from Omeda City API for the match';