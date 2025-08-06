import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import TournamentRegistration from '../components/Tournament/TournamentRegistration';
import TournamentCheckIn from '../components/Tournament/TournamentCheckIn';
import TournamentBracket from '../components/Tournament/TournamentBracket';
import TournamentDrafts from '../components/Tournament/TournamentDrafts';
import EditTournamentModal from '../components/Tournament/EditTournamentModal';
import MatchManagement from '../components/Match/MatchManagement';
import { toast } from 'react-toastify';
import './TournamentDetail.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRegistration, setShowRegistration] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadTournamentData();
    }
  }, [id]);

  // Auto-open registration modal if navigated from tournaments page
  useEffect(() => {
    if (location.state?.action === 'register' && tournament && isAuthenticated) {
      setShowRegistration(true);
      // Clear the navigation state to prevent modal from reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, tournament, isAuthenticated]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);
      
      // Load tournament basic info
      const tournamentsResponse = await axios.get(`${API_BASE_URL}/tournaments`, {
        withCredentials: true
      });
      const tournaments = tournamentsResponse.data || [];
      const tournamentData = tournaments.find(t => t.tournament_id === id);
      
      if (!tournamentData) {
        toast.error('Tournament not found');
        navigate('/tournaments');
        return;
      }
      
      setTournament(tournamentData);
      
      // Load registered teams for this tournament
      await loadTournamentTeams(tournamentData.tournament_id);
      
    } catch (error) {
      console.error('Error loading tournament data:', error);
      toast.error('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentTeams = async (tournamentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tournaments/${tournamentId}/registrations`, {
        withCredentials: true
      });
      setTeams(response.data.registrations || []);
    } catch (error) {
      console.error('Error loading tournament teams:', error);
      // Don't show error toast here since it's not critical
    }
  };

  const handleRegisterTeam = () => {
    if (!isAuthenticated) {
      toast.info('Please log in to register a team');
      return;
    }
    setShowRegistration(true);
  };

  const handleEditTournament = () => {
    setShowEditModal(true);
  };

  const canEditTournament = () => {
    if (!isAuthenticated || !user) return false;
    if (user.role === 'admin' || user.isAdmin) return true;
    if (tournament?.created_by === user.id) return true;
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'planning': '#6c757d',
      'registration': '#28a745',
      'in progress': '#007bff',
      'completed': '#6f42c1',
      'cancelled': '#dc3545'
    };
    return statusColors[status?.toLowerCase()] || '#6c757d';
  };

  const canShowCheckIn = () => {
    // Show check-in tab if tournament is approaching or teams need to check in
    return tournament && (
      tournament.status === 'Registration' || 
      tournament.status === 'In Progress' ||
      teams.some(team => team.confirmed && !team.checked_in)
    );
  };

  const canShowMatches = () => {
    // Show matches tab if tournament has started or there are checked-in teams
    return tournament && (
      tournament.status === 'In Progress' ||
      teams.some(team => team.confirmed && team.checked_in)
    );
  };

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.isAdmin);
  };

  const isTeamCaptain = () => {
    if (!user || !teams.length) return false;
    // Check if user is captain of any team in this tournament
    return teams.some(team => team.captain_id === user.id || team.captain_username === user.discord_username);
  };

  if (loading) {
    return (
      <div className="tournament-detail-page">
        <div className="loading-container">
          <div className="loading-spinner">Loading tournament details...</div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="tournament-detail-page">
        <div className="error-container">
          <h2>Tournament Not Found</h2>
          <p>The tournament you're looking for doesn't exist or has been removed.</p>
          <button className="btn-primary" onClick={() => navigate('/tournaments')}>
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-detail-page">
      {/* Tournament Header */}
      <div className="tournament-header">
        <div className="tournament-header-controls">
          <button className="back-button" onClick={() => navigate('/tournaments')}>
            ← Back to Tournaments
          </button>
          {canEditTournament() && (
            <button className="edit-button" onClick={handleEditTournament}>
              ✏️ Edit Tournament
            </button>
          )}
        </div>
        
        <div className="tournament-title-section">
          <h1>{tournament.name}</h1>
          <div className="tournament-meta">
            <span 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(tournament.status) }}
            >
              {tournament.status || 'Unknown'}
            </span>
            <span className="tournament-date">
              {formatDate(tournament.start_date)}
            </span>
          </div>
        </div>

        <div className="tournament-quick-stats">
          <div className="stat-item">
            <label>Format</label>
            <span>{tournament.bracket_type}</span>
          </div>
          <div className="stat-item">
            <label>Teams</label>
            <span>{teams.length}/{tournament.max_teams}</span>
          </div>
          <div className="stat-item">
            <label>Match Type</label>
            <span>{tournament.game_format}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tournament-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams ({teams.length})
        </button>
        {canShowCheckIn() && (
          <button 
            className={`tab ${activeTab === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveTab('checkin')}
          >
            Check-In
          </button>
        )}
        {canShowMatches() && (
          <button 
            className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            Matches
          </button>
        )}
        <button 
          className={`tab ${activeTab === 'bracket' ? 'active' : ''}`}
          onClick={() => setActiveTab('bracket')}
        >
          Bracket
        </button>
        {(isAdmin() || isTeamCaptain()) && (
          <button 
            className={`tab ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            Drafts
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tournament-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="tournament-description">
              <h3>Tournament Details</h3>
              {tournament.description ? (
                <p>{tournament.description}</p>
              ) : (
                <p className="no-description">No description provided for this tournament.</p>
              )}
            </div>

            <div className="tournament-info-grid">
              <div className="info-section">
                <h4>Format Details</h4>
                <div className="info-list">
                  <div className="info-item">
                    <label>Bracket Type:</label>
                    <span>{tournament.bracket_type}</span>
                  </div>
                  <div className="info-item">
                    <label>Game Format:</label>
                    <span>{tournament.game_format}</span>
                  </div>
                  <div className="info-item">
                    <label>Quarter Finals:</label>
                    <span>{tournament.quarter_final_format || tournament.game_format}</span>
                  </div>
                  <div className="info-item">
                    <label>Semi Finals:</label>
                    <span>{tournament.semi_final_format || tournament.game_format}</span>
                  </div>
                  <div className="info-item">
                    <label>Grand Final:</label>
                    <span>{tournament.grand_final_format || tournament.game_format}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>Registration</h4>
                <div className="info-list">
                  <div className="info-item">
                    <label>Status:</label>
                    <span className={tournament.registration_open ? 'open' : 'closed'}>
                      {tournament.registration_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Max Teams:</label>
                    <span>{tournament.max_teams}</span>
                  </div>
                  <div className="info-item">
                    <label>Current Teams:</label>
                    <span>{teams.length}</span>
                  </div>
                  <div className="info-item">
                    <label>Confirmed Teams:</label>
                    <span>{teams.filter(team => team.confirmed).length}</span>
                  </div>
                </div>
              </div>
            </div>

            {isAuthenticated && tournament.registration_open && tournament.status === 'Registration' && (
              <div className="registration-section">
                <h4>Join Tournament</h4>
                <p>Ready to compete? Register your team for this tournament.</p>
                <button className="btn-primary" onClick={handleRegisterTeam}>
                  Register Team
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="teams-tab">
            <h3>Registered Teams</h3>
            {teams.length === 0 ? (
              <div className="no-teams">
                <p>No teams have registered for this tournament yet.</p>
                {isAuthenticated && tournament.registration_open && (
                  <button className="btn-primary" onClick={handleRegisterTeam}>
                    Be the First to Register
                  </button>
                )}
              </div>
            ) : (
              <div className="teams-grid">
                {teams.map((team, index) => (
                  <div key={team.team_id || team.id || index} className="team-card">
                    <div className="team-header">
                      {team.team_logo && (
                        <img src={team.team_logo} alt="Team logo" className="team-logo" />
                      )}
                      <div>
                        <h4>{team.team_name}</h4>
                        <p className="team-captain">Captain: {team.captain_username}</p>
                        <span className={`team-status ${team.status === 'registered' ? 'confirmed' : 'pending'}`}>
                          {team.status === 'registered' ? 'Registered' : team.status}
                        </span>
                      </div>
                    </div>
                    <div className="team-stats">
                      <span>Registered: {new Date(team.registered_date).toLocaleDateString()}</span>
                      {team.checked_in && (
                        <span className="checked-in">✅ Checked In</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'checkin' && canShowCheckIn() && (
          <div className="checkin-tab">
            <TournamentCheckIn 
              tournamentId={id}
              onStatusUpdate={loadTournamentData}
            />
          </div>
        )}

        {activeTab === 'matches' && canShowMatches() && (
          <div className="matches-tab">
            <MatchManagement 
              tournamentId={id}
              teams={teams}
              onMatchUpdate={loadTournamentData}
            />
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="bracket-tab">
            <TournamentBracket 
              tournamentId={id}
              onBracketUpdate={loadTournamentData}
            />
          </div>
        )}

        {activeTab === 'drafts' && (isAdmin() || isTeamCaptain()) && (
          <div className="drafts-tab">
            <TournamentDrafts 
              tournamentId={id}
              tournament={tournament}
              teams={teams}
              isAdmin={isAdmin()}
              isTeamCaptain={isTeamCaptain()}
              user={user}
            />
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegistration && (
        <div className="modal-overlay">
          <div className="modal">
            <button 
              className="modal-close"
              onClick={() => setShowRegistration(false)}
            >
              ×
            </button>
            <TournamentRegistration 
              tournament={tournament}
              onClose={() => {
                setShowRegistration(false);
                loadTournamentData(); // Refresh data after registration
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Tournament Modal */}
      {showEditModal && (
        <EditTournamentModal 
          tournament={tournament}
          onClose={() => setShowEditModal(false)}
          onTournamentUpdated={(updatedTournament) => {
            setTournament(updatedTournament);
            loadTournamentData(); // Refresh all data
          }}
        />
      )}
    </div>
  );
};

export default TournamentDetail;