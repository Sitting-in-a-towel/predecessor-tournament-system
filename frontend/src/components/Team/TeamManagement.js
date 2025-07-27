import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { airtableService } from '../../services/airtableService';
import { toast } from 'react-toastify';

const TeamManagement = ({ team, onTeamUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    playerName: '',
    role: 'player'
  });

  const [teamData, setTeamData] = useState(team);

  useEffect(() => {
    setTeamData(team);
  }, [team]);

  const isCaptain = user && teamData?.Captain?.includes(user.userID);

  const handleInvitePlayer = async (e) => {
    e.preventDefault();
    
    if (!inviteData.playerName.trim()) {
      toast.error('Please enter a player name');
      return;
    }

    setLoading(true);
    try {
      await airtableService.invitePlayer(teamData.TeamID, inviteData.playerName, inviteData.role);
      toast.success(`Invitation sent to ${inviteData.playerName}`);
      setInviteData({ playerName: '', role: 'player' });
      setShowInviteForm(false);
      
      if (onTeamUpdate) {
        onTeamUpdate();
      }
    } catch (error) {
      console.error('Error inviting player:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player from the team?')) {
      return;
    }

    setLoading(true);
    try {
      await airtableService.removePlayer(teamData.TeamID, playerId);
      toast.success('Player removed from team');
      
      if (onTeamUpdate) {
        onTeamUpdate();
      }
    } catch (error) {
      console.error('Error removing player:', error);
      toast.error('Failed to remove player');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTeam = async () => {
    const playerCount = teamData.Players?.length || 0;
    
    if (playerCount < 5) {
      toast.error('Team must have 5 players to be confirmed');
      return;
    }

    if (!window.confirm('Are you sure you want to confirm this team? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await airtableService.confirmTeam(teamData.TeamID);
      toast.success('Team confirmed successfully!');
      
      if (onTeamUpdate) {
        onTeamUpdate();
      }
    } catch (error) {
      console.error('Error confirming team:', error);
      toast.error('Failed to confirm team');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerCount = () => {
    return teamData.Players?.length || 0;
  };

  const getSubstituteCount = () => {
    return teamData.Substitutes?.length || 0;
  };

  if (!teamData) {
    return <div className="team-management loading">Loading team data...</div>;
  }

  return (
    <div className="team-management">
      <div className="team-header">
        <div className="team-title">
          {teamData.TeamLogo && (
            <img src={teamData.TeamLogo} alt="Team logo" className="team-logo" />
          )}
          <div>
            <h2>{teamData.TeamName}</h2>
            <div className="team-status">
              <span className={`status-badge ${teamData.Confirmed ? 'confirmed' : 'pending'}`}>
                {teamData.Confirmed ? 'Confirmed' : 'Pending Confirmation'}
              </span>
              {isCaptain && <span className="captain-badge">Captain</span>}
            </div>
          </div>
        </div>

        {isCaptain && !teamData.Confirmed && (
          <div className="team-actions">
            <button 
              className="btn-secondary"
              onClick={() => setShowInviteForm(true)}
              disabled={loading}
            >
              Invite Player
            </button>
            {getPlayerCount() >= 5 && (
              <button 
                className="btn-primary"
                onClick={handleConfirmTeam}
                disabled={loading}
              >
                Confirm Team
              </button>
            )}
          </div>
        )}
      </div>

      {/* Team Progress */}
      <div className="team-progress">
        <div className="progress-section">
          <h3>Team Progress</h3>
          <div className="progress-stats">
            <div className="stat-item">
              <label>Players</label>
              <span className={getPlayerCount() >= 5 ? 'complete' : 'incomplete'}>
                {getPlayerCount()}/5
              </span>
            </div>
            <div className="stat-item">
              <label>Substitutes</label>
              <span>{getSubstituteCount()}/3</span>
            </div>
            <div className="stat-item">
              <label>Status</label>
              <span className={teamData.Confirmed ? 'complete' : 'incomplete'}>
                {teamData.Confirmed ? 'Ready' : 'Needs Players'}
              </span>
            </div>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min((getPlayerCount() / 5) * 100, 100)}%` }}
            />
          </div>
          <small>{5 - getPlayerCount()} more players needed</small>
        </div>
      </div>

      {/* Players List */}
      <div className="players-section">
        <h3>Team Roster</h3>
        
        {teamData.Players && teamData.Players.length > 0 ? (
          <div className="players-list">
            {teamData.Players.map((player, index) => (
              <div key={player.UserID || index} className="player-card">
                <div className="player-info">
                  <h4>{player.DiscordUsername}</h4>
                  <span className="player-role">
                    {teamData.Captain?.includes(player.UserID) ? 'Captain' : 'Player'}
                  </span>
                </div>
                
                {isCaptain && !teamData.Captain?.includes(player.UserID) && !teamData.Confirmed && (
                  <button 
                    className="btn-danger-small"
                    onClick={() => handleRemovePlayer(player.UserID)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-players">
            <p>No players in the team yet.</p>
            {isCaptain && <p>Start by inviting players to join your team!</p>}
          </div>
        )}
      </div>

      {/* Substitutes List */}
      {teamData.Substitutes && teamData.Substitutes.length > 0 && (
        <div className="substitutes-section">
          <h3>Substitute Players</h3>
          <div className="players-list">
            {teamData.Substitutes.map((substitute, index) => (
              <div key={substitute.UserID || index} className="player-card substitute">
                <div className="player-info">
                  <h4>{substitute.DiscordUsername}</h4>
                  <span className="player-role">Substitute</span>
                </div>
                
                {isCaptain && !teamData.Confirmed && (
                  <button 
                    className="btn-danger-small"
                    onClick={() => handleRemovePlayer(substitute.UserID)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Requirements */}
      <div className="team-requirements">
        <h3>Team Requirements</h3>
        <div className="requirements-list">
          <div className={`requirement-item ${getPlayerCount() >= 5 ? 'met' : 'unmet'}`}>
            <span className="requirement-icon">{getPlayerCount() >= 5 ? '✅' : '❌'}</span>
            <span>5 confirmed players</span>
          </div>
          <div className={`requirement-item ${isCaptain ? 'met' : 'unmet'}`}>
            <span className="requirement-icon">{isCaptain ? '✅' : '❌'}</span>
            <span>Team captain assigned</span>
          </div>
          <div className={`requirement-item ${teamData.Confirmed ? 'met' : 'unmet'}`}>
            <span className="requirement-icon">{teamData.Confirmed ? '✅' : '❌'}</span>
            <span>Team confirmation completed</span>
          </div>
        </div>
      </div>

      {/* Invite Player Modal */}
      {showInviteForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Invite Player</h3>
              <button 
                className="modal-close"
                onClick={() => setShowInviteForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleInvitePlayer} className="modal-content">
              <div className="form-group">
                <label htmlFor="playerName">Player Discord Username</label>
                <input
                  type="text"
                  id="playerName"
                  value={inviteData.playerName}
                  onChange={(e) => setInviteData(prev => ({ ...prev, playerName: e.target.value }))}
                  placeholder="PlayerName#1234"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={inviteData.role}
                  onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="player">Main Player</option>
                  <option value="substitute">Substitute</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowInviteForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;