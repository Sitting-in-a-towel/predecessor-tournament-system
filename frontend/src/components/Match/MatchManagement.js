import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import './MatchManagement.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const MatchManagement = ({ tournamentId, teams, onMatchUpdate }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    team1Id: '',
    team2Id: '',
    round: '',
    matchType: 'Group Stage',
    scheduledTime: ''
  });
  const [resultFormData, setResultFormData] = useState({
    winner: '',
    team1Score: 0,
    team2Score: 0,
    gameLength: '',
    notes: ''
  });

  useEffect(() => {
    if (tournamentId) {
      loadMatches();
    }
  }, [tournamentId]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/matches/tournament/${tournamentId}`, {
        withCredentials: true
      });
      setMatches(response.data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    
    if (createFormData.team1Id === createFormData.team2Id) {
      toast.error('Please select different teams');
      return;
    }

    setLoading(true);
    try {
      const matchData = {
        tournamentId,
        team1Id: createFormData.team1Id,
        team2Id: createFormData.team2Id,
        round: createFormData.round,
        matchType: createFormData.matchType,
        scheduledTime: createFormData.scheduledTime || undefined
      };

      await axios.post(`${API_BASE_URL}/matches`, matchData, {
        withCredentials: true
      });
      
      toast.success('Match created successfully!');
      setShowCreateForm(false);
      setCreateFormData({
        team1Id: '',
        team2Id: '',
        round: '',
        matchType: 'Group Stage',
        scheduledTime: ''
      });
      await loadMatches();
      
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error(error.response?.data?.error || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async (matchId) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/matches/${matchId}/start`, {}, {
        withCredentials: true
      });
      toast.success('Match started!');
      await loadMatches();
      
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error starting match:', error);
      toast.error(error.response?.data?.error || 'Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  const handleReportResult = async (e) => {
    e.preventDefault();
    
    const match = showResultForm;
    if (!match) return;

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/matches/${match.match_id}/result`, resultFormData, {
        withCredentials: true
      });
      toast.success('Match result reported successfully!');
      setShowResultForm(null);
      setResultFormData({
        winner: '',
        team1Score: 0,
        team2Score: 0,
        gameLength: '',
        notes: ''
      });
      await loadMatches();
      
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error reporting result:', error);
      toast.error(error.response?.data?.error || 'Failed to report result');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/matches/${matchId}`, {
        withCredentials: true
      });
      toast.success('Match deleted successfully');
      await loadMatches();
      
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error(error.response?.data?.error || 'Failed to delete match');
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.team_id === teamId);
    return team ? team.team_name : 'Unknown Team';
  };

  const getMatchStatusColor = (status) => {
    const colors = {
      'Scheduled': '#6c757d',
      'In Progress': '#007bff',
      'Completed': '#28a745',
      'Cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleString();
  };

  const confirmedTeams = teams.filter(team => team.status === 'registered' && team.checked_in);

  return (
    <div className="match-management">
      <div className="match-header">
        <h3>Match Management</h3>
        {(user?.role === 'admin' || user?.isAdmin) && (
          <button 
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
            disabled={loading || confirmedTeams.length < 2}
          >
            Create Match
          </button>
        )}
      </div>

      {confirmedTeams.length < 2 && (
        <div className="warning-message">
          <p>⚠️ Need at least 2 confirmed and checked-in teams to create matches</p>
        </div>
      )}

      {/* Matches List */}
      <div className="matches-container">
        {loading && matches.length === 0 ? (
          <div className="loading">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="no-matches">
            <p>No matches created yet.</p>
            {(user?.role === 'admin' || user?.isAdmin) && confirmedTeams.length >= 2 && (
              <p>Create the first match to get the tournament started!</p>
            )}
          </div>
        ) : (
          <div className="matches-list">
            {matches.map((match, index) => (
              <div key={match.match_id || index} className="match-card">
                <div className="match-info">
                  <div className="match-teams">
                    <h4>{match.team1_name} vs {match.team2_name}</h4>
                    <div className="match-details">
                      <span className="match-round">{match.round}</span>
                      <span className="match-type">{match.match_type}</span>
                      <span 
                        className="match-status"
                        style={{ backgroundColor: getMatchStatusColor(match.status) }}
                      >
                        {match.status}
                      </span>
                    </div>
                  </div>
                  
                  {match.status === 'Completed' && (
                    <div className="match-result">
                      <div className="score">
                        {match.team1_score} - {match.team2_score}
                      </div>
                      <div className="winner">
                        Winner: {match.winner === 'team1' ? match.team1_name : match.team2_name}
                      </div>
                    </div>
                  )}
                  
                  <div className="match-time">
                    {match.status === 'Scheduled' && (
                      <span>Scheduled: {formatDateTime(match.scheduled_time)}</span>
                    )}
                    {match.status === 'In Progress' && (
                      <span>Started: {formatDateTime(match.started_at)}</span>
                    )}
                    {match.status === 'Completed' && (
                      <span>Completed: {formatDateTime(match.completed_at)}</span>
                    )}
                  </div>
                </div>

                <div className="match-actions">
                  {match.status === 'Scheduled' && (user?.role === 'admin' || user?.isAdmin) && (
                    <button 
                      className="btn-success"
                      onClick={() => handleStartMatch(match.match_id)}
                      disabled={loading}
                    >
                      Start Match
                    </button>
                  )}
                  
                  {(match.status === 'In Progress' || match.status === 'Scheduled') && (
                    <button 
                      className="btn-primary"
                      onClick={() => {
                        setShowResultForm(match);
                        setResultFormData(prev => ({
                          ...prev,
                          winner: '',
                          team1Score: 0,
                          team2Score: 0
                        }));
                      }}
                      disabled={loading}
                    >
                      Report Result
                    </button>
                  )}
                  
                  {(user?.role === 'admin' || user?.isAdmin) && (
                    <button 
                      className="btn-danger"
                      onClick={() => handleDeleteMatch(match.match_id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Match Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Match</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateMatch} className="modal-content">
              <div className="form-group">
                <label>Team 1</label>
                <select
                  value={createFormData.team1Id}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, team1Id: e.target.value }))}
                  required
                >
                  <option value="">Select Team 1</option>
                  {confirmedTeams.map(team => (
                    <option key={team.team_id} value={team.team_id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Team 2</label>
                <select
                  value={createFormData.team2Id}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, team2Id: e.target.value }))}
                  required
                >
                  <option value="">Select Team 2</option>
                  {confirmedTeams.filter(team => team.team_id !== createFormData.team1Id).map(team => (
                    <option key={team.team_id} value={team.team_id}>
                      {team.team_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Round</label>
                <input
                  type="text"
                  value={createFormData.round}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, round: e.target.value }))}
                  placeholder="e.g., Round 1, Quarterfinal, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Match Type</label>
                <select
                  value={createFormData.matchType}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, matchType: e.target.value }))}
                  required
                >
                  <option value="Group Stage">Group Stage</option>
                  <option value="Quarter Final">Quarter Final</option>
                  <option value="Semi Final">Semi Final</option>
                  <option value="Grand Final">Grand Final</option>
                  <option value="Lower Bracket">Lower Bracket</option>
                </select>
              </div>

              <div className="form-group">
                <label>Scheduled Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={createFormData.scheduledTime}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Result Modal */}
      {showResultForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Report Match Result</h3>
              <button 
                className="modal-close"
                onClick={() => setShowResultForm(null)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleReportResult} className="modal-content">
              <div className="match-teams-display">
                <h4>{showResultForm.team1_name} vs {showResultForm.team2_name}</h4>
              </div>

              <div className="form-group">
                <label>Winner</label>
                <select
                  value={resultFormData.winner}
                  onChange={(e) => setResultFormData(prev => ({ ...prev, winner: e.target.value }))}
                  required
                >
                  <option value="">Select Winner</option>
                  <option value="team1">{showResultForm.team1_name}</option>
                  <option value="team2">{showResultForm.team2_name}</option>
                </select>
              </div>

              <div className="score-inputs">
                <div className="form-group">
                  <label>{showResultForm.team1_name} Score</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={resultFormData.team1Score}
                    onChange={(e) => setResultFormData(prev => ({ ...prev, team1Score: parseInt(e.target.value) }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{showResultForm.team2_name} Score</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={resultFormData.team2Score}
                    onChange={(e) => setResultFormData(prev => ({ ...prev, team2Score: parseInt(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Game Length (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={resultFormData.gameLength}
                  onChange={(e) => setResultFormData(prev => ({ ...prev, gameLength: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={resultFormData.notes}
                  onChange={(e) => setResultFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes about the match..."
                  rows="3"
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowResultForm(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Reporting...' : 'Report Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManagement;