import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { airtableService } from '../../services/airtableService';
import { toast } from 'react-toastify';
import './MatchManagement.css';

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
      const matchData = await airtableService.getTournamentMatches(tournamentId);
      setMatches(matchData);
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

      await airtableService.createMatch(matchData);
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
      await airtableService.startMatch(matchId);
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
      await airtableService.reportMatchResult(match.MatchID, resultFormData);
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
      await airtableService.deleteMatch(matchId);
      toast.success('Match deleted successfully');
      await loadMatches();
      
      if (onMatchUpdate) onMatchUpdate();
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.TeamID === teamId);
    return team ? team.TeamName : 'Unknown Team';
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

  const confirmedTeams = teams.filter(team => team.Confirmed && team.CheckedIn);

  return (
    <div className="match-management">
      <div className="match-header">
        <h3>Match Management</h3>
        {user?.isAdmin && (
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
            {user?.isAdmin && confirmedTeams.length >= 2 && (
              <p>Create the first match to get the tournament started!</p>
            )}
          </div>
        ) : (
          <div className="matches-list">
            {matches.map((match, index) => (
              <div key={match.MatchID || index} className="match-card">
                <div className="match-info">
                  <div className="match-teams">
                    <h4>{getTeamName(match.Team1)} vs {getTeamName(match.Team2)}</h4>
                    <div className="match-details">
                      <span className="match-round">{match.Round}</span>
                      <span className="match-type">{match.MatchType}</span>
                      <span 
                        className="match-status"
                        style={{ backgroundColor: getMatchStatusColor(match.Status) }}
                      >
                        {match.Status}
                      </span>
                    </div>
                  </div>
                  
                  {match.Status === 'Completed' && (
                    <div className="match-result">
                      <div className="score">
                        {match.Team1Score} - {match.Team2Score}
                      </div>
                      <div className="winner">
                        Winner: {match.Winner === 'team1' ? getTeamName(match.Team1) : getTeamName(match.Team2)}
                      </div>
                    </div>
                  )}
                  
                  <div className="match-time">
                    {match.Status === 'Scheduled' && (
                      <span>Scheduled: {formatDateTime(match.ScheduledTime)}</span>
                    )}
                    {match.Status === 'In Progress' && (
                      <span>Started: {formatDateTime(match.StartedAt)}</span>
                    )}
                    {match.Status === 'Completed' && (
                      <span>Completed: {formatDateTime(match.CompletedAt)}</span>
                    )}
                  </div>
                </div>

                <div className="match-actions">
                  {match.Status === 'Scheduled' && user?.isAdmin && (
                    <button 
                      className="btn-success"
                      onClick={() => handleStartMatch(match.MatchID)}
                      disabled={loading}
                    >
                      Start Match
                    </button>
                  )}
                  
                  {(match.Status === 'In Progress' || match.Status === 'Scheduled') && (
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
                  
                  {user?.isAdmin && (
                    <button 
                      className="btn-danger"
                      onClick={() => handleDeleteMatch(match.MatchID)}
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
                    <option key={team.TeamID} value={team.TeamID}>
                      {team.TeamName}
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
                  {confirmedTeams.filter(team => team.TeamID !== createFormData.team1Id).map(team => (
                    <option key={team.TeamID} value={team.TeamID}>
                      {team.TeamName}
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
                <h4>{getTeamName(showResultForm.Team1)} vs {getTeamName(showResultForm.Team2)}</h4>
              </div>

              <div className="form-group">
                <label>Winner</label>
                <select
                  value={resultFormData.winner}
                  onChange={(e) => setResultFormData(prev => ({ ...prev, winner: e.target.value }))}
                  required
                >
                  <option value="">Select Winner</option>
                  <option value="team1">{getTeamName(showResultForm.Team1)}</option>
                  <option value="team2">{getTeamName(showResultForm.Team2)}</option>
                </select>
              </div>

              <div className="score-inputs">
                <div className="form-group">
                  <label>{getTeamName(showResultForm.Team1)} Score</label>
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
                  <label>{getTeamName(showResultForm.Team2)} Score</label>
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