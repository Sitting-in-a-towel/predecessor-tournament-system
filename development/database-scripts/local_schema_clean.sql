--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_tournament_team_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_tournament_team_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bracket_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bracket_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    bracket_id uuid NOT NULL,
    match_identifier character varying(100) NOT NULL,
    round_number integer NOT NULL,
    match_number integer NOT NULL,
    team1_id uuid,
    team2_id uuid,
    winner_id uuid,
    team1_score integer DEFAULT 0,
    team2_score integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    scheduled_time timestamp with time zone,
    completed_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: draft_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    draft_session_id uuid,
    action_type character varying(50) NOT NULL,
    team character varying(50) NOT NULL,
    hero_id uuid,
    action_order integer NOT NULL,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT draft_actions_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['pick'::character varying, 'ban'::character varying, 'coin_toss'::character varying])::text[]))),
    CONSTRAINT draft_actions_team_check CHECK (((team)::text = ANY ((ARRAY['team1'::character varying, 'team2'::character varying])::text[])))
);


--
-- Name: draft_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    user_id uuid,
    team_number integer NOT NULL,
    is_present boolean DEFAULT false,
    joined_at timestamp with time zone DEFAULT now(),
    last_active timestamp with time zone DEFAULT now(),
    socket_id character varying(255) DEFAULT NULL::character varying,
    CONSTRAINT draft_participants_team_number_check CHECK ((team_number = ANY (ARRAY[1, 2])))
);


--
-- Name: draft_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    draft_id character varying(50) NOT NULL,
    match_id uuid,
    team1_captain_id character varying(255),
    team2_captain_id character varying(255),
    status character varying(50) DEFAULT 'Waiting'::character varying,
    current_phase character varying(50),
    current_turn character varying(50),
    coin_toss_winner character varying(50),
    first_pick character varying(50),
    pick_order jsonb,
    ban_order jsonb,
    team1_picks jsonb DEFAULT '[]'::jsonb,
    team2_picks jsonb DEFAULT '[]'::jsonb,
    team1_bans jsonb DEFAULT '[]'::jsonb,
    team2_bans jsonb DEFAULT '[]'::jsonb,
    spectator_link text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    start_time timestamp with time zone,
    completed_at timestamp with time zone,
    stopped_at timestamp with time zone,
    stopped_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    team1_id uuid,
    team2_id uuid,
    team1_connected boolean DEFAULT false,
    team2_connected boolean DEFAULT false,
    team1_coin_choice character varying(10),
    team2_coin_choice character varying(10),
    coin_toss_result character varying(10),
    both_teams_connected_at timestamp without time zone,
    coin_choices_enabled_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    tournament_id text,
    first_pick_team text,
    coin_toss_started_at timestamp with time zone,
    coin_toss_completed_at timestamp with time zone,
    draft_started_at timestamp with time zone,
    draft_completed_at timestamp with time zone,
    current_timer_started_at timestamp(0) without time zone,
    current_timer_duration integer DEFAULT 20,
    current_timer_extra_time integer DEFAULT 0,
    timer_expired boolean DEFAULT false,
    timer_config jsonb DEFAULT '{"enabled": true, "ban_time": 30, "base_time": 30, "pick_time": 30, "extra_time": 10}'::jsonb,
    pick_order_chosen boolean DEFAULT false NOT NULL,
    CONSTRAINT draft_sessions_coin_toss_winner_check CHECK (((coin_toss_winner)::text = ANY ((ARRAY['team1'::character varying, 'team2'::character varying])::text[]))),
    CONSTRAINT draft_sessions_current_phase_check CHECK (((current_phase)::text = ANY ((ARRAY['Coin Toss'::character varying, 'Pick Order Selection'::character varying, 'Ban Phase'::character varying, 'Pick Phase'::character varying, 'Complete'::character varying])::text[]))),
    CONSTRAINT draft_sessions_current_turn_check CHECK (((current_turn)::text = ANY ((ARRAY['team1'::character varying, 'team2'::character varying])::text[]))),
    CONSTRAINT draft_sessions_first_pick_check CHECK (((first_pick)::text = ANY ((ARRAY['team1'::character varying, 'team2'::character varying])::text[]))),
    CONSTRAINT draft_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['Waiting'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Stopped'::character varying])::text[])))
);


