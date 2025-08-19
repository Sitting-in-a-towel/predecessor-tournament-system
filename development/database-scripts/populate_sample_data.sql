-- Populate PostgreSQL tables with sample test data
-- This provides initial data for testing the tournament system

-- Insert sample user
INSERT INTO users (
    user_id, discord_id, discord_username, discord_discriminator, 
    email, avatar_url, is_admin, is_banned
) VALUES (
    'user_test_001', 
    '123456789012345678', 
    'TestAdmin', 
    '0001',
    'admin@predecessor-tournaments.com',
    'https://cdn.discordapp.com/avatars/123456789012345678/sample.png',
    true,
    false
);

-- Insert sample tournament
INSERT INTO tournaments (
    tournament_id, name, description, bracket_type, max_teams, 
    registration_start, registration_end, tournament_start, 
    status, is_public, created_by
) VALUES (
    'tournament_test_001',
    'Sample Championship Tournament',
    'A test tournament to showcase the system features',
    'Single Elimination',
    16,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    'Registration Open',
    true,
    (SELECT id FROM users WHERE user_id = 'user_test_001')
);

-- Insert sample team
INSERT INTO teams (
    team_id, name, description, logo_url, is_active, 
    created_by, tournament_id
) VALUES (
    'team_test_001',
    'Sample Esports Team',
    'A test team for demonstration purposes',
    '/assets/default-team-logo.png',
    true,
    (SELECT id FROM users WHERE user_id = 'user_test_001'),
    (SELECT id FROM tournaments WHERE tournament_id = 'tournament_test_001')
);

-- Insert sample team player (team captain)
INSERT INTO team_players (
    team_id, user_id, role, joined_at
) VALUES (
    (SELECT id FROM teams WHERE team_id = 'team_test_001'),
    (SELECT id FROM users WHERE user_id = 'user_test_001'),
    'Captain',
    CURRENT_TIMESTAMP
);

-- Insert sample match
INSERT INTO matches (
    match_id, tournament_id, round_name, match_number,
    team1_id, team2_id, status, scheduled_time
) VALUES (
    'match_test_001',
    (SELECT id FROM tournaments WHERE tournament_id = 'tournament_test_001'),
    'Round 1',
    1,
    (SELECT id FROM teams WHERE team_id = 'team_test_001'),
    NULL, -- No opponent yet
    'Scheduled',
    CURRENT_TIMESTAMP + INTERVAL '12 days'
);

-- Insert sample draft session
INSERT INTO draft_sessions (
    session_id, match_id, status, current_pick, 
    ban_phase_complete, pick_phase_complete
) VALUES (
    'draft_test_001',
    (SELECT id FROM matches WHERE match_id = 'match_test_001'),
    'Waiting',
    1,
    false,
    false
);

-- Heroes table already populated by schema with sample data

-- Show summary of inserted data
SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'tournaments' as table_name, COUNT(*) as records FROM tournaments  
UNION ALL
SELECT 'teams' as table_name, COUNT(*) as records FROM teams
UNION ALL
SELECT 'team_players' as table_name, COUNT(*) as records FROM team_players
UNION ALL
SELECT 'matches' as table_name, COUNT(*) as records FROM matches
UNION ALL
SELECT 'draft_sessions' as table_name, COUNT(*) as records FROM draft_sessions
UNION ALL
SELECT 'heroes' as table_name, COUNT(*) as records FROM heroes
ORDER BY table_name;