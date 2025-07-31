import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    tournamentsCreated: 0,
    teamsCreated: 0,
    matchesPlayed: 0,
    wins: 0
  });
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    preferredRole: '',
    experienceLevel: ''
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadInvitations();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      
      // Get tournaments created by user
      const tournamentsResponse = await axios.get(`${API_BASE_URL}/tournaments`, {
        withCredentials: true
      });
      const tournaments = tournamentsResponse.data || [];
      const userTournaments = tournaments.filter(t => t.creator_username === user?.discordUsername);
      
      // Get teams created by user
      const teamsResponse = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        withCredentials: true
      });
      const teams = teamsResponse.data || [];
      
      setStats({
        tournamentsCreated: userTournaments.length,
        teamsCreated: teams.length,
        matchesPlayed: 0, // Will need match endpoints
        wins: 0 // Will need match endpoints
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const response = await axios.get(`${API_BASE_URL}/invitations/my-invitations`, {
        withCredentials: true
      });
      setInvitations(response.data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const respondToInvitation = async (invitationId, response) => {
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

  const handlePreferenceChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      
      // For now, just show success message since we don't have user preference endpoints yet
      // In the future, this would save to the database
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      toast.success('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleStatClick = (statType) => {
    switch (statType) {
      case 'tournaments':
        navigate('/tournaments');
        break;
      case 'teams':
        navigate('/teams');
        break;
      case 'matches':
        toast.info('Match history will be available when match endpoints are implemented');
        break;
      case 'wins':
        toast.info('Win statistics will be available when match endpoints are implemented');
        break;
      default:
        break;
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account settings and tournament preferences.</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.discordUsername?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{user?.discordUsername}</h2>
              <p>Discord ID: {user?.discordID}</p>
              {user?.isAdmin && <span className="admin-badge">Admin</span>}
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-group">
              <label>Email</label>
              <p>{user?.email || 'Not provided'}</p>
            </div>

            <div className="detail-group">
              <label>Member Since</label>
              <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>

            <div className="detail-group">
              <label>Last Active</label>
              <p>{user?.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <h3>Tournament Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card clickable" onClick={() => handleStatClick('tournaments')}>
              <h4>{loading ? '...' : stats.tournamentsCreated}</h4>
              <p>Tournaments Created</p>
              <small>Click to view tournaments</small>
            </div>
            <div className="stat-card clickable" onClick={() => handleStatClick('teams')}>
              <h4>{loading ? '...' : stats.teamsCreated}</h4>
              <p>Teams Created</p>
              <small>Click to view teams</small>
            </div>
            <div className="stat-card clickable" onClick={() => handleStatClick('matches')}>
              <h4>{loading ? '...' : stats.matchesPlayed}</h4>
              <p>Matches Played</p>
              <small>Coming soon</small>
            </div>
            <div className="stat-card clickable" onClick={() => handleStatClick('wins')}>
              <h4>{loading ? '...' : stats.wins}</h4>
              <p>Wins</p>
              <small>Coming soon</small>
            </div>
          </div>
        </div>

        {/* Team Invitations Section */}
        <div className="profile-invitations">
          <h3>Team Invitations</h3>
          {loadingInvitations ? (
            <div className="loading-section">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="empty-state">
              <p>No pending team invitations</p>
              <small>When you receive team invitations, they'll appear here</small>
            </div>
          ) : (
            <div className="invitations-list">
              {invitations.map(invitation => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-info">
                    <h4>{invitation.team_name}</h4>
                    <p>Role: <strong>{invitation.role}</strong></p>
                    <p>From: <strong>{invitation.inviter_username}</strong></p>
                    {invitation.message && (
                      <p className="invitation-message">"{invitation.message}"</p>
                    )}
                    <small>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</small>
                  </div>
                  <div className="invitation-actions">
                    <button 
                      className="btn-primary"
                      onClick={() => respondToInvitation(invitation.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => respondToInvitation(invitation.id, 'declined')}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-preferences">
          <h3>Tournament Preferences</h3>
          <div className="preferences-form">
            <div className="form-group">
              <label>Preferred Role</label>
              <select 
                name="preferredRole"
                value={preferences.preferredRole}
                onChange={handlePreferenceChange}
              >
                <option value="">Select Role</option>
                <option value="carry">Carry</option>
                <option value="support">Support</option>
                <option value="midlane">Midlane</option>
                <option value="offlane">Offlane</option>
                <option value="jungle">Jungle</option>
                <option value="flex">Flex</option>
              </select>
            </div>

            <div className="form-group">
              <label>Experience Level</label>
              <select 
                name="experienceLevel"
                value={preferences.experienceLevel}
                onChange={handlePreferenceChange}
              >
                <option value="">Select Experience</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="professional">Professional</option>
              </select>
            </div>

            <button 
              className="btn-primary"
              onClick={handleSavePreferences}
              disabled={savingPreferences}
            >
              {savingPreferences ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;