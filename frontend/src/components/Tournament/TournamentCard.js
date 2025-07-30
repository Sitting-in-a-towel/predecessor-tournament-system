import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const TournamentCard = ({ tournament }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming': return 'upcoming';
      case 'Registration': return 'active';
      case 'Check-In': return 'active';
      case 'In Progress': return 'active';
      case 'Active': return 'active';
      case 'Completed': return 'completed';
      case 'Cancelled': return 'cancelled';
      default: return 'planning';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = () => {
    navigate(`/tournaments/${tournament.tournament_id || tournament.TournamentID}`);
  };

  const handleRegisterTeam = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/teams', { 
      state: { 
        tournamentId: tournament.tournament_id || tournament.TournamentID,
        action: 'create' 
      } 
    });
  };

  return (
    <div className="tournament-card">
      <div className="tournament-header">
        <div className="tournament-title">
          <h3>{tournament.name || tournament.Name || 'Unknown'}</h3>
          <span className={`status-badge ${getStatusColor(tournament.status || tournament.Status)}`}>
            {tournament.status || tournament.Status || 'Unknown'}
          </span>
        </div>
        <div className="tournament-meta">
          <span className="bracket-type">{tournament.bracket_type || tournament.BracketType || 'Unknown'}</span>
        </div>
      </div>

      <div className="tournament-details">
        {(tournament.description || tournament.Description) && (
          <p className="tournament-description">{tournament.description || tournament.Description}</p>
        )}
        
        <div className="tournament-info">
          <div className="info-item">
            <span className="info-label">Format:</span>
            <span className="info-value">{tournament.game_format || tournament.GameFormat || 'Unknown'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Max Teams:</span>
            <span className="info-value">{tournament.max_teams || tournament.MaxTeams || 'Unknown'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Start Date:</span>
            <span className="info-value">{formatDate(tournament.start_date || tournament.StartDate)}</span>
          </div>
        </div>
      </div>

      <div className="tournament-actions">
        <button 
          className="btn-secondary"
          onClick={handleViewDetails}
        >
          View Details
        </button>
        
        {(tournament.status || tournament.Status) === 'Registration' && (tournament.registration_open !== false) && (
          <button 
            className="btn-primary"
            onClick={handleRegisterTeam}
          >
            Register Team
          </button>
        )}
      </div>

      <div className="tournament-progress">
        <div className="progress-info">
          <span>0/{tournament.MaxTeams} teams registered</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: '0%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default TournamentCard;