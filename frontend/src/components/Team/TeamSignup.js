import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { airtableService } from '../../services/airtableService';
import { toast } from 'react-toastify';

const TeamSignup = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get tournament ID from navigation state or props
  const tournamentId = location.state?.tournamentId;
  
  const [formData, setFormData] = useState({
    teamName: '',
    teamLogo: '',
    description: '',
    selectedTournament: tournamentId || ''
  });

  const [errors, setErrors] = useState({});
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoadingTournaments(true);
      const data = await airtableService.getTournaments();
      setTournaments(data || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoadingTournaments(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Team name validation
    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    } else if (formData.teamName.length < 2) {
      newErrors.teamName = 'Team name must be at least 2 characters';
    } else if (formData.teamName.length > 50) {
      newErrors.teamName = 'Team name must be less than 50 characters';
    }

    // Team logo validation (optional)
    if (formData.teamLogo && !isValidUrl(formData.teamLogo)) {
      newErrors.teamLogo = 'Please enter a valid URL for the team logo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    if (!formData.selectedTournament) {
      toast.error('Please select a tournament');
      return;
    }

    setIsSubmitting(true);

    try {
      const teamData = {
        teamName: formData.teamName.trim(),
        tournamentID: formData.selectedTournament,
        teamLogo: formData.teamLogo || null
      };

      const newTeam = await airtableService.createTeam(teamData);
      
      toast.success('Team created successfully! You are now the team captain.');
      
      if (onClose) {
        onClose();
      } else {
        navigate('/teams');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      if (error.response?.status === 409) {
        toast.error('A team with this name already exists in this tournament');
      } else {
        toast.error('Failed to create team. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  return (
    <div className="team-signup">
      <div className="team-signup-header">
        <h2>Create New Team</h2>
        <p>Create your team and become the captain. You'll be able to invite players and manage your roster.</p>
      </div>

      <form onSubmit={handleSubmit} className="team-form">
        {/* Tournament Selection */}
        <div className="form-group">
          <label htmlFor="selectedTournament">Select Tournament *</label>
          {loadingTournaments ? (
            <p>Loading tournaments...</p>
          ) : (
            <select
              id="selectedTournament"
              name="selectedTournament"
              value={formData.selectedTournament}
              onChange={handleInputChange}
              className={errors.selectedTournament ? 'error' : ''}
              required
            >
              <option value="">Choose a tournament...</option>
              {tournaments.map(tournament => (
                <option key={tournament.recordId} value={tournament.TournamentID}>
                  {tournament.Name} ({tournament.BracketType})
                </option>
              ))}
            </select>
          )}
          {errors.selectedTournament && <span className="error-message">{errors.selectedTournament}</span>}
        </div>

        {/* Team Name */}
        <div className="form-group">
          <label htmlFor="teamName">Team Name *</label>
          <input
            type="text"
            id="teamName"
            name="teamName"
            value={formData.teamName}
            onChange={handleInputChange}
            placeholder="Enter your team name"
            className={errors.teamName ? 'error' : ''}
            maxLength={50}
          />
          {errors.teamName && <span className="error-message">{errors.teamName}</span>}
          <small className="char-count">{formData.teamName.length}/50 characters</small>
        </div>

        {/* Team Logo */}
        <div className="form-group">
          <label htmlFor="teamLogo">Team Logo URL (Optional)</label>
          <input
            type="url"
            id="teamLogo"
            name="teamLogo"
            value={formData.teamLogo}
            onChange={handleInputChange}
            placeholder="https://example.com/logo.png"
            className={errors.teamLogo ? 'error' : ''}
          />
          {errors.teamLogo && <span className="error-message">{errors.teamLogo}</span>}
          <small className="help-text">Provide a URL to your team's logo image</small>
        </div>

        {/* Logo Preview */}
        {formData.teamLogo && isValidUrl(formData.teamLogo) && (
          <div className="logo-preview">
            <label>Logo Preview</label>
            <div className="preview-container">
              <img 
                src={formData.teamLogo} 
                alt="Team logo preview" 
                className="logo-preview-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="logo-error" style={{ display: 'none' }}>
                Failed to load image
              </div>
            </div>
          </div>
        )}

        {/* Team Preview */}
        {formData.teamName && (
          <div className="team-preview">
            <h3>Team Preview</h3>
            <div className="preview-card">
              <div className="team-header">
                {formData.teamLogo && isValidUrl(formData.teamLogo) && (
                  <img src={formData.teamLogo} alt="Team logo" className="team-logo-small" />
                )}
                <div className="team-info">
                  <h4>{formData.teamName}</h4>
                  <p className="captain-info">Captain: {user?.discordUsername}</p>
                  <div className="team-stats">
                    <span className="stat">1/5 players</span>
                    <span className="stat">0/3 substitutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Rules */}
        <div className="team-rules">
          <h3>Team Requirements</h3>
          <ul>
            <li>✅ You will become the team captain</li>
            <li>📋 Teams need 5 confirmed players to participate</li>
            <li>🔄 Up to 3 substitute players allowed</li>
            <li>👥 You can invite players after creating the team</li>
            <li>⚡ Captain must be available for draft sessions</li>
            <li>✔️ Team must be confirmed before tournament starts</li>
          </ul>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Team...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamSignup;