import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

  const isCaptain = true; // Placeholder - assume user is captain since they're viewing their team

  const handleInvitePlayer = async (e) => {
    e.preventDefault();
    
    if (!inviteData.playerName.trim()) {
      toast.error('Please enter a player name');
      return;
    }

    setLoading(true);
    try {
      // For now, show message that this feature is coming soon
      toast.info('Player invitation system will be available when backend endpoints are implemented');
      setInviteData({ playerName: '', role: 'player' });
      setShowInviteForm(false);
      
      // Simulate successful invitation for now
      // await axios.post(`${API_BASE_URL}/teams/${teamData.team_id}/invite`, {
      //   playerID: inviteData.playerName,
      //   role: inviteData.role
      // }, { withCredentials: true });
      
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
      toast.info('Player removal will be available when backend endpoints are implemented');
      
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
    if (!window.confirm('Are you sure you want to confirm this team? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      toast.info('Team confirmation will be available when full player management is implemented');
      
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
    // For now, return 1 since captain is automatically added
    return 1;
  };

  const getSubstituteCount = () => {
    // Placeholder until we have substitute tracking
    return 0;
  };

  if (!teamData) {
    return <div className="team-management loading">Loading team data...</div>;
  }

  return (
    <div className="team-management">
      <div className="team-header">
        <div className="team-title">
          {teamData.team_logo && (
            <img src={teamData.team_logo} alt="Team logo" className="team-logo" />
          )}
          <div>
            <h2>{teamData.team_name}</h2>
            <div className="team-status">
              <span className={`status-badge ${teamData.confirmed ? 'confirmed' : 'pending'}`}>
                {teamData.confirmed ? 'Confirmed' : 'Pending Confirmation'}
              </span>
              {isCaptain && <span className="captain-badge">Captain</span>}
            </div>
          </div>
        </div>

        {isCaptain && (
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
              <span className={teamData.confirmed ? 'complete' : 'incomplete'}>
                {teamData.confirmed ? 'Ready' : 'Needs Players'}
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
        
        <div className="players-list">
          <div className="player-card">
            <div className="player-info">
              <h4>{user?.discordUsername}</h4>
              <span className="player-role">Captain</span>
            </div>
          </div>
        </div>
        
        <div className="empty-players">
          <p>Player management system coming soon!</p>
          <p>You can invite players and manage roles once the backend endpoints are implemented.</p>
        </div>
      </div>

      {/* Substitutes List - Coming soon */}
      <div className="substitutes-section">
        <h3>Substitute Players</h3>
        <div className="empty-players">
          <p>No substitutes added yet.</p>
          <p>Substitute management will be available when player invitation system is implemented.</p>
        </div>
      </div>

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
          <div className={`requirement-item ${teamData.confirmed ? 'met' : 'unmet'}`}>
            <span className="requirement-icon">{teamData.confirmed ? '✅' : '❌'}</span>
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