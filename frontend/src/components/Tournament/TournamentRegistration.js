import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './TournamentRegistration.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const TournamentRegistration = ({ tournament, onClose }) => {
  const { user } = useAuth();
  const [registrationType, setRegistrationType] = useState('existing-team'); // 'existing-team', 'new-team', 'solo-player'
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New team data
  const [newTeamData, setNewTeamData] = useState({
    teamName: '',
    teamLogo: ''
  });
  
  // Solo player data
  const [soloPlayerData, setSoloPlayerData] = useState({
    preferredRole: '',
    experienceLevel: '',
    omedaCityProfile: '',
    availableHours: '',
    notes: ''
  });

  useEffect(() => {
    loadMyTeams();
  }, []);

  const loadMyTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        withCredentials: true
      });
      setMyTeams(response.data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const handleRegistrationTypeChange = (type) => {
    setRegistrationType(type);
    setSelectedTeam('');
  };

  const handleNewTeamChange = (e) => {
    const { name, value } = e.target;
    setNewTeamData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSoloPlayerChange = (e) => {
    const { name, value } = e.target;
    setSoloPlayerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (registrationType === 'existing-team') {
        if (!selectedTeam) {
          toast.error('Please select a team');
          return;
        }
        
        // Register existing team for tournament
        const response = await axios.post(`${API_BASE_URL}/tournaments/${tournament.tournament_id}/register-team`, {
          teamId: selectedTeam,
          type: 'existing-team'
        }, { withCredentials: true });
        
        toast.success(response.data.message || 'Team registered for tournament!');
        
      } else if (registrationType === 'new-team') {
        if (!newTeamData.teamName.trim()) {
          toast.error('Please enter a team name');
          return;
        }
        
        // Create new team and register for tournament
        const teamData = {
          teamName: newTeamData.teamName.trim(),
          tournamentID: tournament.tournament_id
        };
        
        if (newTeamData.teamLogo) {
          teamData.teamLogo = newTeamData.teamLogo;
        }

        const response = await axios.post(`${API_BASE_URL}/teams`, teamData, {
          withCredentials: true
        });
        
        toast.success('Team created and registered for tournament!');
        
      } else if (registrationType === 'solo-player') {
        if (!soloPlayerData.preferredRole) {
          toast.error('Please select your preferred role');
          return;
        }
        
        // Register as solo player looking for team
        toast.info('Solo player registration will be available when backend endpoints are implemented');
      }

      if (onClose) {
        onClose();
      }
      
    } catch (error) {
      console.error('Error registering:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tournament-registration-modal">
      <div className="registration-header">
        <h2>Register for {tournament.name}</h2>
        <p>Choose how you'd like to participate in this tournament.</p>
      </div>

      <form onSubmit={handleSubmit} className="registration-form">
        {/* Registration Type Selection */}
        <div className="form-group">
          <label htmlFor="registrationTypeSelect">Registration Type</label>
          <select
            id="registrationTypeSelect"
            value={registrationType}
            onChange={(e) => handleRegistrationTypeChange(e.target.value)}
            className="registration-type-select"
          >
            <option value="existing-team">Register Existing Team</option>
            <option value="new-team">Create New Team</option>
            <option value="solo-player">Solo Player (Looking for Team)</option>
          </select>
        </div>

        {/* Existing Team Selection */}
        {registrationType === 'existing-team' && (
          <div className="registration-section">
            <div className="section-header">
              <h3>Select Your Team</h3>
              <p>Choose from teams where you are the captain</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="teamSelect">Available Teams</label>
              {myTeams.length > 0 ? (
                <select
                  id="teamSelect"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="team-select"
                  required
                >
                  <option value="">Choose a team...</option>
                  {myTeams.map(team => (
                    <option key={team.team_id} value={team.team_id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h4>No Teams Available</h4>
                  <p>You don't have any teams where you're the captain yet.</p>
                  <small>Try creating a new team or registering as a solo player instead.</small>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Team Creation */}
        {registrationType === 'new-team' && (
          <div className="registration-section">
            <div className="section-header">
              <h3>Create New Team</h3>
              <p>Create a team specifically for this tournament</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="teamName">Team Name *</label>
              <input
                type="text"
                id="teamName"
                name="teamName"
                value={newTeamData.teamName}
                onChange={handleNewTeamChange}
                placeholder="Enter your team name"
                maxLength={50}
                className="team-name-input"
                required
              />
              <small className="char-counter">{newTeamData.teamName.length}/50 characters</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="teamLogo">Team Logo URL (Optional)</label>
              <input
                type="url"
                id="teamLogo"
                name="teamLogo"
                value={newTeamData.teamLogo}
                onChange={handleNewTeamChange}
                placeholder="https://example.com/logo.png"
                className="team-logo-input"
              />
              <small className="help-text">Provide a URL to your team's logo image</small>
            </div>
          </div>
        )}

        {/* Solo Player Registration */}
        {registrationType === 'solo-player' && (
          <div className="registration-section">
            <div className="section-header">
              <h3>Solo Player Registration</h3>
              <p>Register as an individual looking for a team</p>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="preferredRole">Preferred Role *</label>
                <select
                  id="preferredRole"
                  name="preferredRole"
                  value={soloPlayerData.preferredRole}
                  onChange={handleSoloPlayerChange}
                  className="role-select"
                  required
                >
                  <option value="">Select your preferred role</option>
                  <option value="carry">Carry</option>
                  <option value="support">Support</option>
                  <option value="midlane">Midlane</option>
                  <option value="offlane">Offlane</option>
                  <option value="jungle">Jungle</option>
                  <option value="flex">Flex (Any Role)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="experienceLevel">Experience Level *</label>
                <select
                  id="experienceLevel"
                  name="experienceLevel"
                  value={soloPlayerData.experienceLevel}
                  onChange={handleSoloPlayerChange}
                  className="experience-select"
                  required
                >
                  <option value="">Select your experience level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="omedaCityProfile">Omeda City Profile (Optional)</label>
              <input
                type="url"
                id="omedaCityProfile"
                name="omedaCityProfile"
                value={soloPlayerData.omedaCityProfile}
                onChange={handleSoloPlayerChange}
                placeholder="https://omedacity.com/profile/yourname"
                className="profile-input"
              />
              <small className="help-text">Link to your Omeda City profile for stats verification</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="availableHours">Available Hours (Optional)</label>
              <input
                type="text"
                id="availableHours"
                name="availableHours"
                value={soloPlayerData.availableHours}
                onChange={handleSoloPlayerChange}
                placeholder="e.g. Weekdays 7-11 PM EST"
                className="hours-input"
              />
              <small className="help-text">When are you typically available to play?</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Additional Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={soloPlayerData.notes}
                onChange={handleSoloPlayerChange}
                placeholder="Any additional information for potential teammates..."
                rows={3}
                maxLength={500}
                className="notes-textarea"
              />
              <small className="char-counter">{soloPlayerData.notes.length}/500 characters</small>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => {
              if (onClose) {
                onClose();
              }
            }}
            className="btn-secondary"
            disabled={loading}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || (registrationType === 'existing-team' && myTeams.length === 0)}
          >
            {loading ? 'Registering...' : 
             registrationType === 'existing-team' ? 'Register Team' :
             registrationType === 'new-team' ? 'Create & Register' :
             'Register as Solo Player'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TournamentRegistration;