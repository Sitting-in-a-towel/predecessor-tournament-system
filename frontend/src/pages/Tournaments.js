import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import TournamentCreation from '../components/Tournament/TournamentCreation';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Tournaments = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    bracketType: 'all'
  });

  useEffect(() => {
    loadTournaments();
  }, [filters]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      if (filters.bracketType !== 'all') {
        params.append('bracketType', filters.bracketType);
      }

      const response = await axios.get(`${API_BASE_URL}/tournaments?${params}`, {
        withCredentials: true
      });
      setTournaments(response.data || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleViewTournament = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const handleRegisterTeam = (tournamentId) => {
    if (!isAuthenticated) {
      toast.info('Please log in to register a team');
      navigate('/login');
      return;
    }
    navigate('/teams', { state: { action: 'create', tournamentId } });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusDisplayName = (status) => {
    const statusMap = {
      'planning': 'Planning',
      'registration': 'Registration',
      'in-progress': 'In Progress',  
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  if (showCreateForm) {
    return (
      <div className="tournaments-page">
        <TournamentCreation 
          onClose={() => {
            setShowCreateForm(false);
            loadTournaments(); // Reload tournaments after creation
          }} 
        />
      </div>
    );
  }

  return (
    <div className="tournaments-page">
      <div className="page-header">
        <h1>Tournaments</h1>
        <p>Join competitive Predecessor tournaments or view ongoing matches.</p>
      </div>

      <div className="tournaments-container">
        {/* Filters */}
        <div className="tournaments-filters">
          <select 
            className="filter-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All Tournaments</option>
            <option value="Planning">Planning</option>
            <option value="Registration">Open for Registration</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          
          <select 
            className="filter-select"
            value={filters.bracketType}
            onChange={(e) => handleFilterChange('bracketType', e.target.value)}
          >
            <option value="all">All Formats</option>
            <option value="Single Elimination">Single Elimination</option>
            <option value="Double Elimination">Double Elimination</option>
            <option value="Round Robin">Round Robin</option>
            <option value="Swiss">Swiss</option>
          </select>

          {isAuthenticated && (
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Tournament
            </button>
          )}
        </div>

        {/* Tournament Grid */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">Loading tournaments...</div>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="tournaments-grid">
            {tournaments.map(tournament => (
              <div key={tournament.tournament_id} className="tournament-card">
                <div className="tournament-header">
                  <h3>{tournament.name}</h3>
                  <span className={`status-badge ${tournament.status?.toLowerCase()?.replace(' ', '-')}`}>
                    {getStatusDisplayName(tournament.status || 'Unknown')}
                  </span>
                </div>
                
                <div className="tournament-details">
                  <p><strong>Format:</strong> {tournament.bracket_type}</p>
                  <p><strong>Match Type:</strong> {tournament.game_format}</p>
                  <p><strong>Max Teams:</strong> {tournament.max_teams}</p>
                  <p><strong>Start Date:</strong> {formatDate(tournament.start_date)}</p>
                  {tournament.registration_open !== undefined && (
                    <p><strong>Registration:</strong> {tournament.registration_open ? 'Open' : 'Closed'}</p>
                  )}
                </div>
                
                {tournament.description && (
                  <p className="tournament-description">{tournament.description}</p>
                )}
                
                <div className="tournament-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => handleViewTournament(tournament.tournament_id)}
                  >
                    View Details
                  </button>
                  
                  {isAuthenticated && tournament.status === 'Registration' && tournament.registration_open && (
                    <button 
                      className="btn-secondary"
                      onClick={() => handleRegisterTeam(tournament.tournament_id)}
                    >
                      Register Team
                    </button>
                  )}
                  
                  {tournament.status === 'In Progress' && (
                    <button className="btn-secondary">
                      View Bracket
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-tournaments">
            <div className="empty-state">
              <h3>No tournaments found</h3>
              <p>
                {filters.status !== 'all' || filters.bracketType !== 'all' 
                  ? 'No tournaments match your current filters.' 
                  : 'No tournaments have been created yet.'
                }
              </p>
              {isAuthenticated && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowCreateForm(true)}
                >
                  Create First Tournament
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;