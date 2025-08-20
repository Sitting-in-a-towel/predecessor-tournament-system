-- Drop all tables in the correct order to handle foreign key constraints
DROP TABLE IF EXISTS draft_picks CASCADE;
DROP TABLE IF EXISTS draft_sessions CASCADE;
DROP TABLE IF EXISTS tournament_teams CASCADE;
DROP TABLE IF EXISTS tournament_registrations CASCADE;
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS bracket_matches CASCADE;
DROP TABLE IF EXISTS omeda_game_data CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS heroes CASCADE;

-- Drop any remaining sequences
DROP SEQUENCE IF EXISTS heroes_id_seq CASCADE;

-- Drop all functions first
DROP FUNCTION IF EXISTS update_tournament_team_count() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop any remaining types
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS bracket_type CASCADE;
DROP TYPE IF EXISTS tournament_status CASCADE;