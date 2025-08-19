-- Predecessor Tournament Management System
-- PostgreSQL Database Schema
-- Version: 1.0.0

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS draft_actions CASCADE;
DROP TABLE IF EXISTS draft_sessions CASCADE;
DROP TABLE IF EXISTS match_results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS heroes CASCADE;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(50) UNIQUE NOT NULL, -- Legacy compatibility
    discord_id VARCHAR(50) UNIQUE NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    discord_discriminator VARCHAR(10),
    email VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_discord_username ON users(discord_username);

-- =============================================
-- TOURNAMENTS TABLE
-- =============================================
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id VARCHAR(50) UNIQUE NOT NULL, -- Legacy compatibility
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bracket_type VARCHAR(50) NOT NULL CHECK (bracket_type IN ('Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss')),
    game_format VARCHAR(50) NOT NULL CHECK (game_format IN ('Best of 1', 'Best of 3', 'Best of 5')),
    quarter_final_format VARCHAR(50) CHECK (quarter_final_format IN ('Best of 1', 'Best of 3', 'Best of 5')),
    semi_final_format VARCHAR(50) CHECK (semi_final_format IN ('Best of 1', 'Best of 3', 'Best of 5')),
    grand_final_format VARCHAR(50) CHECK (grand_final_format IN ('Best of 1', 'Best of 3', 'Best of 5')),
    max_teams INTEGER NOT NULL CHECK (max_teams >= 2 AND max_teams <= 256),
    current_teams INTEGER DEFAULT 0,
    registration_open BOOLEAN DEFAULT TRUE,
    check_in_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Registration', 'Check-In', 'In Progress', 'Completed', 'Cancelled')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    check_in_start TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);

-- =============================================
-- TEAMS TABLE
-- =============================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id VARCHAR(50) UNIQUE NOT NULL, -- Legacy compatibility
    team_name VARCHAR(100) NOT NULL,
    team_tag VARCHAR(10),
    team_logo TEXT, -- URL or base64
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES users(id),
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    checked_in BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    seed INTEGER,
    placement INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_name, tournament_id) -- Prevent duplicate team names per tournament
);

CREATE INDEX idx_teams_tournament ON teams(tournament_id);
CREATE INDEX idx_teams_captain ON teams(captain_id);
CREATE INDEX idx_teams_confirmed ON teams(confirmed);
CREATE INDEX idx_teams_checked_in ON teams(checked_in);

-- =============================================
-- TEAM_PLAYERS TABLE (Junction table)
-- =============================================
CREATE TABLE team_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'player' CHECK (role IN ('captain', 'player', 'substitute')),
    position VARCHAR(50) CHECK (position IN ('Carry', 'Support', 'Midlane', 'Offlane', 'Jungle', 'Flex')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    removed BOOLEAN DEFAULT FALSE,
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by UUID REFERENCES users(id),
    UNIQUE(team_id, player_id) -- Prevent duplicate players on same team
);

CREATE INDEX idx_team_players_team ON team_players(team_id);
CREATE INDEX idx_team_players_player ON team_players(player_id);
CREATE INDEX idx_team_players_role ON team_players(role);

-- =============================================
-- MATCHES TABLE
-- =============================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id VARCHAR(50) UNIQUE NOT NULL, -- Legacy compatibility
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team1_id UUID REFERENCES teams(id),
    team2_id UUID REFERENCES teams(id),
    round VARCHAR(100) NOT NULL,
    match_type VARCHAR(50) CHECK (match_type IN ('Group Stage', 'Quarter Final', 'Semi Final', 'Grand Final', 'Lower Bracket', 'Elimination')),
    match_number INTEGER,
    best_of INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed')),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES teams(id),
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    vod_link TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    started_by UUID REFERENCES users(id),
    reported_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (team1_id != team2_id) -- Teams can't play themselves
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_scheduled ON matches(scheduled_time);

-- =============================================
-- HEROES TABLE
-- =============================================
CREATE TABLE heroes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hero_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_heroes_name ON heroes(name);
CREATE INDEX idx_heroes_active ON heroes(is_active);

