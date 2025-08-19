-- Bracket Matches Table
-- Created: August 19, 2025
-- Purpose: Store individual match data extracted from bracket JSON for easier querying and updates

-- Create bracket_matches table
CREATE TABLE IF NOT EXISTS bracket_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_id UUID REFERENCES tournament_brackets(id) ON DELETE CASCADE,
    
    -- Match identification
    match_identifier VARCHAR(255) NOT NULL, -- Unique match ID within bracket
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    
    -- Team information
    team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    team1_name VARCHAR(255),
    team2_name VARCHAR(255),
    team1_ref_id VARCHAR(255), -- Original team_id from frontend
    team2_ref_id VARCHAR(255), -- Original team_id from frontend
    
    -- Match results
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    winner_name VARCHAR(255),
    winner_ref_id VARCHAR(255), -- Original team_id from frontend
    
    -- Match status and metadata
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    round_name VARCHAR(255),
    bracket_type VARCHAR(10) DEFAULT 'SE', -- 'SE' (Single Elimination), 'UB' (Upper Bracket), 'LB' (Lower Bracket)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Constraints
    UNIQUE(tournament_id, match_identifier)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bracket_matches_tournament ON bracket_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_bracket ON bracket_matches(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_identifier ON bracket_matches(match_identifier);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_teams ON bracket_matches(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_status ON bracket_matches(status);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_round ON bracket_matches(round_number);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_created ON bracket_matches(created_at);

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_bracket_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger
DROP TRIGGER IF EXISTS update_bracket_matches_updated_at ON bracket_matches;
CREATE TRIGGER update_bracket_matches_updated_at 
  BEFORE UPDATE ON bracket_matches 
  FOR EACH ROW EXECUTE FUNCTION update_bracket_matches_updated_at();

-- Comments for documentation
COMMENT ON TABLE bracket_matches IS 'Individual match data extracted from bracket JSON for easier querying and updates';
COMMENT ON COLUMN bracket_matches.match_identifier IS 'Unique match ID within the bracket (from JSON data)';
COMMENT ON COLUMN bracket_matches.bracket_type IS 'Type of bracket: SE (Single Elimination), UB (Upper Bracket), LB (Lower Bracket)';
COMMENT ON COLUMN bracket_matches.team1_ref_id IS 'Original team_id from frontend bracket JSON';
COMMENT ON COLUMN bracket_matches.team2_ref_id IS 'Original team_id from frontend bracket JSON';
COMMENT ON COLUMN bracket_matches.winner_ref_id IS 'Original team_id from frontend bracket JSON';