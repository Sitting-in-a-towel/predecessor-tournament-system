import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import TeamSignup from '../components/Team/TeamSignup';
import TeamManagement from '../components/Team/TeamManagement';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Teams = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    loadUserTeams();
    
    // Check if we should auto-open team creation (from "Register Team" button)
    if (location.state?.action === 'create') {
      setShowCreateForm(true);
    }
  }, [location.state]);

  const loadUserTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/teams/my-teams`, {
        withCredentials: true
      });
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    setShowCreateForm(true);
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const handleTeamUpdate = () => {
    loadUserTeams();
    if (selectedTeam) {
      // Refresh selected team data
      const updatedTeam = teams.find(team => team.team_id === selectedTeam.team_id);
      setSelectedTeam(updatedTeam);
    }
  };

  const isCaptain = (team) => {
    // For PostgreSQL, we need to check if user is captain differently
    // This will need to be updated when we have proper captain tracking
    return true; // Placeholder - assume user is captain of their teams
  };

  const getTeamStatus = (team) => {
    // For now, assume all teams are confirmed since we set confirmed=true in backend
    if (team.confirmed) {
      return { status: 'confirmed', text: 'Ready to Play', color: 'green' };
    } else {
      return { status: 'incomplete', text: 'Pending confirmation', color: 'orange' };
    }
  };

  if (showCreateForm) {
    return (
      <div className="teams-page">
        <TeamSignup 
          onClose={() => {
            setShowCreateForm(false);
            loadUserTeams();
          }} 
        />
      </div>
    );
  }

  if (selectedTeam) {
    return (
      <div className="teams-page">
        <div className="team-navigation">
          <button 
            className="btn-secondary"
            onClick={() => setSelectedTeam(null)}
          >
            ← Back to Teams
          </button>
        </div>
        <TeamManagement 
          team={selectedTeam}
          onTeamUpdate={handleTeamUpdate}
        />
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="page-header">
        <h1>Team Management</h1>
        <p>Create teams, manage rosters, and invite players to join your tournaments.</p>
      </div>

      <div className="teams-container">
        <div className="teams-actions">
          <button className="btn-primary" onClick={handleCreateTeam}>
            Create New Team
          </button>
          <button className="btn-secondary" onClick={() => navigate('/tournaments')}>
            Browse Tournaments
          </button>
        </div>

        <div className="teams-content">
          {/* My Teams Section */}
          <div className="my-teams-section">
            <h2>My Teams</h2>
            
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">Loading teams...</div>
              </div>
            ) : teams.length > 0 ? (
              <div className="teams-grid">
                {teams.map(team => {
                  const status = getTeamStatus(team);
                  return (
                    <div key={team.team_id} className="team-card">
                      <div className="team-header">
                        <img 
                          src={team.team_logo || '/assets/images/predecessor-default-icon.jpg'} 
                          alt="Team logo" 
                          className="team-logo-small" 
                        />
                        <div className="team-info">
                          <h3>{team.team_name}</h3>
                          <div className="team-meta">
                            {isCaptain(team) && <span className="captain-badge">Captain</span>}
                            <span className={`status-badge ${status.status}`}>
                              {status.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="team-stats">
                        <div className="stat-item">
                          <label>Players</label>
                          <span>1/5</span>
                        </div>
                        <div className="stat-item">
                          <label>Substitutes</label>
                          <span>0/3</span>
                        </div>
                        <div className="stat-item">
                          <label>Status</label>
                          <span className={team.confirmed ? 'confirmed' : 'pending'}>
                            {team.confirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="team-actions">
                        <button 
                          className="btn-primary"
                          onClick={() => handleTeamSelect(team)}
                        >
                          Manage Team
                        </button>
                        {team.tournament_ref_id && (
                          <button 
                            className="btn-secondary"
                            onClick={() => navigate(`/tournaments/${team.tournament_ref_id}`)}
                          >
                            View Tournament
                          </button>
                        )}
                      </div>

                      <div className="team-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: '20%', // 1/5 players
                              backgroundColor: status.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-content">
                  <h3>No Teams Yet</h3>
                  <p>You haven't created or joined any teams yet.</p>
                  <p>Create a team to participate in tournaments!</p>
                  <button className="btn-primary" onClick={handleCreateTeam}>
                    Create Your First Team
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Team Invitations Section */}
          <div className="team-invitations-section">
            <h2>Team Invitations</h2>
            <div className="invitations-list">
              <div className="empty-state">
                <p>No pending invitations.</p>
                <small>Team invitations will appear here when captains invite you to join their teams.</small>
              </div>
            </div>
          </div>

          {/* Player Discovery Section */}
          <div className="player-discovery-section">
            <h2>Looking for Players?</h2>
            <div className="discovery-content">
              <p>Find players who are looking for teams in current tournaments.</p>
              <div className="discovery-actions">
                <button className="btn-secondary">
                  Browse Available Players
                </button>
                <button className="btn-secondary">
                  Post Team Signup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;