-- =============================================
-- DRAFT_SESSIONS TABLE
-- =============================================
CREATE TABLE draft_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id VARCHAR(50) UNIQUE NOT NULL, -- Legacy compatibility
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    team1_captain_id UUID REFERENCES users(id),
    team2_captain_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'In Progress', 'Completed', 'Stopped')),
    current_phase VARCHAR(50) CHECK (current_phase IN ('Coin Toss', 'Ban Phase', 'Pick Phase', 'Complete')),
    current_turn VARCHAR(50) CHECK (current_turn IN ('team1', 'team2')),
    coin_toss_winner VARCHAR(50) CHECK (coin_toss_winner IN ('team1', 'team2')),
    first_pick VARCHAR(50) CHECK (first_pick IN ('team1', 'team2')),
    pick_order JSONB,
    ban_order JSONB,
    team1_picks JSONB DEFAULT '[]',
    team2_picks JSONB DEFAULT '[]',
    team1_bans JSONB DEFAULT '[]',
    team2_bans JSONB DEFAULT '[]',
    spectator_link TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    stopped_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_draft_sessions_match ON draft_sessions(match_id);
CREATE INDEX idx_draft_sessions_status ON draft_sessions(status);

-- =============================================
-- DRAFT_ACTIONS TABLE (Audit log)
-- =============================================
CREATE TABLE draft_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('pick', 'ban', 'coin_toss')),
    team VARCHAR(50) NOT NULL CHECK (team IN ('team1', 'team2')),
    hero_id UUID REFERENCES heroes(id),
    action_order INTEGER NOT NULL,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_draft_actions_session ON draft_actions(draft_session_id);
CREATE INDEX idx_draft_actions_order ON draft_actions(action_order);

-- =============================================
-- VIEWS FOR EASIER QUERYING
-- =============================================

-- Team roster view with player details
CREATE VIEW team_rosters AS
SELECT 
    t.id as team_id,
    t.team_name,
    t.tournament_id,
    tp.role,
    u.id as player_id,
    u.discord_username,
    u.avatar_url,
    tp.position,
    tp.accepted
FROM teams t
JOIN team_players tp ON t.id = tp.team_id
JOIN users u ON tp.player_id = u.id
WHERE tp.removed = FALSE;

-- Match details view
CREATE VIEW match_details AS
SELECT 
    m.*,
    t1.team_name as team1_name,
    t2.team_name as team2_name,
    w.team_name as winner_name,
    tour.name as tournament_name
FROM matches m
JOIN teams t1 ON m.team1_id = t1.id
JOIN teams t2 ON m.team2_id = t2.id
LEFT JOIN teams w ON m.winner_id = w.id
JOIN tournaments tour ON m.tournament_id = tour.id;

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_heroes_updated_at BEFORE UPDATE ON heroes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_sessions_updated_at BEFORE UPDATE ON draft_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update tournament team count
CREATE OR REPLACE FUNCTION update_tournament_team_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tournaments 
        SET current_teams = current_teams + 1 
        WHERE id = NEW.tournament_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tournaments 
        SET current_teams = current_teams - 1 
        WHERE id = OLD.tournament_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_count AFTER INSERT OR DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_tournament_team_count();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default heroes (basic set, expand later)
INSERT INTO heroes (hero_id, name, role) VALUES
('hero_sparrow', 'Sparrow', 'Carry'),
('hero_murdock', 'Murdock', 'Carry'),
('hero_steel', 'Steel', 'Support'),
('hero_muriel', 'Muriel', 'Support'),
('hero_gadget', 'Gadget', 'Midlane'),
('hero_howitzer', 'Howitzer', 'Midlane'),
('hero_greystone', 'Greystone', 'Offlane'),
('hero_kwang', 'Kwang', 'Offlane'),
('hero_khaimera', 'Khaimera', 'Jungle'),
('hero_rampage', 'Rampage', 'Jungle');

-- =============================================
-- PERMISSIONS (Run as superuser)
-- =============================================
-- Grant permissions to application user (create this user first)
-- CREATE USER predecessor_app WITH PASSWORD 'your_app_password';
-- GRANT ALL PRIVILEGES ON DATABASE predecessor_tournaments TO predecessor_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO predecessor_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO predecessor_app;