import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { airtableService } from '../services/airtableService';
import TeamSignup from '../components/Team/TeamSignup';
import TeamManagement from '../components/Team/TeamManagement';
import { toast } from 'react-toastify';

const Teams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    loadUserTeams();
  }, []);

  const loadUserTeams = async () => {
    try {
      setLoading(true);
      const userTeams = await airtableService.getMyTeams();
      setTeams(userTeams || []);
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
      const updatedTeam = teams.find(team => team.TeamID === selectedTeam.TeamID);
      setSelectedTeam(updatedTeam);
    }
  };

  const isCaptain = (team) => {
    return user && team.Captain?.includes(user.userID);
  };

  const getTeamStatus = (team) => {
    const playerCount = team.Players?.length || 0;
    
    if (team.Confirmed) {
      return { status: 'confirmed', text: 'Ready to Play', color: 'green' };
    } else if (playerCount >= 5) {
      return { status: 'ready', text: 'Ready to Confirm', color: 'orange' };
    } else {
      return { status: 'incomplete', text: `Need ${5 - playerCount} more players`, color: 'red' };
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
                    <div key={team.TeamID} className="team-card">
                      <div className="team-header">
                        <img 
                          src={team.TeamLogo || '/assets/images/predecessor-default-icon.jpg'} 
                          alt="Team logo" 
                          className="team-logo-small" 
                        />
                        <div className="team-info">
                          <h3>{team.TeamName}</h3>
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
                          <span>{team.Players?.length || 0}/5</span>
                        </div>
                        <div className="stat-item">
                          <label>Substitutes</label>
                          <span>{team.Substitutes?.length || 0}/3</span>
                        </div>
                        <div className="stat-item">
                          <label>Status</label>
                          <span className={team.Confirmed ? 'confirmed' : 'pending'}>
                            {team.Confirmed ? 'Confirmed' : 'Pending'}
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
                        {team.Tournament && (
                          <button 
                            className="btn-secondary"
                            onClick={() => navigate(`/tournaments/${team.Tournament[0]}`)}
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
                              width: `${Math.min(((team.Players?.length || 0) / 5) * 100, 100)}%`,
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