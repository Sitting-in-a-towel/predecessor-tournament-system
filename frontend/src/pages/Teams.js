import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import TeamSignup from '../components/Team/TeamSignup';
import TeamManagement from '../components/Team/TeamManagement';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Teams = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    loadUserTeams();
    
    // Reset selected team when navigating to teams page
    setSelectedTeam(null);
    
    // Check if we should auto-open team creation (from "Register Team" button)
    if (location.state?.action === 'create') {
      setShowCreateForm(true);
    }
  }, [location.state, location.pathname]);

  // Load invitations after teams are loaded
  useEffect(() => {
    if (teams.length > 0 || !loading) {
      loadInvitations();
    }
  }, [teams, loading]);

  const loadUserTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        withCredentials: true
      });
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      
      // Load all sent invitations for user's teams
      const allSentInvitations = [];
      for (const team of teams) {
        try {
          const response = await axios.get(`${API_BASE_URL}/invitations/team/${team.team_id}`, { 
            withCredentials: true 
          });
          allSentInvitations.push(...(response.data || []));
        } catch (error) {
          console.error(`Error loading invitations for team ${team.team_id}:`, error);
        }
      }
      setSentInvitations(allSentInvitations);

      // Load received invitations
      const receivedResponse = await axios.get(`${API_BASE_URL}/invitations/my-invitations`, { 
        withCredentials: true 
      });
      setReceivedInvitations(receivedResponse.data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleCreateTeam = () => {
    setShowCreateForm(true);
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const handleTeamUpdate = () => {
    loadUserTeams();
    if (selectedTeam) {
      // Refresh selected team data
      const updatedTeam = teams.find(team => team.team_id === selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
    }
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

  const handleRespondToInvitation = async (invitationId, response) => {
    try {
      await axios.post(`${API_BASE_URL}/invitations/${invitationId}/respond`, {
        response
      }, { withCredentials: true });
      
      toast.success(response === 'accepted' ? 'Invitation accepted!' : 'Invitation declined');
      
      // Reload invitations to update the list
      loadInvitations();
    } catch (error) {
      console.error('Error responding to invitation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to respond to invitation';
      toast.error(errorMessage);
    }
  };

  const isCaptain = (team) => {
    // For PostgreSQL, we need to check if user is captain differently
    // This will need to be updated when we have proper captain tracking
    return true; // Placeholder - assume user is captain of their teams
  };

  const getTeamStatus = (team) => {
    // For now, assume all teams are confirmed since we set confirmed=true in backend
    if (team.confirmed) {
      return { status: 'confirmed', text: 'Ready to Play', color: 'green' };
    } else {
      return { status: 'incomplete', text: 'Pending confirmation', color: 'orange' };
    }
  };

  if (showCreateForm) {
    return (
      <div className="teams-page">
        <TeamSignup 
          onClose={() => {
            setShowCreateForm(false);
            loadUserTeams();
          }} 
        />
      </div>
    );
  }

  if (selectedTeam) {
    return (
      <div className="teams-page">
        <div className="team-navigation">
          <button 
            className="btn-secondary"
            onClick={() => setSelectedTeam(null)}
          >
            ← Back to Teams
          </button>
        </div>
        <TeamManagement 
          team={selectedTeam}
          onTeamUpdate={handleTeamUpdate}
        />
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="page-header">
        <h1>Team Management</h1>
        <p>Create teams, manage rosters, and invite players to join your tournaments.</p>
      </div>

      <div className="teams-container">
        <div className="teams-actions">
          <button className="btn-primary" onClick={handleCreateTeam}>
            Create New Team
          </button>
          <button className="btn-secondary" onClick={() => navigate('/tournaments')}>
            Browse Tournaments
          </button>
        </div>

        <div className="teams-content">
          {/* My Teams Section */}
          <div className="my-teams-section">
            <h2>My Teams</h2>
            
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">Loading teams...</div>
              </div>
            ) : teams.length > 0 ? (
              <div className="teams-grid">
                {teams.map(team => {
                  const status = getTeamStatus(team);
                  return (
                    <div key={team.team_id} className="team-card">
                      <div className="team-header">
                        <img 
                          src={team.team_logo || '/assets/images/predecessor-default-icon.jpg'} 
                          alt="Team logo" 
                          className="team-logo-small" 
                        />
                        <div className="team-info">
                          <h3>{team.team_name}</h3>
                          <div className="team-meta">
                            {isCaptain(team) && <span className="captain-badge">Captain</span>}
                            <span className={`status-badge ${status.status}`}>
                              {status.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="team-stats">
                        <div className="stat-item">
                          <label>Players</label>
                          <span>{team.player_count || 1}/5</span>
                        </div>
                        <div className="stat-item">
                          <label>Substitutes</label>
                          <span>0/3</span>
                        </div>
                        <div className="stat-item">
                          <label>Status</label>
                          <span className={team.confirmed ? 'confirmed' : 'pending'}>
                            {team.confirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="team-actions">
                        <button 
                          className="btn-primary"
                          onClick={() => handleTeamSelect(team)}
                        >
                          Manage Team
                        </button>
                        {team.tournament_ref_id && (
                          <button 
                            className="btn-secondary"
                            onClick={() => navigate(`/tournaments/${team.tournament_ref_id}`)}
                          >
                            View Tournament
                          </button>
                        )}
                      </div>

                      <div className="team-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${((team.player_count || 1) / 5) * 100}%`,
                              backgroundColor: status.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-content">
                  <h3>No Teams Yet</h3>
                  <p>You haven't created or joined any teams yet.</p>
                  <p>Create a team to participate in tournaments!</p>
                  <button className="btn-primary" onClick={handleCreateTeam}>
                    Create Your First Team
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Team Invitations Section - Split View */}
          <div className="team-invitations-section" style={{ marginTop: '30px' }}>
            <h2>Team Invitations</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
              {/* Sent Invitations */}
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '8px' 
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#fff' }}>Invitations You've Sent</h4>
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
                          Team: {invitation.team_name} • Role: {invitation.role}
                        </p>
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
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
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#fff' }}>Invitations For You</h4>
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
                        {invitation.message && (
                          <p style={{ 
                            margin: '5px 0', 
                            color: '#ccc', 
                            fontSize: '13px', 
                            fontStyle: 'italic',
                            padding: '5px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '3px',
                            borderLeft: '3px solid #007bff'
                          }}>
                            "{invitation.message}"
                          </p>
                        )}
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            onClick={() => handleRespondToInvitation(invitation.id, 'accepted')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToInvitation(invitation.id, 'declined')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'transparent',
                              color: '#dc3545',
                              border: '1px solid #dc3545',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.backgroundColor = '#dc3545';
                              e.target.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = '#dc3545';
                            }}
                          >
                            Decline
                          </button>
                          <Link 
                            to="/profile" 
                            style={{ 
                              padding: '6px 12px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              textDecoration: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              display: 'inline-block',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            Profile
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Player Discovery Section */}
          <div className="player-discovery-section">
            <h2>Looking for Players?</h2>
            <div className="discovery-content">
              <p>Find players who are looking for teams in current tournaments.</p>
              <div className="discovery-actions">
                <button className="btn-secondary">
                  Browse Available Players
                </button>
                <button className="btn-secondary">
                  Post Team Signup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;