-- Team Invitations Table
-- Stores pending invitations to join teams

CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Who is being invited (flexible lookup)
    invited_discord_username VARCHAR(255),
    invited_discord_email VARCHAR(255),
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Set when user is found
    
    -- Invitation details
    role VARCHAR(50) NOT NULL DEFAULT 'Player',
    message TEXT, -- Optional personal message from inviter
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate invitations
    UNIQUE(team_id, invited_discord_username),
    UNIQUE(team_id, invited_discord_email),
    UNIQUE(team_id, invited_user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invited_user_id ON team_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Comments
COMMENT ON TABLE team_invitations IS 'Stores team invitations sent to players';
COMMENT ON COLUMN team_invitations.invited_discord_username IS 'Discord username of invited player (e.g., sitting_in_a_towel)';
COMMENT ON COLUMN team_invitations.invited_discord_email IS 'Email address linked to Discord account';
COMMENT ON COLUMN team_invitations.invited_user_id IS 'Set when invited player is found in our database';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expires after 7 days by default';