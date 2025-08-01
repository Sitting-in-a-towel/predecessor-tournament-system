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
  const [omedaData, setOmedaData] = useState({
    playerId: user?.omeda_player_id || '',
    isConnected: !!user?.omeda_player_id,
    profileData: null,
    lastSync: user?.omeda_last_sync || null,
    playerStats: null,
    playerInfo: null,
    favoriteHero: null,
    favoriteRole: null
  });
  const [loadingOmeda, setLoadingOmeda] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    accountDetails: false,
    invitations: false,
    preferences: false
  });

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadInvitations();
      // Check if user has Omeda.city player ID saved
      if (user.omeda_player_id) {
        setOmedaData(prev => ({
          ...prev,
          playerId: user.omeda_player_id,
          isConnected: true,
          lastSync: user.omeda_last_sync
        }));
        loadStats(); // Load stats if connected
      }
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

  const handleOmedaConnect = async () => {
    if (!omedaData.playerId.trim()) {
      toast.error('Please enter your Omeda.city Player ID');
      return;
    }

    setLoadingOmeda(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/profile/omeda/connect`, {
        playerId: omedaData.playerId.trim()
      }, { withCredentials: true });
      
      setOmedaData(prev => ({
        ...prev,
        isConnected: true,
        lastSync: new Date().toISOString(),
        playerId: response.data.playerId
      }));
      
      toast.success(response.data.message || 'Omeda.city account connected successfully!');
      
      // Load stats after connecting
      loadStats();
    } catch (error) {
      console.error('Error connecting Omeda account:', error);
      const errorMessage = error.response?.data?.error || 'Failed to connect Omeda.city account';
      toast.error(errorMessage);
    } finally {
      setLoadingOmeda(false);
    }
  };

  const handleOmedaDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Omeda.city account?')) {
      return;
    }

    setLoadingOmeda(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/profile/omeda/disconnect`, {}, {
        withCredentials: true
      });
      
      setOmedaData({
        playerId: '',
        isConnected: false,
        profileData: null,
        lastSync: null,
        gameHistory: []
      });
      
      toast.success(response.data.message || 'Omeda.city account disconnected');
    } catch (error) {
      console.error('Error disconnecting Omeda account:', error);
      const errorMessage = error.response?.data?.error || 'Failed to disconnect Omeda.city account';
      toast.error(errorMessage);
    } finally {
      setLoadingOmeda(false);
    }
  };

  const handleOmedaSync = async () => {
    setLoadingOmeda(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/profile/omeda/sync`, {}, {
        withCredentials: true
      });
      
      setOmedaData(prev => ({
        ...prev,
        lastSync: response.data.lastSync || new Date().toISOString()
      }));
      
      toast.success(response.data.message || 'Profile synced with Omeda.city!');
      
      // Reload stats after sync
      loadStats();
    } catch (error) {
      console.error('Error syncing Omeda data:', error);
      const errorMessage = error.response?.data?.error || 'Failed to sync with Omeda.city';
      toast.error(errorMessage);
    } finally {
      setLoadingOmeda(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/profile/omeda/stats`, {
        withCredentials: true
      });

      setOmedaData(prev => ({
        ...prev,
        playerStats: response.data.stats,
        playerInfo: response.data.player_info,
        favoriteHero: response.data.favorite_hero,
        favoriteRole: response.data.favorite_role
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load player statistics';
      console.error('Stats loading error details:', error.response?.data);
      
      // Only show error if it's not a 404
      if (error.response?.status !== 404) {
        toast.error(errorMessage);
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
    <div className="profile-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '1rem' }}>Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account settings and tournament preferences.</p>
      </div>

      <div className="profile-container" style={{ display: 'grid', gap: '2rem' }}>
        {/* User Information Card */}
        <div className="profile-card" style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '2rem',
          boxShadow: 'var(--shadow)'
        }}>
          <div className="profile-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            marginBottom: expandedSections.accountDetails ? '2rem' : '0',
            paddingBottom: expandedSections.accountDetails ? '1.5rem' : '0',
            borderBottom: expandedSections.accountDetails ? '1px solid var(--border-color)' : 'none'
          }}>
            <div className="profile-avatar" style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {user?.discordUsername?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info" style={{ flex: 1 }}>
              <h2 style={{ color: 'var(--text-color)', margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
                {user?.discordUsername}
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                Discord ID: {user?.discordID}
              </p>
              {user?.isAdmin && (
                <span className="admin-badge" style={{
                  backgroundColor: 'var(--warning-color)',
                  color: '#333',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>Admin</span>
              )}
            </div>
            <button
              onClick={() => toggleSection('accountDetails')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--background-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                color: 'var(--text-color)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <span>Account Details</span>
              <span style={{ transform: expandedSections.accountDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </button>
          </div>

          {/* Collapsible Account Details Section */}
          {expandedSections.accountDetails && (
            <div style={{ 
              display: 'grid',
              gap: '1.5rem'
            }}>
              {/* Basic Information */}
              <div className="profile-details" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem' 
              }}>
                <div className="detail-group">
                  <label style={{ 
                    display: 'block', 
                    color: 'var(--text-color)', 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem' 
                  }}>Email</label>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    margin: '0',
                    padding: '0.75rem',
                    backgroundColor: 'var(--background-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px'
                  }}>
                    {user?.email || 'Not provided'}
                  </p>
                </div>

                <div className="detail-group">
                  <label style={{ 
                    display: 'block', 
                    color: 'var(--text-color)', 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem' 
                  }}>Member Since</label>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    margin: '0',
                    padding: '0.75rem',
                    backgroundColor: 'var(--background-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px'
                  }}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>

                <div className="detail-group">
                  <label style={{ 
                    display: 'block', 
                    color: 'var(--text-color)', 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem' 
                  }}>Last Active</label>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    margin: '0',
                    padding: '0.75rem',
                    backgroundColor: 'var(--background-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px'
                  }}>
                    {user?.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Side by side layout for Team Invitations and Tournament Preferences */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Team Invitations Section */}
                <div className="profile-invitations" style={{
                  backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  padding: '1rem',
                  boxShadow: 'var(--shadow)'
                }}>
                  <h4 style={{ 
                    color: 'var(--primary-color)', 
                    margin: '0 0 0.75rem 0',
                    fontSize: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem'
                  }}>Team Invitations</h4>
                  {loadingInvitations ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px' }}>Loading...</p>
                  ) : invitations.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px' }}>
                      No pending invitations
                    </p>
                  ) : (
                    <div className="invitations-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {invitations.map(invitation => (
                        <div key={invitation.id} className="invitation-card" style={{
                          backgroundColor: 'var(--background-color)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '0.75rem',
                          fontSize: '13px'
                        }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ color: 'var(--primary-color)' }}>{invitation.team_name}</strong>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                              {invitation.role} • {invitation.inviter_username}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => respondToInvitation(invitation.id, 'accepted')}
                              style={{
                                backgroundColor: 'var(--success-color)',
                                color: 'white',
                                border: 'none',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => respondToInvitation(invitation.id, 'declined')}
                              style={{
                                backgroundColor: 'transparent',
                                color: 'var(--error-color)',
                                border: '1px solid var(--error-color)',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tournament Preferences Section */}
                <div className="profile-preferences" style={{
                  backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  padding: '1rem',
                  boxShadow: 'var(--shadow)'
                }}>
                  <h4 style={{ 
                    color: 'var(--primary-color)', 
                    margin: '0 0 0.75rem 0',
                    fontSize: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem'
                  }}>Tournament Preferences</h4>
                  <div className="preferences-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--text-color)', 
                        fontWeight: 'bold', 
                        marginBottom: '0.5rem',
                        fontSize: '14px'
                      }}>Preferred Role</label>
                      <select 
                        name="preferredRole"
                        value={preferences.preferredRole}
                        onChange={handlePreferenceChange}
                        style={{
                          width: '100%',
                          padding: '0.4rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--background-color)',
                          color: 'var(--text-color)',
                          fontSize: '14px'
                        }}
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
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--text-color)', 
                        fontWeight: 'bold', 
                        marginBottom: '0.5rem',
                        fontSize: '14px'
                      }}>Experience Level</label>
                      <select 
                        name="experienceLevel"
                        value={preferences.experienceLevel}
                        onChange={handlePreferenceChange}
                        style={{
                          width: '100%',
                          padding: '0.4rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--background-color)',
                          color: 'var(--text-color)',
                          fontSize: '14px'
                        }}
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
                      style={{
                        backgroundColor: savingPreferences ? 'var(--border-color)' : 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: savingPreferences ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {savingPreferences ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tournament Statistics Card */}
        <div className="profile-stats" style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '2rem',
          boxShadow: 'var(--shadow)'
        }}>
          <h3 style={{ 
            color: 'var(--primary-color)', 
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem'
          }}>Tournament Statistics</h3>
          <div className="stats-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <div className="stat-card clickable" onClick={() => handleStatClick('tournaments')} style={{
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ':hover': {
                transform: 'translateY(-2px)',
                borderColor: 'var(--primary-color)'
              }
            }}>
              <h4 style={{ 
                color: 'var(--primary-color)', 
                fontSize: '2rem', 
                margin: '0 0 0.5rem 0',
                fontWeight: 'bold'
              }}>
                {loading ? '...' : stats.tournamentsCreated}
              </h4>
              <p style={{ color: 'var(--text-color)', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                Tournaments Created
              </p>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Click to view tournaments
              </small>
            </div>
            <div className="stat-card clickable" onClick={() => handleStatClick('teams')} style={{
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <h4 style={{ 
                color: 'var(--primary-color)', 
                fontSize: '2rem', 
                margin: '0 0 0.5rem 0',
                fontWeight: 'bold'
              }}>
                {loading ? '...' : stats.teamsCreated}
              </h4>
              <p style={{ color: 'var(--text-color)', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                Teams Created
              </p>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Click to view teams
              </small>
            </div>
            <div className="stat-card clickable" onClick={() => handleStatClick('matches')} style={{
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: '0.6'
            }}>
              <h4 style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '2rem', 
                margin: '0 0 0.5rem 0',
                fontWeight: 'bold'
              }}>
                {loading ? '...' : stats.matchesPlayed}
              </h4>
              <p style={{ color: 'var(--text-color)', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                Matches Played
              </p>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Coming soon
              </small>
            </div>
            <div className="stat-card clickable" onClick={() => handleStatClick('wins')} style={{
              backgroundColor: 'var(--background-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: '0.6'
            }}>
              <h4 style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '2rem', 
                margin: '0 0 0.5rem 0',
                fontWeight: 'bold'
              }}>
                {loading ? '...' : stats.wins}
              </h4>
              <p style={{ color: 'var(--text-color)', margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                Wins
              </p>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Coming soon
              </small>
            </div>
          </div>
        </div>


        {/* Omeda.city Integration Section */}
        <div className="omeda-integration" style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '2rem',
          boxShadow: 'var(--shadow)'
        }}>
          <h3 style={{ 
            color: 'var(--primary-color)', 
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem'
          }}>Omeda.city Integration</h3>
          
          {!omedaData.isConnected ? (
            <div className="omeda-connect" style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{
                backgroundColor: '#fee75c',
                color: '#000',
                border: '1px solid #e6d050',
                borderRadius: 'var(--border-radius)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <strong>Important:</strong> Once linked, your Omeda.city account can only be changed by an admin. Make sure you're linking the correct player ID. Each player ID can only be linked to one account.
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--background-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '1.5rem',
                borderLeft: '4px solid var(--primary-color)'
              }}>
                <h4 style={{ color: 'var(--text-color)', margin: '0 0 0.5rem 0' }}>
                  🎮 Connect Your Omeda.city Account
                </h4>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontSize: '14px' }}>
                  Link your Omeda.city profile to display your match history, stats, and rank on your tournament profile.
                </p>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 0 1rem' }}>
                  <li>Show your recent match history</li>
                  <li>Display your current rank and MMR</li>
                  <li>Track your performance stats</li>
                  <li>Verify your skill level for tournaments</li>
                </ul>
              </div>

              <div className="form-group">
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-color)', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem' 
                }}>Omeda.city Player ID</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={omedaData.playerId}
                    onChange={(e) => setOmedaData(prev => ({ ...prev, playerId: e.target.value }))}
                    placeholder="e.g. 120ea13d-c41a-4e37-890e-fe0d09d8310f"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleOmedaConnect}
                    disabled={loadingOmeda}
                    style={{
                      backgroundColor: loadingOmeda ? 'var(--border-color)' : 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '4px',
                      cursor: loadingOmeda ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loadingOmeda ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Find your Player ID in your Omeda.city profile URL (the UUID after /players/)
                </small>
              </div>
            </div>
          ) : (
            <div className="omeda-connected" style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{
                backgroundColor: 'var(--background-color)',
                border: '1px solid var(--success-color)',
                borderRadius: 'var(--border-radius)',
                padding: '1.5rem',
                borderLeft: '4px solid var(--success-color)'
              }}>
                <h4 style={{ color: 'var(--success-color)', margin: '0 0 0.5rem 0' }}>
                  ✅ Omeda.city Account Connected
                </h4>
                <p style={{ color: 'var(--text-secondary)', margin: '0', fontSize: '14px' }}>
                  Player ID: <strong style={{ color: 'var(--text-color)' }}>{omedaData.playerId}</strong>
                </p>
                {omedaData.lastSync && (
                  <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '12px' }}>
                    Last synced: {new Date(omedaData.lastSync).toLocaleString()}
                  </p>
                )}
                <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '12px', fontStyle: 'italic' }}>
                  Need to change your linked account? Contact an admin on Discord.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleOmedaSync}
                  disabled={loadingOmeda}
                  style={{
                    backgroundColor: loadingOmeda ? 'var(--border-color)' : 'var(--primary-color)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: loadingOmeda ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {loadingOmeda ? 'Syncing...' : 'Sync Now'}
                </button>
                <a
                  href={`https://omeda.city/players/${omedaData.playerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: 'var(--surface-color)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  View Profile
                </a>
              </div>

              {/* Player Statistics */}
              <div style={{
                backgroundColor: 'var(--background-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '1.5rem'
              }}>
                <h4 style={{ color: 'var(--text-color)', margin: '0 0 1rem 0' }}>
                  Player Statistics
                </h4>
                {loadingStats ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading statistics...</p>
                  </div>
                ) : !omedaData.playerStats ? (
                  <div style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '14px', 
                    textAlign: 'center', 
                    padding: '2rem',
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <p style={{ margin: '0' }}>No statistics available</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    {/* Win Rate */}
                    <div style={{
                      backgroundColor: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '0.5rem' }}>
                        Win Rate
                      </div>
                      <div style={{ 
                        color: 'var(--primary-color)', 
                        fontSize: '24px', 
                        fontWeight: 'bold' 
                      }}>
                        {omedaData.playerStats.winrate ? `${(omedaData.playerStats.winrate * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>

                    {/* Total Matches */}
                    <div style={{
                      backgroundColor: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '0.5rem' }}>
                        Total Matches
                      </div>
                      <div style={{ 
                        color: 'var(--text-color)', 
                        fontSize: '24px', 
                        fontWeight: 'bold' 
                      }}>
                        {omedaData.playerStats.matches_played || 0}
                      </div>
                    </div>

                    {/* Average KDA */}
                    <div style={{
                      backgroundColor: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '0.5rem' }}>
                        Average KDA
                      </div>
                      <div style={{ 
                        color: 'var(--text-color)', 
                        fontSize: '24px', 
                        fontWeight: 'bold' 
                      }}>
                        {omedaData.playerStats.avg_kdar ? omedaData.playerStats.avg_kdar.toFixed(2) : 'N/A'}
                      </div>
                    </div>


                    {/* Favorite Hero */}
                    {omedaData.favoriteHero && (
                      <div style={{
                        backgroundColor: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '1rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '0.5rem' }}>
                          Favorite Hero
                        </div>
                        {omedaData.favoriteHero.image && (
                          <img 
                            src={`https://omeda.city${omedaData.favoriteHero.image}`}
                            alt={omedaData.favoriteHero.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '4px',
                              marginBottom: '0.25rem'
                            }}
                          />
                        )}
                        <div style={{ 
                          color: 'var(--text-color)', 
                          fontSize: '14px', 
                          fontWeight: 'bold' 
                        }}>
                          {omedaData.favoriteHero.name}
                        </div>
                        <div style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '11px'
                        }}>
                          {omedaData.favoriteHero.matches} games
                        </div>
                      </div>
                    )}

                    {/* Favorite Role */}
                    {omedaData.favoriteRole && (
                      <div style={{
                        backgroundColor: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '1rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '0.5rem' }}>
                          Favorite Role
                        </div>
                        <div style={{ 
                          color: 'var(--text-color)', 
                          fontSize: '14px', 
                          fontWeight: 'bold' 
                        }}>
                          {omedaData.favoriteRole.name}
                        </div>
                        <div style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '11px'
                        }}>
                          {omedaData.favoriteRole.matches} games
                        </div>
                      </div>
                    )}

                    {/* Rank */}
                    {omedaData.playerInfo?.rank_image && (
                      <div style={{
                        backgroundColor: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '1rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '0.5rem' }}>
                          Rank
                        </div>
                        <img 
                          src={`https://omeda.city${omedaData.playerInfo.rank_image}`}
                          alt="Rank"
                          style={{
                            width: '40px',
                            height: '40px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;