--
-- Name: COLUMN draft_sessions.coin_toss_winner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.coin_toss_winner IS 'Which team won: team1 or team2';


--
-- Name: COLUMN draft_sessions.team1_picks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team1_picks IS 'Array of hero IDs picked by team 1';


--
-- Name: COLUMN draft_sessions.team2_picks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team2_picks IS 'Array of hero IDs picked by team 2';


--
-- Name: COLUMN draft_sessions.team1_bans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team1_bans IS 'Array of hero IDs banned by team 1';


--
-- Name: COLUMN draft_sessions.team2_bans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team2_bans IS 'Array of hero IDs banned by team 2';


--
-- Name: COLUMN draft_sessions.team1_connected; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team1_connected IS 'Is team 1 captain connected';


--
-- Name: COLUMN draft_sessions.team2_connected; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team2_connected IS 'Is team 2 captain connected';


--
-- Name: COLUMN draft_sessions.team1_coin_choice; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team1_coin_choice IS 'Team 1 coin choice: heads or tails';


--
-- Name: COLUMN draft_sessions.team2_coin_choice; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.team2_coin_choice IS 'Team 2 coin choice: heads or tails';


--
-- Name: COLUMN draft_sessions.coin_toss_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.coin_toss_result IS 'Actual coin toss result: heads or tails';


--
-- Name: COLUMN draft_sessions.coin_toss_started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.coin_toss_started_at IS 'When coin toss phase began';


--
-- Name: COLUMN draft_sessions.coin_toss_completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.coin_toss_completed_at IS 'When coin toss was completed';


--
-- Name: COLUMN draft_sessions.draft_started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.draft_started_at IS 'When hero selection phase began';


--
-- Name: COLUMN draft_sessions.draft_completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.draft_sessions.draft_completed_at IS 'When draft was completed';


