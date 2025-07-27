import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const TournamentCard = ({ tournament }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming': return 'upcoming';
      case 'Active': return 'active';
      case 'Completed': return 'completed';
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
    navigate(`/tournaments/${tournament.TournamentID}`);
  };

  const handleRegisterTeam = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/teams', { 
      state: { 
        tournamentId: tournament.TournamentID,
        action: 'create' 
      } 
    });
  };

  return (
    <div className="tournament-card">
      <div className="tournament-header">
        <div className="tournament-title">
          <h3>{tournament.Name}</h3>
          <span className={`status-badge ${getStatusColor(tournament.Status)}`}>
            {tournament.Status}
          </span>
        </div>
        <div className="tournament-meta">
          <span className="bracket-type">{tournament.BracketType}</span>
        </div>
      </div>

      <div className="tournament-details">
        {tournament.Description && (
          <p className="tournament-description">{tournament.Description}</p>
        )}
        
        <div className="tournament-info">
          <div className="info-item">
            <span className="info-label">Format:</span>
            <span className="info-value">{tournament.GameFormat}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Max Teams:</span>
            <span className="info-value">{tournament.MaxTeams}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Start Date:</span>
            <span className="info-value">{formatDate(tournament.StartDate)}</span>
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
        
        {tournament.Status === 'Upcoming' && tournament.RegistrationOpen && (
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