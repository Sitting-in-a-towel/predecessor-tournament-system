-- Tournament Brackets Table
-- Created: August 19, 2025
-- Purpose: Store bracket data and configurations for tournaments

-- Create tournament_brackets table
CREATE TABLE IF NOT EXISTS tournament_brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID UNIQUE REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_data JSONB NOT NULL DEFAULT '{}',
    locked_slots JSONB DEFAULT '[]',
    is_published BOOLEAN DEFAULT FALSE,
    seeding_mode VARCHAR(50) DEFAULT 'random',
    series_length INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tournament ON tournament_brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_published ON tournament_brackets(is_published);
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_created ON tournament_brackets(created_at);

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger
DROP TRIGGER IF EXISTS update_tournament_brackets_updated_at ON tournament_brackets;
CREATE TRIGGER update_tournament_brackets_updated_at 
  BEFORE UPDATE ON tournament_brackets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE tournament_brackets IS 'Stores bracket data and configurations for tournaments';
COMMENT ON COLUMN tournament_brackets.bracket_data IS 'JSON data containing the complete bracket structure';
COMMENT ON COLUMN tournament_brackets.locked_slots IS 'JSON array of locked team slots';
COMMENT ON COLUMN tournament_brackets.is_published IS 'Whether the bracket is published and visible';
COMMENT ON COLUMN tournament_brackets.seeding_mode IS 'How teams are seeded (random, manual, etc)';
COMMENT ON COLUMN tournament_brackets.series_length IS 'Number of games per match in the bracket';