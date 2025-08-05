import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const CreateTournamentModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    format: 'Single Elimination',
    maxTeams: 16,
    registrationStart: '',
    registrationEnd: '',
    tournamentStart: '',
    rules: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting tournament data:', formData);
      console.log('API URL:', `${API_BASE_URL}/admin/tournaments`);
      
      const response = await axios.post(`${API_BASE_URL}/admin/tournaments`, formData, {
        withCredentials: true
      });

      toast.success('Tournament created successfully!');
      onSuccess(response.data.tournament);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        format: 'Single Elimination',
        maxTeams: 16,
        registrationStart: '',
        registrationEnd: '',
        tournamentStart: '',
        rules: ''
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div className="modal-header" style={{
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
          paddingBottom: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: '#fff', margin: 0 }}>Create New Tournament</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Tournament Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Format
              </label>
              <select
                name="format"
                value={formData.format}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff'
                }}
              >
                <option value="Single Elimination">Single Elimination</option>
                <option value="Double Elimination">Double Elimination</option>
                <option value="Round Robin">Round Robin</option>
                <option value="Swiss">Swiss</option>
              </select>
            </div>

            <div>
              <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Max Teams
              </label>
              <input
                type="number"
                name="maxTeams"
                value={formData.maxTeams}
                onChange={handleChange}
                min="4"
                max="64"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Registration Start *
              </label>
              <input
                type="datetime-local"
                name="registrationStart"
                value={formData.registrationStart}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                Registration End *
              </label>
              <input
                type="datetime-local"
                name="registrationEnd"
                value={formData.registrationEnd}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Tournament Start *
            </label>
            <input
              type="datetime-local"
              name="tournamentStart"
              value={formData.tournamentStart}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Rules & Information
            </label>
            <textarea
              name="rules"
              value={formData.rules}
              onChange={handleChange}
              rows="4"
              placeholder="Enter tournament rules, prize information, and other details..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#f8f9fa',
                color: '#333',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#007bff',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;