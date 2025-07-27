import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { airtableService } from '../../services/airtableService';
import { toast } from 'react-toastify';

const TournamentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTournamentData = async () => {
      try {
        setLoading(true);
        
        // Load tournament details
        const tournamentData = await airtableService.getTournament(id);
        setTournament(tournamentData);
        
        // Load tournament teams
        const teamsData = await airtableService.getTournamentTeams(id);
        setTeams(teamsData);
        
      } catch (error) {
        console.error('Error loading tournament:', error);
        setError('Failed to load tournament data');
        toast.error('Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadTournamentData();
    }
  }, [id]);

  const handleRegisterTeam = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to register a team');
      navigate('/login');
      return;
    }
    
    // Navigate to team creation with tournament context
    navigate('/teams/create', { state: { tournamentId: id } });
  };

  const handleJoinTournament = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to join tournaments');
      navigate('/login');
      return;
    }
    
    // Navigate to team selection or creation
    navigate('/tournaments/join', { state: { tournamentId: id } });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Planning': '#9ca3af',
      'Registration': '#22c55e',
      'In Progress': '#f59e0b',
      'Completed': '#6366f1',
      'Cancelled': '#ef4444'
    };
    return colors[status] || '#9ca3af';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTeamProgress = () => {
    const confirmedTeams = teams.filter(team => team.Confirmed).length;
    const totalSlots = tournament?.MaxTeams || 0;
    return { confirmed: confirmedTeams, total: totalSlots };
  };

  if (loading) {
    return (
      <div className="tournament-view loading">
        <div className="loading-spinner">Loading tournament...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="tournament-view error">
        <div className="error-message">
          <h2>Tournament Not Found</h2>
          <p>{error || 'The requested tournament could not be found.'}</p>
          <button onClick={() => navigate('/tournaments')} className="btn-primary">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const progress = getTeamProgress();
  const canRegister = tournament.Status === 'Registration' && tournament.RegistrationOpen;
  const isUpcoming = tournament.Status === 'Planning' || tournament.Status === 'Registration';

  return (
    <div className="tournament-view">
      <div className="tournament-header">
        <div className="tournament-title-section">
          <h1>{tournament.Name}</h1>
          <div className="tournament-meta">
            <span 
              className="status-badge"
              style={{ backgroundColor: `${getStatusColor(tournament.Status)}20`, color: getStatusColor(tournament.Status) }}
            >
              {tournament.Status}
            </span>
            <span className="tournament-type">{tournament.BracketType}</span>
          </div>
        </div>
        
        {canRegister && (
          <div className="tournament-actions">
            <button onClick={handleRegisterTeam} className="btn-primary">
              Register Team
            </button>
            <button onClick={handleJoinTournament} className="btn-secondary">
              Join Tournament
            </button>
          </div>
        )}
      </div>

      <div className="tournament-content">
        <div className="tournament-main">
          {/* Tournament Details */}
          <div className="tournament-details-card">
            <h2>Tournament Details</h2>
            
            <div className="details-grid">
              <div className="detail-item">
                <label>Format</label>
                <span>{tournament.BracketType}</span>
              </div>
              
              <div className="detail-item">
                <label>Match Format</label>
                <span>{tournament.GameFormat}</span>
              </div>
              
              <div className="detail-item">
                <label>Semi Finals</label>
                <span>{tournament.SemiFinalFormat}</span>
              </div>
              
              <div className="detail-item">
                <label>Grand Final</label>
                <span>{tournament.GrandFinalFormat}</span>
              </div>
              
              <div className="detail-item">
                <label>Start Date</label>
                <span>{formatDate(tournament.StartDate)}</span>
              </div>
              
              <div className="detail-item">
                <label>End Date</label>
                <span>{formatDate(tournament.EndDate)}</span>
              </div>
            </div>

            {tournament.Description && (
              <div className="tournament-description">
                <h3>About This Tournament</h3>
                <p>{tournament.Description}</p>
              </div>
            )}
          </div>

          {/* Teams Section */}
          <div className="teams-section">
            <div className="teams-header">
              <h2>Registered Teams</h2>
              <div className="team-progress">
                <span className="team-count">
                  {progress.confirmed} / {progress.total} teams confirmed
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${(progress.confirmed / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {teams.length > 0 ? (
              <div className="teams-grid">
                {teams.map(team => (
                  <div key={team.TeamID} className={`team-card ${team.Confirmed ? 'confirmed' : 'pending'}`}>
                    <div className="team-header">
                      <h3>{team.TeamName}</h3>
                      <span className={`team-status ${team.Confirmed ? 'confirmed' : 'pending'}`}>
                        {team.Confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className="team-info">
                      <span className="team-players">
                        {team.Players?.length || 0} / 5 players
                      </span>
                      {team.Substitutes?.length > 0 && (
                        <span className="team-subs">
                          +{team.Substitutes.length} subs
                        </span>
                      )}
                    </div>
                    
                    {team.TeamLogo && (
                      <img src={team.TeamLogo} alt={`${team.TeamName} logo`} className="team-logo" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-teams">
                <p>No teams registered yet.</p>
                {canRegister && (
                  <p>Be the first to register your team!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tournament Sidebar */}
        <div className="tournament-sidebar">
          {/* Quick Stats */}
          <div className="stats-card">
            <h3>Tournament Stats</h3>
            <div className="stat-item">
              <label>Teams Registered</label>
              <span>{teams.length}</span>
            </div>
            <div className="stat-item">
              <label>Teams Confirmed</label>
              <span>{progress.confirmed}</span>
            </div>
            <div className="stat-item">
              <label>Spots Remaining</label>
              <span>{progress.total - progress.confirmed}</span>
            </div>
            <div className="stat-item">
              <label>Registration</label>
              <span className={tournament.RegistrationOpen ? 'open' : 'closed'}>
                {tournament.RegistrationOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>

          {/* Tournament Rules */}
          <div className="rules-card">
            <h3>Tournament Rules</h3>
            <ul>
              <li>Teams must have 5 confirmed players</li>
              <li>Up to 3 substitute players allowed</li>
              <li>Captains must be available for draft sessions</li>
              <li>All matches use captain's draft format</li>
              <li>No-shows result in automatic forfeit</li>
            </ul>
          </div>

          {/* Tournament Timeline */}
          {isUpcoming && (
            <div className="timeline-card">
              <h3>Tournament Timeline</h3>
              <div className="timeline">
                <div className={`timeline-item ${tournament.Status === 'Planning' ? 'current' : 'completed'}`}>
                  <span className="timeline-marker"></span>
                  <div className="timeline-content">
                    <h4>Planning Phase</h4>
                    <p>Tournament setup and announcement</p>
                  </div>
                </div>
                
                <div className={`timeline-item ${tournament.Status === 'Registration' ? 'current' : tournament.Status === 'Planning' ? 'upcoming' : 'completed'}`}>
                  <span className="timeline-marker"></span>
                  <div className="timeline-content">
                    <h4>Registration Open</h4>
                    <p>Teams can register and confirm rosters</p>
                  </div>
                </div>
                
                <div className={`timeline-item ${tournament.Status === 'In Progress' ? 'current' : 'upcoming'}`}>
                  <span className="timeline-marker"></span>
                  <div className="timeline-content">
                    <h4>Tournament Begins</h4>
                    <p>{formatDate(tournament.StartDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentView;