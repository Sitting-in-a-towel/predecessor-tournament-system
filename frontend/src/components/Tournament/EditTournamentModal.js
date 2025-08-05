import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './EditTournamentModal.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const EditTournamentModal = ({ tournament, onClose, onTournamentUpdated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bracket_type: 'Single Elimination',
    game_format: 'Best of 1',
    quarter_final_format: '',
    semi_final_format: '',
    grand_final_format: '',
    max_teams: 16,
    registration_open: true,
    status: 'Registration',
    start_date: '',
    registration_start: '',
    registration_end: ''
  });

  useEffect(() => {
    if (tournament) {
      // Format dates for input fields
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      };

      setFormData({
        name: tournament.name || '',
        description: tournament.description || '',
        bracket_type: tournament.bracket_type || 'Single Elimination',
        game_format: tournament.game_format || 'Best of 1',
        quarter_final_format: tournament.quarter_final_format || '',
        semi_final_format: tournament.semi_final_format || '',
        grand_final_format: tournament.grand_final_format || '',
        max_teams: tournament.max_teams || 16,
        registration_open: tournament.registration_open || false,
        status: tournament.status || 'Registration',
        start_date: formatDateForInput(tournament.start_date),
        registration_start: formatDateForInput(tournament.registration_start),
        registration_end: formatDateForInput(tournament.registration_end)
      });
    }
  }, [tournament]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Tournament name is required');
      return;
    }

    if (formData.max_teams < 2) {
      toast.error('Max teams must be at least 2');
      return;
    }

    setLoading(true);
    try {
      // Format dates for API
      const formatDateForAPI = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toISOString();
      };

      const updateData = {
        ...formData,
        start_date: formatDateForAPI(formData.start_date),
        registration_start: formatDateForAPI(formData.registration_start),
        registration_end: formatDateForAPI(formData.registration_end),
        max_teams: parseInt(formData.max_teams)
      };

      const response = await axios.put(
        `${API_BASE_URL}/tournaments/${tournament.tournament_id}`, 
        updateData,
        { withCredentials: true }
      );

      toast.success('Tournament updated successfully!');
      
      if (onTournamentUpdated) {
        onTournamentUpdated(response.data.tournament);
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to update tournament');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = () => {
    // Only allow editing if user is admin or tournament creator
    if (user?.role === 'admin' || user?.isAdmin) return true;
    if (tournament?.created_by === user?.id) return true;
    return false;
  };

  if (!canEdit()) {
    return (
      <div className="modal-overlay">
        <div className="modal edit-tournament-modal">
          <div className="modal-header">
            <h2>Access Denied</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            <p>You don't have permission to edit this tournament.</p>
            <p>Only tournament creators and administrators can edit tournaments.</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal edit-tournament-modal">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>Edit Tournament</h2>
            <button type="button" className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-content">
            <div className="form-grid">
              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>
                
                <div className="form-group">
                  <label htmlFor="name">Tournament Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    maxLength={255}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    maxLength={1000}
                    placeholder="Describe your tournament..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Planning">Planning</option>
                      <option value="Registration">Registration</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="max_teams">Max Teams</label>
                    <input
                      type="number"
                      id="max_teams"
                      name="max_teams"
                      value={formData.max_teams}
                      onChange={handleInputChange}
                      min="2"
                      max="64"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="registration_open"
                      checked={formData.registration_open}
                      onChange={handleInputChange}
                    />
                    Registration Open
                  </label>
                </div>
              </div>

              {/* Tournament Format */}
              <div className="form-section">
                <h3>Tournament Format</h3>
                
                <div className="form-group">
                  <label htmlFor="bracket_type">Bracket Type</label>
                  <select
                    id="bracket_type"
                    name="bracket_type"
                    value={formData.bracket_type}
                    onChange={handleInputChange}
                  >
                    <option value="Single Elimination">Single Elimination</option>
                    <option value="Double Elimination">Double Elimination</option>
                    <option value="Round Robin">Round Robin</option>
                    <option value="Swiss">Swiss</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="game_format">Default Game Format</label>
                  <select
                    id="game_format"
                    name="game_format"
                    value={formData.game_format}
                    onChange={handleInputChange}
                  >
                    <option value="Best of 1">Best of 1</option>
                    <option value="Best of 3">Best of 3</option>
                    <option value="Best of 5">Best of 5</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="quarter_final_format">Quarter Finals Format</label>
                  <select
                    id="quarter_final_format"
                    name="quarter_final_format"
                    value={formData.quarter_final_format}
                    onChange={handleInputChange}
                  >
                    <option value="">Use Default Format</option>
                    <option value="Best of 1">Best of 1</option>
                    <option value="Best of 3">Best of 3</option>
                    <option value="Best of 5">Best of 5</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="semi_final_format">Semi Finals Format</label>
                  <select
                    id="semi_final_format"
                    name="semi_final_format"
                    value={formData.semi_final_format}
                    onChange={handleInputChange}
                  >
                    <option value="">Use Default Format</option>
                    <option value="Best of 1">Best of 1</option>
                    <option value="Best of 3">Best of 3</option>
                    <option value="Best of 5">Best of 5</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="grand_final_format">Grand Final Format</label>
                  <select
                    id="grand_final_format"
                    name="grand_final_format"
                    value={formData.grand_final_format}
                    onChange={handleInputChange}
                  >
                    <option value="">Use Default Format</option>
                    <option value="Best of 1">Best of 1</option>
                    <option value="Best of 3">Best of 3</option>
                    <option value="Best of 5">Best of 5</option>
                  </select>
                </div>
              </div>

              {/* Dates & Times */}
              <div className="form-section full-width">
                <h3>Schedule</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="registration_start">Registration Start</label>
                    <input
                      type="datetime-local"
                      id="registration_start"
                      name="registration_start"
                      value={formData.registration_start}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="registration_end">Registration End</label>
                    <input
                      type="datetime-local"
                      id="registration_end"
                      name="registration_end"
                      value={formData.registration_end}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="start_date">Tournament Start</label>
                  <input
                    type="datetime-local"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTournamentModal;