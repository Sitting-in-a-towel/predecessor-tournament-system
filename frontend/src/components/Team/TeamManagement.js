import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const TeamManagement = ({ team, onTeamUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    discordUsername: '',
    discordEmail: '',
    role: 'Player',
    message: ''
  });

  const [teamData, setTeamData] = useState(team);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  useEffect(() => {
    setTeamData(team);
  }, [team]);

  useEffect(() => {
    if (teamData?.team_id) {
      loadInvitations();
    }
  }, [teamData?.team_id]);

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      console.log('Loading invitations for team:', teamData.team_id);
      
      // Load sent invitations
      const sentResponse = await axios.get(`${API_BASE_URL}/invitations/team/${teamData.team_id}`, { 
        withCredentials: true 
      });
      console.log('Sent invitations:', sentResponse.data);
      setSentInvitations(sentResponse.data || []);

      // Load received invitations
      const receivedResponse = await axios.get(`${API_BASE_URL}/invitations/my-invitations`, { 
        withCredentials: true 
      });
      console.log('Received invitations:', receivedResponse.data);
      setReceivedInvitations(receivedResponse.data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const isCaptain = true; // Placeholder - assume user is captain since they're viewing their team

  const handleInvitePlayer = async (e) => {
    e.preventDefault();
    
    if (!inviteData.discordUsername.trim() && !inviteData.discordEmail.trim()) {
      toast.error('Please enter either a Discord username or email address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/teams/${teamData.team_id}/invite`, {
        discordUsername: inviteData.discordUsername || undefined,
        discordEmail: inviteData.discordEmail || undefined,
        role: inviteData.role,
        message: inviteData.message || undefined
      }, { withCredentials: true });
      
      toast.success(`Invitation sent successfully! ${response.data.invitation.invited_username || response.data.invitation.invited_email} will see the invitation when they log in.`);
      setInviteData({ discordUsername: '', discordEmail: '', role: 'Player', message: '' });
      setShowInviteForm(false);
      
      // Reload invitations
      loadInvitations();
      
      if (onTeamUpdate) {
        onTeamUpdate();
      }
    } catch (error) {
      console.error('Error inviting player:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send invitation';
      toast.error(errorMessage);
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

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/invitations/${invitationId}`, { 
        withCredentials: true 
      });
      toast.success('Invitation cancelled successfully');
      loadInvitations(); // Reload to update the list
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
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

      {/* Team Invitations Section - Split View */}
      <div className="team-invitations-section" style={{ marginTop: '30px' }}>
        <h3>Team Invitations (v2 - Split View)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
          {/* Sent Invitations */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #333', 
            borderRadius: '8px' 
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#fff' }}>Invitations Sent</h4>
            {loadingInvitations ? (
              <p style={{ color: '#999' }}>Loading...</p>
            ) : sentInvitations.filter(inv => inv.status === 'pending').length === 0 ? (
              <p style={{ color: '#999' }}>No pending invitations sent</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sentInvitations.filter(inv => inv.status === 'pending').map(invitation => (
                  <div key={invitation.id} style={{
                    padding: '10px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px'
                  }}>
                    <p style={{ margin: '0 0 5px 0', color: '#fff' }}>
                      <strong>{invitation.invited_discord_username || invitation.invited_discord_email}</strong>
                    </p>
                    <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '14px' }}>
                      Role: {invitation.role}
                    </p>
                    <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Received Invitations */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #333', 
            borderRadius: '8px' 
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#fff' }}>Your Invitations</h4>
            {loadingInvitations ? (
              <p style={{ color: '#999' }}>Loading...</p>
            ) : receivedInvitations.length === 0 ? (
              <p style={{ color: '#999' }}>No invitations received</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {receivedInvitations.map(invitation => (
                  <div key={invitation.id} style={{
                    padding: '10px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px'
                  }}>
                    <p style={{ margin: '0 0 5px 0', color: '#fff' }}>
                      <strong>{invitation.team_name}</strong>
                    </p>
                    <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '14px' }}>
                      From: {invitation.inviter_username} • Role: {invitation.role}
                    </p>
                    <p style={{ margin: 0, color: '#999', fontSize: '14px', fontStyle: 'italic' }}>
                      See your <Link to="/profile" style={{ color: '#007bff', textDecoration: 'none' }}>Profile</Link> page to respond
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Player Modal */}
      {showInviteForm && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal" style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="modal-header" style={{
              padding: '20px 20px 15px 20px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px 8px 0 0'
            }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Invite Player</h3>
              <button 
                className="modal-close"
                onClick={() => setShowInviteForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#ccc'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleInvitePlayer} className="modal-content" style={{
              padding: '20px',
              color: '#fff'
            }}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="discordUsername" style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>Discord Username</label>
                <input
                  type="text"
                  id="discordUsername"
                  value={inviteData.discordUsername}
                  onChange={(e) => setInviteData(prev => ({ ...prev, discordUsername: e.target.value }))}
                  placeholder="PlayerName#1234 or @username"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <small className="field-help" style={{ color: '#666', fontSize: '12px' }}>Find this in Discord: User Settings → My Account → Username</small>
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="discordEmail" style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>Or Discord Email</label>
                <input
                  type="email"
                  id="discordEmail"
                  value={inviteData.discordEmail}
                  onChange={(e) => setInviteData(prev => ({ ...prev, discordEmail: e.target.value }))}
                  placeholder="player@email.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <small className="field-help" style={{ color: '#666', fontSize: '12px' }}>Enter either username or email</small>
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="role" style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>Role</label>
                <select
                  id="role"
                  value={inviteData.role}
                  onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="Player">Main Player</option>
                  <option value="Substitute">Substitute</option>
                </select>
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label htmlFor="message" style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>Optional Message</label>
                <textarea
                  id="message"
                  value={inviteData.message}
                  onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Hey! Would you like to join our team for the tournament?"
                  rows="3"
                  maxLength="500"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                <small className="field-help" style={{ color: '#666', fontSize: '12px' }}>Personal message to include with the invitation</small>
              </div>
              
              <div className="invite-notice" style={{
                backgroundColor: '#f0f8ff',
                border: '1px solid #4a90e2',
                borderRadius: '4px',
                padding: '12px',
                marginTop: '15px',
                fontSize: '14px'
              }}>
                <p style={{ margin: 0, color: '#333' }}>
                  <strong style={{ color: '#333' }}>Note:</strong> The invited player needs to have logged into the tournament system at least once. 
                  If they haven't registered yet, the invitation will be waiting for them when they first log in.
                </p>
              </div>
              
              <div className="modal-actions" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
                paddingTop: '15px',
                borderTop: '1px solid #333'
              }}>
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowInviteForm(false)}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f8f9fa',
                    color: '#333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    backgroundColor: loading ? '#ccc' : '#007bff',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
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