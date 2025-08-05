import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './MatchScoreModal.css';

const MatchScoreModal = ({ match, teams, seriesLength = 1, onSave, onPublish, onClose }) => {
  const [scores, setScores] = useState([]);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize scores array based on series length
    if (match.scores) {
      setScores(match.scores);
    } else {
      const initialScores = Array.from({ length: seriesLength }, (_, i) => ({
        game: i + 1,
        team1Score: '',
        team2Score: '',
        winner: '',
        omedaMatchId: ''
      }));
      setScores(initialScores);
    }

    // Set selected winner if already determined
    if (match.winner) {
      setSelectedWinner(getTeamId(match.winner));
    }
  }, [match, seriesLength]);

  const updateScore = (gameIndex, field, value) => {
    const newScores = [...scores];
    newScores[gameIndex] = {
      ...newScores[gameIndex],
      [field]: value
    };

    // Auto-determine game winner based on scores
    if (field === 'team1Score' || field === 'team2Score') {
      const team1Score = parseInt(field === 'team1Score' ? value : newScores[gameIndex].team1Score) || 0;
      const team2Score = parseInt(field === 'team2Score' ? value : newScores[gameIndex].team2Score) || 0;
      
      if (team1Score > team2Score) {
        newScores[gameIndex].winner = getTeamId(match.team1);
      } else if (team2Score > team1Score) {
        newScores[gameIndex].winner = getTeamId(match.team2);
      } else {
        newScores[gameIndex].winner = '';
      }
    }

    setScores(newScores);

    // Auto-calculate series winner
    calculateSeriesWinner(newScores);
  };

  const calculateSeriesWinner = (currentScores) => {
    const winsNeeded = Math.ceil(seriesLength / 2);
    let team1Wins = 0;
    let team2Wins = 0;

    currentScores.forEach(score => {
      if (score.winner === getTeamId(match.team1)) {
        team1Wins++;
      } else if (score.winner === getTeamId(match.team2)) {
        team2Wins++;
      }
    });

    if (team1Wins >= winsNeeded) {
      setSelectedWinner(getTeamId(match.team1));
    } else if (team2Wins >= winsNeeded) {
      setSelectedWinner(getTeamId(match.team2));
    } else {
      setSelectedWinner('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        matchId: match.id,
        scores,
        winner: selectedWinner,
        status: 'in_progress'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedWinner) {
      toast.error('Please select a match winner before publishing');
      return;
    }

    setSaving(true);
    try {
      await onPublish({
        matchId: match.id,
        scores,
        winner: selectedWinner,
        status: 'completed'
      });
    } finally {
      setSaving(false);
    }
  };

  const getTeamName = (team) => {
    if (!team) return 'TBD';
    if (team === 'bye') return 'BYE';
    if (typeof team === 'string') return team;
    return team.team_name || team;
  };

  const getTeamId = (team) => {
    if (!team) return '';
    if (team === 'bye') return 'bye';
    if (typeof team === 'string') return team;
    return team.team_id || team;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="match-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Match Score Entry</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="match-info">
            <div className="team-vs">
              <span className="team-name">{getTeamName(match.team1)}</span>
              <span className="vs">VS</span>
              <span className="team-name">{getTeamName(match.team2)}</span>
            </div>
            <div className="series-info">
              Best of {seriesLength} Series
            </div>
          </div>

          <div className="games-container">
            {scores.map((score, index) => (
              <div key={index} className="game-entry">
                <h4>Game {score.game}</h4>
                
                <div className="score-inputs">
                  <div className="score-group">
                    <label>{getTeamName(match.team1)}</label>
                    <input
                      type="number"
                      min="0"
                      value={score.team1Score}
                      onChange={(e) => updateScore(index, 'team1Score', e.target.value)}
                      placeholder="Score"
                    />
                  </div>
                  
                  <div className="score-group">
                    <label>{getTeamName(match.team2)}</label>
                    <input
                      type="number"
                      min="0"
                      value={score.team2Score}
                      onChange={(e) => updateScore(index, 'team2Score', e.target.value)}
                      placeholder="Score"
                    />
                  </div>
                </div>

                <div className="game-winner">
                  <label>Game Winner:</label>
                  <select
                    value={score.winner}
                    onChange={(e) => updateScore(index, 'winner', e.target.value)}
                  >
                    <option value="">Select Winner</option>
                    <option value={getTeamId(match.team1)}>
                      {getTeamName(match.team1)}
                    </option>
                    <option value={getTeamId(match.team2)}>
                      {getTeamName(match.team2)}
                    </option>
                  </select>
                </div>

                <div className="omeda-id">
                  <label>Omeda.city Match ID (Optional):</label>
                  <input
                    type="text"
                    value={score.omedaMatchId}
                    onChange={(e) => updateScore(index, 'omedaMatchId', e.target.value)}
                    placeholder="e.g., 123456789"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="series-winner">
            <h4>Series Winner</h4>
            <select
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
              className={selectedWinner ? 'has-winner' : ''}
            >
              <option value="">Select Series Winner</option>
              <option value={getTeamId(match.team1)}>
                {getTeamName(match.team1)}
              </option>
              <option value={getTeamId(match.team2)}>
                {getTeamName(match.team2)}
              </option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
          <button 
            className="btn-publish"
            onClick={handlePublish}
            disabled={saving || !selectedWinner}
          >
            {saving ? 'Publishing...' : 'Publish Results'}
          </button>
          <button 
            className="btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchScoreModal;