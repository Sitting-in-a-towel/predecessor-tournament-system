-- SQL script to add 10 test teams to production database
-- Run this in your production database console

-- First, create test users
INSERT INTO users (id, discord_id, discord_username, created_at, updated_at) VALUES
('test_user_prod_1', 'test_discord_prod_1', 'AlphaLeader', NOW(), NOW()),
('test_user_prod_2', 'test_discord_prod_2', 'BetaCommander', NOW(), NOW()),
('test_user_prod_3', 'test_discord_prod_3', 'GammaGuard', NOW(), NOW()),
('test_user_prod_4', 'test_discord_prod_4', 'DeltaDrake', NOW(), NOW()),
('test_user_prod_5', 'test_discord_prod_5', 'EchoEagle', NOW(), NOW()),
('test_user_prod_6', 'test_discord_prod_6', 'FoxtrotFlame', NOW(), NOW()),
('test_user_prod_7', 'test_discord_prod_7', 'GolfGladiator', NOW(), NOW()),
('test_user_prod_8', 'test_discord_prod_8', 'HotelHurricane', NOW(), NOW()),
('test_user_prod_9', 'test_discord_prod_9', 'IndiaInvader', NOW(), NOW()),
('test_user_prod_10', 'test_discord_prod_10', 'JulietJuggernaut', NOW(), NOW())
ON CONFLICT (discord_id) DO NOTHING;

-- Create teams
INSERT INTO teams (team_id, team_name, captain_user_id, created_at, updated_at, is_active) VALUES
('team_test_prod_1', 'Alpha Wolves', 'test_user_prod_1', NOW(), NOW(), true),
('team_test_prod_2', 'Beta Brigade', 'test_user_prod_2', NOW(), NOW(), true),
('team_test_prod_3', 'Gamma Guardians', 'test_user_prod_3', NOW(), NOW(), true),
('team_test_prod_4', 'Delta Dragons', 'test_user_prod_4', NOW(), NOW(), true),
('team_test_prod_5', 'Echo Eagles', 'test_user_prod_5', NOW(), NOW(), true),
('team_test_prod_6', 'Foxtrot Phoenixes', 'test_user_prod_6', NOW(), NOW(), true),
('team_test_prod_7', 'Golf Gladiators', 'test_user_prod_7', NOW(), NOW(), true),
('team_test_prod_8', 'Hotel Hurricanes', 'test_user_prod_8', NOW(), NOW(), true),
('team_test_prod_9', 'India Invaders', 'test_user_prod_9', NOW(), NOW(), true),
('team_test_prod_10', 'Juliet Juggernauts', 'test_user_prod_10', NOW(), NOW(), true)
ON CONFLICT (team_name) DO NOTHING;

-- Add captains as team members
INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES
(gen_random_uuid(), 'team_test_prod_1', 'test_user_prod_1', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_2', 'test_user_prod_2', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_3', 'test_user_prod_3', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_4', 'test_user_prod_4', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_5', 'test_user_prod_5', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_6', 'test_user_prod_6', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_7', 'test_user_prod_7', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_8', 'test_user_prod_8', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_9', 'test_user_prod_9', 'captain', NOW()),
(gen_random_uuid(), 'team_test_prod_10', 'test_user_prod_10', 'captain', NOW())
ON CONFLICT DO NOTHING;

-- Verify teams were created
SELECT t.team_name, u.discord_username as captain_name, t.created_at 
FROM teams t 
JOIN users u ON t.captain_user_id = u.id 
WHERE t.team_name LIKE '%Wolves%' 
   OR t.team_name LIKE '%Brigade%'
   OR t.team_name LIKE '%Guardians%'
   OR t.team_name LIKE '%Dragons%'
   OR t.team_name LIKE '%Eagles%'
   OR t.team_name LIKE '%Phoenixes%'
   OR t.team_name LIKE '%Gladiators%'
   OR t.team_name LIKE '%Hurricanes%'
   OR t.team_name LIKE '%Invaders%'
   OR t.team_name LIKE '%Juggernauts%'
ORDER BY t.created_at DESC;