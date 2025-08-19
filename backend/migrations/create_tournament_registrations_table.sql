-- Tournament Registrations Table
-- Created: August 19, 2025
-- Purpose: Track team registrations for tournaments

CREATE TABLE IF NOT EXISTS tournament_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    registered_by UUID NOT NULL REFERENCES users(id),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'registered',
    checked_in BOOLEAN DEFAULT false,
    check_in_time TIMESTAMP WITH TIME ZONE,
    UNIQUE(tournament_id, team_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team ON tournament_registrations(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user ON tournament_registrations(registered_by);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON tournament_registrations(status);

-- Comments
COMMENT ON TABLE tournament_registrations IS 'Track team registrations for tournaments';
COMMENT ON COLUMN tournament_registrations.status IS 'Registration status: registered, confirmed, withdrawn, etc';