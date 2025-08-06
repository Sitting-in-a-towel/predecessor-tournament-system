import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './CoinTossScreen.css';

const CoinTossScreen = ({ draftSession, userRole, onCoinTossChoice }) => {
  const { user } = useAuth();
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Determine which team the user belongs to and if they can make choices
  const getUserTeam = () => {
    // This would need proper team membership checking
    // For now, return based on userRole prop
    return userRole;
  };

  const getTeamId = () => {
    const team = getUserTeam();
    if (team === 'team1') return draftSession.team1_ref_id;
    if (team === 'team2') return draftSession.team2_ref_id;
    return null;
  };

  const canMakeChoice = () => {
    if (hasSubmitted) return false;
    if (draftSession.coin_toss_status !== 'waiting') return false;
    
    const teamId = getTeamId();
    if (!teamId) return false;

    // Check if this team has already made a choice
    if (teamId === draftSession.team1_ref_id && draftSession.team1_coin_choice) {
      return false;
    }
    if (teamId === draftSession.team2_ref_id && draftSession.team2_coin_choice) {
      return false;
    }

    return true;
  };

  const getUnavailableChoice = () => {
    // Return the choice that's already taken by the other team
    if (draftSession.team1_coin_choice) return draftSession.team1_coin_choice;
    if (draftSession.team2_coin_choice) return draftSession.team2_coin_choice;
    return null;
  };

  const handleChoiceSubmit = async (choice) => {
    if (!canMakeChoice()) return;
    
    setSelectedChoice(choice);
    setHasSubmitted(true);
    
    try {
      await onCoinTossChoice(choice, getTeamId());
    } catch (error) {
      setHasSubmitted(false);
      setSelectedChoice(null);
    }
  };

  const renderWaitingForChoice = () => {
    const unavailableChoice = getUnavailableChoice();
    const teamId = getTeamId();
    const isTeam1 = teamId === draftSession.team1_ref_id;
    const teamName = isTeam1 ? draftSession.team1_name : draftSession.team2_name;

    return (
      <div className="coin-toss-selection">
        <h2>Coin Toss</h2>
        <p className="instruction">
          {teamName}, choose heads or tails:
        </p>

        <div className="coin-choices">
          <button
            className={`coin-choice ${selectedChoice === 'heads' ? 'selected' : ''} ${unavailableChoice === 'heads' ? 'unavailable' : ''}`}
            onClick={() => handleChoiceSubmit('heads')}
            disabled={!canMakeChoice() || unavailableChoice === 'heads'}
          >
            <div className="coin heads">
              <div className="coin-face">H</div>
            </div>
            <span>Heads</span>
            {unavailableChoice === 'heads' && (
              <div className="unavailable-badge">Taken by opponent</div>
            )}
          </button>

          <button
            className={`coin-choice ${selectedChoice === 'tails' ? 'selected' : ''} ${unavailableChoice === 'tails' ? 'unavailable' : ''}`}
            onClick={() => handleChoiceSubmit('tails')}
            disabled={!canMakeChoice() || unavailableChoice === 'tails'}
          >
            <div className="coin tails">
              <div className="coin-face">T</div>
            </div>
            <span>Tails</span>
            {unavailableChoice === 'tails' && (
              <div className="unavailable-badge">Taken by opponent</div>
            )}
          </button>
        </div>

        {hasSubmitted && (
          <div className="choice-submitted">
            <p>✓ You chose {selectedChoice}!</p>
            <p>Waiting for opponent's choice...</p>
          </div>
        )}
      </div>
    );
  };

  const renderCoinTossResult = () => {
    const isWinner = draftSession.winner_team_id === (getUserTeam() === 'team1' ? draftSession.team1_id : draftSession.team2_id);
    
    return (
      <div className="coin-toss-result">
        <h2>Coin Toss Result</h2>
        
        <div className="result-display">
          <div className={`result-coin ${draftSession.coin_result}`}>
            <div className="coin-face">
              {draftSession.coin_result === 'heads' ? 'H' : 'T'}
            </div>
          </div>
          <p className="result-text">The coin landed on <strong>{draftSession.coin_result}</strong>!</p>
        </div>

        <div className={`winner-announcement ${isWinner ? 'winner' : 'loser'}`}>
          {isWinner ? (
            <div className="winner-content">
              <h3>🎉 You Won!</h3>
              <p>You get first pick in the draft</p>
              <div className="winner-advantage">
                <span>First Pick Advantage</span>
              </div>
            </div>
          ) : (
            <div className="loser-content">
              <h3>You Lost</h3>
              <p>The opponent gets first pick</p>
              <div className="loser-info">
                <span>You'll pick second</span>
              </div>
            </div>
          )}
        </div>

        <div className="draft-starting">
          <p>Draft phase starting...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  };

  // Show different content based on coin toss status
  switch (draftSession.coin_toss_status) {
    case 'waiting':
    case 'selections_made':
      return renderWaitingForChoice();
    
    case 'completed':
      return renderCoinTossResult();
    
    default:
      return (
        <div className="coin-toss-error">
          <p>Unknown coin toss status: {draftSession.coin_toss_status}</p>
        </div>
      );
  }
};

export default CoinTossScreen;