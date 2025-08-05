import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TournamentCreation = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bracketType: 'Double Elimination',
    gameFormat: 'Best of 3',
    quarterFinalFormat: 'Best of 3',
    semiFinalFormat: 'Best of 5',
    grandFinalFormat: 'Best of 5',
    maxTeams: 16,
    registrationStart: '',
    registrationEnd: '',
    tournamentStart: '',
    rules: ''
  });

  const [errors, setErrors] = useState({});

  const bracketTypes = [
    'Single Elimination',
    'Double Elimination', 
    'Round Robin',
    'Swiss'
  ];

  const matchFormats = [
    'Best of 1',
    'Best of 3',
    'Best of 5'
  ];

  const teamLimits = [4, 8, 16, 32, 64];

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Tournament name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Tournament name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tournament name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (!formData.registrationStart) {
      newErrors.registrationStart = 'Registration start date is required';
    } else {
      const regStart = new Date(formData.registrationStart);
      const now = new Date();
      if (regStart < now) {
        newErrors.registrationStart = 'Registration start must be in the future';
      }
    }

    if (!formData.registrationEnd) {
      newErrors.registrationEnd = 'Registration end date is required';
    } else if (formData.registrationStart) {
      const regStart = new Date(formData.registrationStart);
      const regEnd = new Date(formData.registrationEnd);
      if (regEnd <= regStart) {
        newErrors.registrationEnd = 'Registration end must be after registration start';
      }
    }

    if (!formData.tournamentStart) {
      newErrors.tournamentStart = 'Tournament start date is required';
    } else if (formData.registrationEnd) {
      const regEnd = new Date(formData.registrationEnd);
      const tournStart = new Date(formData.tournamentStart);
      if (tournStart <= regEnd) {
        newErrors.tournamentStart = 'Tournament start must be after registration ends';
      }
    }

    if (formData.maxTeams < 2) {
      newErrors.maxTeams = 'Tournament must allow at least 2 teams';
    } else if (formData.maxTeams > 64) {
      newErrors.maxTeams = 'Tournament cannot exceed 64 teams';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    setIsSubmitting(true);

    try {
      const tournamentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        format: formData.bracketType,
        maxTeams: parseInt(formData.maxTeams),
        registrationStart: new Date(formData.registrationStart).toISOString(),
        registrationEnd: new Date(formData.registrationEnd).toISOString(),
        tournamentStart: new Date(formData.tournamentStart).toISOString(),
        rules: formData.rules.trim() || null
      };

      const response = await axios.post(`${API_BASE_URL}/admin/tournaments`, tournamentData, {
        withCredentials: true
      });
      
      toast.success('Tournament created successfully!');
      
      if (onClose) {
        onClose();
      } else {
        navigate('/tournaments');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/tournaments');
    }
  };

  return (
    <div className="tournament-creation">
      <div className="tournament-creation-header">
        <h2>Create New Tournament</h2>
        <p>Set up a new Predecessor tournament with custom rules and formats.</p>
      </div>

      <form onSubmit={handleSubmit} className="tournament-form">
        {/* Tournament Name */}
        <div className="form-group">
          <label htmlFor="name">Tournament Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter tournament name (e.g., Summer Championship 2025)"
            className={errors.name ? 'error' : ''}
            maxLength={100}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your tournament, rules, prizes, etc."
            rows="4"
            maxLength={1000}
            className={errors.description ? 'error' : ''}
          />
          <small className="char-count">{formData.description.length}/1000 characters</small>
          {errors.description && <span className="error-message">{errors.description}</span>}
        </div>

        <div className="form-row">
          {/* Bracket Type */}
          <div className="form-group">
            <label htmlFor="bracketType">Bracket Type *</label>
            <select
              id="bracketType"
              name="bracketType"
              value={formData.bracketType}
              onChange={handleInputChange}
            >
              {bracketTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Max Teams */}
          <div className="form-group">
            <label htmlFor="maxTeams">Maximum Teams *</label>
            <select
              id="maxTeams"
              name="maxTeams"
              value={formData.maxTeams}
              onChange={handleInputChange}
              className={errors.maxTeams ? 'error' : ''}
            >
              {teamLimits.map(limit => (
                <option key={limit} value={limit}>{limit} teams</option>
              ))}
            </select>
            {errors.maxTeams && <span className="error-message">{errors.maxTeams}</span>}
          </div>
        </div>

        {/* Match Formats */}
        <div className="format-section">
          <h3>Match Formats</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gameFormat">Regular Matches *</label>
              <select
                id="gameFormat"
                name="gameFormat"
                value={formData.gameFormat}
                onChange={handleInputChange}
              >
                {matchFormats.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="quarterFinalFormat">Quarter Finals</label>
              <select
                id="quarterFinalFormat"
                name="quarterFinalFormat"
                value={formData.quarterFinalFormat}
                onChange={handleInputChange}
              >
                {matchFormats.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="semiFinalFormat">Semi Finals</label>
              <select
                id="semiFinalFormat"
                name="semiFinalFormat"
                value={formData.semiFinalFormat}
                onChange={handleInputChange}
              >
                {matchFormats.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="grandFinalFormat">Grand Final</label>
              <select
                id="grandFinalFormat"
                name="grandFinalFormat"
                value={formData.grandFinalFormat}
                onChange={handleInputChange}
              >
                {matchFormats.map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Registration Dates */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="registrationStart">Registration Start *</label>
            <input
              type="datetime-local"
              id="registrationStart"
              name="registrationStart"
              value={formData.registrationStart}
              onChange={handleInputChange}
              className={errors.registrationStart ? 'error' : ''}
            />
            {errors.registrationStart && <span className="error-message">{errors.registrationStart}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="registrationEnd">Registration End *</label>
            <input
              type="datetime-local"
              id="registrationEnd"
              name="registrationEnd"
              value={formData.registrationEnd}
              onChange={handleInputChange}
              className={errors.registrationEnd ? 'error' : ''}
            />
            {errors.registrationEnd && <span className="error-message">{errors.registrationEnd}</span>}
          </div>
        </div>

        {/* Tournament Start - Single Row */}
        <div className="form-group">
          <label htmlFor="tournamentStart">Tournament Start *</label>
          <input
            type="datetime-local"
            id="tournamentStart"
            name="tournamentStart"
            value={formData.tournamentStart}
            onChange={handleInputChange}
            className={errors.tournamentStart ? 'error' : ''}
          />
          {errors.tournamentStart && <span className="error-message">{errors.tournamentStart}</span>}
        </div>

        {/* Rules Section */}
        <div className="form-group">
          <label htmlFor="rules">Tournament Rules</label>
          <textarea
            id="rules"
            name="rules"
            value={formData.rules}
            onChange={handleInputChange}
            placeholder="Enter tournament rules and additional information..."
            rows="4"
            maxLength={2000}
          />
          <small className="char-count">{formData.rules.length}/2000 characters</small>
        </div>

        {/* Tournament Preview */}
        {formData.name && (
          <div className="tournament-preview">
            <h3>Tournament Preview</h3>
            <div className="preview-card">
              <h4>{formData.name}</h4>
              <div className="preview-details">
                <span className="preview-item">
                  <strong>Format:</strong> {formData.bracketType}
                </span>
                <span className="preview-item">
                  <strong>Teams:</strong> Up to {formData.maxTeams}
                </span>
                <span className="preview-item">
                  <strong>Matches:</strong> {formData.gameFormat}
                </span>
                <span className="preview-item">
                  <strong>Finals:</strong> {formData.grandFinalFormat}
                </span>
                {formData.registrationStart && (
                  <span className="preview-item">
                    <strong>Registration:</strong> {new Date(formData.registrationStart).toLocaleDateString()} - {formData.registrationEnd ? new Date(formData.registrationEnd).toLocaleDateString() : 'TBD'}
                  </span>
                )}
                {formData.tournamentStart && (
                  <span className="preview-item">
                    <strong>Tournament Starts:</strong> {new Date(formData.tournamentStart).toLocaleDateString()}
                  </span>
                )}
              </div>
              {formData.description && (
                <p className="preview-description">{formData.description}</p>
              )}
            </div>
          </div>
        )}

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
            {isSubmitting ? 'Creating Tournament...' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TournamentCreation;