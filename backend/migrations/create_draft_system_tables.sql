-- Draft System Database Schema
-- Created: August 8, 2025
-- Purpose: Multiplayer draft coordination tables

-- Draft sessions table - Main table for draft coordination
CREATE TABLE IF NOT EXISTS draft_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id VARCHAR(255), -- Match identifier from bracket system
  team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team1_captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team2_captain_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Session configuration
  draft_configuration JSONB DEFAULT '{
    "timer_enabled": true,
    "timer_strategy": "30s_per_round",
    "bonus_time": "disabled",
    "coin_toss_enabled": true,
    "ban_count": 2,
    "strategy": "restricted_no_mirror"
  }'::jsonb,
  
  -- Current session state
  session_state JSONB DEFAULT '{
    "captains_present": false,
    "current_phase": "waiting",
    "current_turn": null,
    "timer_remaining": null
  }'::jsonb,
  
  -- Coin toss results
  coin_toss_result JSONB DEFAULT NULL,
  
  -- Draft results (picks and bans)
  draft_result JSONB DEFAULT '{
    "team1_picks": [],
    "team2_picks": [],
    "team1_bans": [],
    "team2_bans": [],
    "completed": false
  }'::jsonb,
  
  -- Custom match code for game import
  match_code VARCHAR(50) DEFAULT NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'coin_toss', 'drafting', 'completed', 'cancelled'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Captain presence tracking
CREATE TABLE IF NOT EXISTS draft_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL CHECK (team_number IN (1, 2)),
  
  -- Presence tracking
  is_present BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Connection info
  socket_id VARCHAR(255) DEFAULT NULL,
  
  -- Ensure one participant per user per session
  UNIQUE(session_id, user_id)
);

-- Draft actions log - Complete audit trail
CREATE TABLE IF NOT EXISTS draft_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action details
  action_type VARCHAR(50) NOT NULL, -- 'join', 'leave', 'coin_toss', 'pick', 'ban', 'timeout', 'complete'
  action_data JSONB DEFAULT '{}',
  
  -- Context
  phase VARCHAR(50) DEFAULT NULL, -- 'waiting', 'coin_toss', 'ban1', 'pick1', etc.
  team_number INTEGER DEFAULT NULL,
  hero_id VARCHAR(100) DEFAULT NULL,
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timer_remaining INTEGER DEFAULT NULL, -- Seconds remaining when action taken
  
  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT DEFAULT NULL
);

-- Draft timer events - Track timer state changes
CREATE TABLE IF NOT EXISTS draft_timer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
  
  -- Timer details
  phase VARCHAR(50) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  remaining_seconds INTEGER NOT NULL,
  
  -- Event type
  event_type VARCHAR(50) NOT NULL, -- 'start', 'pause', 'resume', 'expire', 'skip'
  
  -- Context
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(255) DEFAULT NULL,
  
  -- Timing
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Heroes table already exists, just add missing columns if needed
DO $$
BEGIN
  -- Add pick_rate column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heroes' AND column_name='pick_rate') THEN
    ALTER TABLE heroes ADD COLUMN pick_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
  
  -- Add ban_rate column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heroes' AND column_name='ban_rate') THEN
    ALTER TABLE heroes ADD COLUMN ban_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
  
  -- Add win_rate column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='heroes' AND column_name='win_rate') THEN
    ALTER TABLE heroes ADD COLUMN win_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
END $$;

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_draft_sessions_updated_at ON draft_sessions;
CREATE TRIGGER update_draft_sessions_updated_at 
  BEFORE UPDATE ON draft_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_heroes_updated_at ON heroes;
CREATE TRIGGER update_heroes_updated_at 
  BEFORE UPDATE ON heroes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure some basic heroes exist (using existing table structure)
INSERT INTO heroes (hero_id, name, role, is_active) VALUES
  ('greystone', 'Greystone', 'offlane', true),
  ('rampage', 'Rampage', 'jungle', true),
  ('gideon', 'Gideon', 'midlane', true),
  ('murdock', 'Murdock', 'carry', true),
  ('muriel', 'Muriel', 'support', true),
  ('phase', 'Phase', 'support', true),
  ('steel', 'Steel', 'support', true),
  ('dekker', 'Dekker', 'support', true),
  ('feng_mao', 'Feng Mao', 'offlane', true),
  ('kallari', 'Kallari', 'jungle', true)
ON CONFLICT (hero_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_draft_sessions_tournament ON draft_sessions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_teams ON draft_sessions(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_status ON draft_sessions(status);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_created ON draft_sessions(created_at);

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_draft_participants_session ON draft_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_draft_participants_user ON draft_participants(user_id);

-- Action indexes
CREATE INDEX IF NOT EXISTS idx_draft_actions_session ON draft_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_draft_actions_timestamp ON draft_actions(timestamp);

-- Timer indexes
CREATE INDEX IF NOT EXISTS idx_draft_timer_session ON draft_timer_events(session_id);
CREATE INDEX IF NOT EXISTS idx_draft_timer_timestamp ON draft_timer_events(timestamp);

-- Hero indexes
CREATE INDEX IF NOT EXISTS idx_heroes_role ON heroes(role);
CREATE INDEX IF NOT EXISTS idx_heroes_active ON heroes(is_active);

-- Comments for documentation
COMMENT ON TABLE draft_sessions IS 'Main table for multiplayer draft coordination between team captains';
COMMENT ON TABLE draft_participants IS 'Tracks captain presence and connection state in draft sessions';
COMMENT ON TABLE draft_actions IS 'Complete audit trail of all actions taken during draft sessions';
COMMENT ON TABLE draft_timer_events IS 'Tracks timer state changes and events during draft phases';
COMMENT ON TABLE heroes IS 'Reference data for available heroes in draft system';

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON TABLE draft_sessions TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE draft_participants TO your_app_user;  
-- GRANT ALL PRIVILEGES ON TABLE draft_actions TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE draft_timer_events TO your_app_user;
-- GRANT ALL PRIVILEGES ON TABLE heroes TO your_app_user;