--
-- Name: draft_spectators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_spectators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: heroes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.heroes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    hero_id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(50),
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_id character varying(50) NOT NULL,
    tournament_id uuid,
    team1_id uuid,
    team2_id uuid,
    round character varying(100) NOT NULL,
    match_type character varying(50),
    match_number integer,
    best_of integer DEFAULT 1,
    status character varying(50) DEFAULT 'Scheduled'::character varying,
    scheduled_time timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    winner_id uuid,
    team1_score integer DEFAULT 0,
    team2_score integer DEFAULT 0,
    vod_link text,
    notes text,
    created_by uuid,
    started_by uuid,
    reported_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT matches_check CHECK ((team1_id <> team2_id)),
    CONSTRAINT matches_match_type_check CHECK (((match_type)::text = ANY ((ARRAY['Group Stage'::character varying, 'Quarter Final'::character varying, 'Semi Final'::character varying, 'Grand Final'::character varying, 'Lower Bracket'::character varying, 'Elimination'::character varying])::text[]))),
    CONSTRAINT matches_status_check CHECK (((status)::text = ANY ((ARRAY['Scheduled'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Cancelled'::character varying, 'Postponed'::character varying])::text[])))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id character varying(50) NOT NULL,
    team_name character varying(100) NOT NULL,
    team_tag character varying(10),
    team_logo text,
    tournament_id uuid,
    captain_id uuid,
    confirmed boolean DEFAULT false,
    confirmed_at timestamp with time zone,
    checked_in boolean DEFAULT false,
    check_in_time timestamp with time zone,
    seed integer,
    placement integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tournament_id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    bracket_type character varying(50) NOT NULL,
    game_format character varying(50) NOT NULL,
    quarter_final_format character varying(50),
    semi_final_format character varying(50),
    grand_final_format character varying(50),
    max_teams integer NOT NULL,
    current_teams integer DEFAULT 0,
    registration_open boolean DEFAULT true,
    check_in_enabled boolean DEFAULT false,
    status character varying(50) DEFAULT 'Upcoming'::character varying,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    check_in_start timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tournaments_bracket_type_check CHECK (((bracket_type)::text = ANY ((ARRAY['Single Elimination'::character varying, 'Double Elimination'::character varying, 'Round Robin'::character varying, 'Swiss'::character varying])::text[]))),
    CONSTRAINT tournaments_game_format_check CHECK (((game_format)::text = ANY ((ARRAY['Best of 1'::character varying, 'Best of 3'::character varying, 'Best of 5'::character varying])::text[]))),
    CONSTRAINT tournaments_grand_final_format_check CHECK (((grand_final_format)::text = ANY ((ARRAY['Best of 1'::character varying, 'Best of 3'::character varying, 'Best of 5'::character varying])::text[]))),
    CONSTRAINT tournaments_max_teams_check CHECK (((max_teams >= 2) AND (max_teams <= 256))),
    CONSTRAINT tournaments_quarter_final_format_check CHECK (((quarter_final_format)::text = ANY ((ARRAY['Best of 1'::character varying, 'Best of 3'::character varying, 'Best of 5'::character varying])::text[]))),
    CONSTRAINT tournaments_semi_final_format_check CHECK (((semi_final_format)::text = ANY ((ARRAY['Best of 1'::character varying, 'Best of 3'::character varying, 'Best of 5'::character varying])::text[]))),
    CONSTRAINT tournaments_status_check CHECK (((status)::text = ANY ((ARRAY['Upcoming'::character varying, 'Registration'::character varying, 'Check-In'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Cancelled'::character varying])::text[])))
);


--
-- Name: match_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.match_details AS
 SELECT m.id,
    m.match_id,
    m.tournament_id,
    m.team1_id,
    m.team2_id,
    m.round,
    m.match_type,
    m.match_number,
    m.best_of,
    m.status,
    m.scheduled_time,
    m.started_at,
    m.completed_at,
    m.winner_id,
    m.team1_score,
    m.team2_score,
    m.vod_link,
    m.notes,
    m.created_by,
    m.started_by,
    m.reported_by,
    m.created_at,
    m.updated_at,
    t1.team_name AS team1_name,
    t2.team_name AS team2_name,
    w.team_name AS winner_name,
    tour.name AS tournament_name
   FROM ((((public.matches m
     JOIN public.teams t1 ON ((m.team1_id = t1.id)))
     JOIN public.teams t2 ON ((m.team2_id = t2.id)))
     LEFT JOIN public.teams w ON ((m.winner_id = w.id)))
     JOIN public.tournaments tour ON ((m.tournament_id = tour.id)));


--
-- Name: omeda_game_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.omeda_game_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    omeda_match_id character varying(255) NOT NULL,
    match_data jsonb NOT NULL,
    match_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: team_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    inviter_id uuid NOT NULL,
    invited_discord_username character varying(255),
    invited_discord_email character varying(255),
    invited_user_id uuid,
    role character varying(50) DEFAULT 'Player'::character varying NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval),
    responded_at timestamp with time zone,
    CONSTRAINT team_invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: TABLE team_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_invitations IS 'Stores team invitations sent to players';


--
-- Name: COLUMN team_invitations.invited_discord_username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.team_invitations.invited_discord_username IS 'Discord username of invited player (e.g., sitting_in_a_towel)';


--
-- Name: COLUMN team_invitations.invited_discord_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.team_invitations.invited_discord_email IS 'Email address linked to Discord account';


--
-- Name: COLUMN team_invitations.invited_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.team_invitations.invited_user_id IS 'Set when invited player is found in our database';


--
-- Name: COLUMN team_invitations.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.team_invitations.expires_at IS 'Invitation expires after 7 days by default';


--
-- Name: team_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid,
    player_id uuid,
    role character varying(50) DEFAULT 'player'::character varying,
    "position" character varying(50),
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted boolean DEFAULT false,
    accepted_at timestamp with time zone,
    removed boolean DEFAULT false,
    removed_at timestamp with time zone,
    removed_by uuid,
    CONSTRAINT team_players_position_check CHECK ((("position")::text = ANY ((ARRAY['Carry'::character varying, 'Support'::character varying, 'Midlane'::character varying, 'Offlane'::character varying, 'Jungle'::character varying, 'Flex'::character varying])::text[]))),
    CONSTRAINT team_players_role_check CHECK (((role)::text = ANY ((ARRAY['captain'::character varying, 'player'::character varying, 'substitute'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id character varying(50) NOT NULL,
    discord_id character varying(50) NOT NULL,
    discord_username character varying(100) NOT NULL,
    discord_discriminator character varying(10),
    email character varying(255),
    avatar_url text,
    is_admin boolean DEFAULT false,
    is_banned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_active timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    omeda_player_id character varying(255),
    omeda_profile_data jsonb,
    omeda_last_sync timestamp with time zone,
    omeda_sync_enabled boolean DEFAULT false
);


--
-- Name: team_rosters; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.team_rosters AS
 SELECT t.id AS team_id,
    t.team_name,
    t.tournament_id,
    tp.role,
    u.id AS player_id,
    u.discord_username,
    u.avatar_url,
    tp."position",
    tp.accepted
   FROM ((public.teams t
     JOIN public.team_players tp ON ((t.id = tp.team_id)))
     JOIN public.users u ON ((tp.player_id = u.id)))
  WHERE (tp.removed = false);


--
-- Name: tournament_brackets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_brackets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    bracket_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    locked_slots jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_published boolean DEFAULT false,
    seeding_mode character varying(20) DEFAULT 'random'::character varying,
    series_length integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: tournament_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    team_id uuid NOT NULL,
    registered_by uuid NOT NULL,
    registration_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'registered'::character varying,
    checked_in boolean DEFAULT false,
    check_in_time timestamp with time zone
);


--
-- Name: TABLE tournament_registrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tournament_registrations IS 'Stores team registrations for tournaments';


--
-- Name: COLUMN tournament_registrations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tournament_registrations.status IS 'Registration status: registered, confirmed, disqualified';


--
-- Name: COLUMN tournament_registrations.checked_in; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tournament_registrations.checked_in IS 'Whether team has checked in for tournament';


--
-- Name: bracket_matches bracket_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_pkey PRIMARY KEY (id);


--
-- Name: bracket_matches bracket_matches_tournament_id_match_identifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_tournament_id_match_identifier_key UNIQUE (tournament_id, match_identifier);


--
-- Name: draft_actions draft_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_actions
    ADD CONSTRAINT draft_actions_pkey PRIMARY KEY (id);


--
-- Name: draft_participants draft_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_participants
    ADD CONSTRAINT draft_participants_pkey PRIMARY KEY (id);


--
-- Name: draft_participants draft_participants_session_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_participants
    ADD CONSTRAINT draft_participants_session_id_user_id_key UNIQUE (session_id, user_id);


--
-- Name: draft_sessions draft_sessions_draft_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_draft_id_key UNIQUE (draft_id);


--
-- Name: draft_sessions draft_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_pkey PRIMARY KEY (id);


--
-- Name: draft_spectators draft_spectators_draft_session_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_spectators
    ADD CONSTRAINT draft_spectators_draft_session_id_user_id_key UNIQUE (draft_session_id, user_id);


--
-- Name: draft_spectators draft_spectators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_spectators
    ADD CONSTRAINT draft_spectators_pkey PRIMARY KEY (id);


--
-- Name: heroes heroes_hero_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heroes
    ADD CONSTRAINT heroes_hero_id_key UNIQUE (hero_id);


--
-- Name: heroes heroes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heroes
    ADD CONSTRAINT heroes_pkey PRIMARY KEY (id);


--
-- Name: matches matches_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_match_id_key UNIQUE (match_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: omeda_game_data omeda_game_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omeda_game_data
    ADD CONSTRAINT omeda_game_data_pkey PRIMARY KEY (id);


--
-- Name: omeda_game_data omeda_game_data_user_id_omeda_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omeda_game_data
    ADD CONSTRAINT omeda_game_data_user_id_omeda_match_id_key UNIQUE (user_id, omeda_match_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: team_invitations team_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_pkey PRIMARY KEY (id);


--
-- Name: team_invitations team_invitations_team_id_invited_discord_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_team_id_invited_discord_email_key UNIQUE (team_id, invited_discord_email);


--
-- Name: team_invitations team_invitations_team_id_invited_discord_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_team_id_invited_discord_username_key UNIQUE (team_id, invited_discord_username);


--
-- Name: team_invitations team_invitations_team_id_invited_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_team_id_invited_user_id_key UNIQUE (team_id, invited_user_id);


--
-- Name: team_players team_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_pkey PRIMARY KEY (id);


--
-- Name: team_players team_players_team_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_player_id_key UNIQUE (team_id, player_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_team_id_key UNIQUE (team_id);


--
-- Name: teams teams_team_name_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_team_name_tournament_id_key UNIQUE (team_name, tournament_id);


--
-- Name: tournament_brackets tournament_brackets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_brackets
    ADD CONSTRAINT tournament_brackets_pkey PRIMARY KEY (id);


--
-- Name: tournament_brackets tournament_brackets_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_brackets
    ADD CONSTRAINT tournament_brackets_tournament_id_key UNIQUE (tournament_id);


--
-- Name: tournament_registrations tournament_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_pkey PRIMARY KEY (id);


--
-- Name: tournament_registrations tournament_registrations_tournament_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_team_id_key UNIQUE (tournament_id, team_id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: tournaments tournaments_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_tournament_id_key UNIQUE (tournament_id);


--
-- Name: users users_discord_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_discord_id_key UNIQUE (discord_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_id_key UNIQUE (user_id);


--
-- Name: idx_bracket_matches_bracket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bracket_matches_bracket ON public.bracket_matches USING btree (bracket_id);


--
-- Name: idx_bracket_matches_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bracket_matches_tournament ON public.bracket_matches USING btree (tournament_id);


--
-- Name: idx_draft_actions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_actions_order ON public.draft_actions USING btree (action_order);


--
-- Name: idx_draft_actions_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_actions_session ON public.draft_actions USING btree (draft_session_id);


--
-- Name: idx_draft_sessions_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_sessions_match ON public.draft_sessions USING btree (match_id);


--
-- Name: idx_draft_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_sessions_status ON public.draft_sessions USING btree (status);


--
-- Name: idx_draft_spectators_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_spectators_session ON public.draft_spectators USING btree (draft_session_id);


--
-- Name: idx_draft_spectators_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_spectators_user ON public.draft_spectators USING btree (user_id);


--
-- Name: idx_heroes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_heroes_active ON public.heroes USING btree (is_active);


--
-- Name: idx_heroes_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_heroes_name ON public.heroes USING btree (name);


--
-- Name: idx_heroes_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_heroes_role ON public.heroes USING btree (role);


--
-- Name: idx_matches_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_scheduled ON public.matches USING btree (scheduled_time);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_matches_team1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_team1 ON public.matches USING btree (team1_id);


--
-- Name: idx_matches_team2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_team2 ON public.matches USING btree (team2_id);


--
-- Name: idx_matches_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_tournament ON public.matches USING btree (tournament_id);


--
-- Name: idx_omeda_game_data_match_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_omeda_game_data_match_date ON public.omeda_game_data USING btree (match_date DESC);


--
-- Name: idx_omeda_game_data_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_omeda_game_data_user_id ON public.omeda_game_data USING btree (user_id);


--
-- Name: idx_team_invitations_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invitations_expires_at ON public.team_invitations USING btree (expires_at);


--
-- Name: idx_team_invitations_invited_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invitations_invited_user_id ON public.team_invitations USING btree (invited_user_id);


--
-- Name: idx_team_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invitations_status ON public.team_invitations USING btree (status);


--
-- Name: idx_team_invitations_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invitations_team_id ON public.team_invitations USING btree (team_id);


--
-- Name: idx_team_players_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_players_player ON public.team_players USING btree (player_id);


--
-- Name: idx_team_players_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_players_role ON public.team_players USING btree (role);


--
-- Name: idx_team_players_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_players_team ON public.team_players USING btree (team_id);


--
-- Name: idx_teams_captain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_captain ON public.teams USING btree (captain_id);


--
-- Name: idx_teams_checked_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_checked_in ON public.teams USING btree (checked_in);


--
-- Name: idx_teams_confirmed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_confirmed ON public.teams USING btree (confirmed);


--
-- Name: idx_teams_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_tournament ON public.teams USING btree (tournament_id);


--
-- Name: idx_tournament_brackets_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_brackets_tournament ON public.tournament_brackets USING btree (tournament_id);


--
-- Name: idx_tournament_registrations_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_registrations_team ON public.tournament_registrations USING btree (team_id);


--
-- Name: idx_tournament_registrations_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_registrations_tournament ON public.tournament_registrations USING btree (tournament_id);


--
-- Name: idx_tournaments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_created_by ON public.tournaments USING btree (created_by);


--
-- Name: idx_tournaments_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_start_date ON public.tournaments USING btree (start_date);


--
-- Name: idx_tournaments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_status ON public.tournaments USING btree (status);


--
-- Name: idx_users_discord_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_discord_id ON public.users USING btree (discord_id);


--
-- Name: idx_users_discord_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_discord_username ON public.users USING btree (discord_username);


--
-- Name: idx_users_omeda_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_omeda_player_id ON public.users USING btree (omeda_player_id);


--
-- Name: idx_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_user_id ON public.users USING btree (user_id);


--
-- Name: bracket_matches update_bracket_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bracket_matches_updated_at BEFORE UPDATE ON public.bracket_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: draft_sessions update_draft_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_draft_sessions_updated_at BEFORE UPDATE ON public.draft_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: heroes update_heroes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_heroes_updated_at BEFORE UPDATE ON public.heroes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: matches update_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_team_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_count AFTER INSERT OR DELETE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_tournament_team_count();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournament_brackets update_tournament_brackets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tournament_brackets_updated_at BEFORE UPDATE ON public.tournament_brackets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournaments update_tournaments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bracket_matches bracket_matches_bracket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_bracket_id_fkey FOREIGN KEY (bracket_id) REFERENCES public.tournament_brackets(id) ON DELETE CASCADE;


--
-- Name: bracket_matches bracket_matches_team1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id);


--
-- Name: bracket_matches bracket_matches_team2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id);


--
-- Name: bracket_matches bracket_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: bracket_matches bracket_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bracket_matches
    ADD CONSTRAINT bracket_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);


--
-- Name: draft_actions draft_actions_draft_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_actions
    ADD CONSTRAINT draft_actions_draft_session_id_fkey FOREIGN KEY (draft_session_id) REFERENCES public.draft_sessions(id) ON DELETE CASCADE;


--
-- Name: draft_actions draft_actions_hero_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_actions
    ADD CONSTRAINT draft_actions_hero_id_fkey FOREIGN KEY (hero_id) REFERENCES public.heroes(id);


--
-- Name: draft_actions draft_actions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_actions
    ADD CONSTRAINT draft_actions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: draft_participants draft_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_participants
    ADD CONSTRAINT draft_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.draft_sessions(id) ON DELETE CASCADE;


--
-- Name: draft_participants draft_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_participants
    ADD CONSTRAINT draft_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: draft_sessions draft_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: draft_sessions draft_sessions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: draft_sessions draft_sessions_stopped_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_sessions
    ADD CONSTRAINT draft_sessions_stopped_by_fkey FOREIGN KEY (stopped_by) REFERENCES public.users(id);


--
-- Name: draft_spectators draft_spectators_draft_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_spectators
    ADD CONSTRAINT draft_spectators_draft_session_id_fkey FOREIGN KEY (draft_session_id) REFERENCES public.draft_sessions(id) ON DELETE CASCADE;


--
-- Name: draft_spectators draft_spectators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_spectators
    ADD CONSTRAINT draft_spectators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: matches matches_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- Name: matches matches_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(id);


--
-- Name: matches matches_team1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id);


--
-- Name: matches matches_team2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id);


--
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: matches matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id);


--
-- Name: omeda_game_data omeda_game_data_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.omeda_game_data
    ADD CONSTRAINT omeda_game_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_invitations team_invitations_invited_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_invitations team_invitations_inviter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_invitations team_invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_players team_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id);


--
-- Name: team_players team_players_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id);


--
-- Name: team_players team_players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_players
    ADD CONSTRAINT team_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: teams teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.users(id);


--
-- Name: teams teams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_brackets tournament_brackets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_brackets
    ADD CONSTRAINT tournament_brackets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tournament_brackets tournament_brackets_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_brackets
    ADD CONSTRAINT tournament_brackets_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id);


--
-- Name: tournament_registrations tournament_registrations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

