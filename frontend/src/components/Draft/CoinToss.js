import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './CoinToss.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const CoinToss = ({ draftSession, userRole, draftId }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [bothTeamsConnected, setBothTeamsConnected] = useState(false);
  const [choicesEnabled, setChoicesEnabled] = useState(false);
  const [team1Choice, setTeam1Choice] = useState(null);
  const [team2Choice, setTeam2Choice] = useState(null);
  const [coinResult, setCoinResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [phase, setPhase] = useState('waiting'); // waiting, choosing, flipping, complete
  const [statusMessage, setStatusMessage] = useState('Connecting to draft...');

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      withCredentials: true
    });

    setSocket(newSocket);

    // Join the draft room
    newSocket.emit('join-draft', draftId);

    // Connect to the draft
    connectToDraft();

    // Socket event listeners
    newSocket.on('captain-connected', (data) => {
      console.log('Captain connected:', data);
      if (data.bothConnected) {
        setBothTeamsConnected(true);
        setPhase('countdown');
        setStatusMessage('Both teams connected! Coin choices available in 2 seconds...');
      } else {
        setStatusMessage(`Waiting for other team... (${data.teamName} connected)`);
      }
    });

    newSocket.on('both-teams-connected', (data) => {
      console.log('Both teams connected:', data);
      setBothTeamsConnected(true);
      setPhase('countdown');
      setStatusMessage(data.message);
      
      // Start countdown
      let count = 2;
      const countdownInterval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownInterval);
          setChoicesEnabled(true);
          setPhase('choosing');
          setStatusMessage('Choose heads or tails!');
          setCountdown(null);
        }
      }, 1000);
    });

    newSocket.on('coin-choice-made', (data) => {
      console.log('Coin choice made:', data);
      if (data.team === 'team1') {
        setTeam1Choice(data.choice);
      } else {
        setTeam2Choice(data.choice);
      }
      
      if (data.bothChosen) {
        setPhase('flipping');
        setStatusMessage('Both teams have chosen! Flipping coin...');
      } else {
        setStatusMessage(`${data.teamName} chose ${data.choice}. Waiting for other team...`);
      }
    });

    newSocket.on('coin-toss-complete', (data) => {
      console.log('Coin toss complete:', data);
      setCoinResult(data.result);
      setWinner(data.winner);
      setTeam1Choice(data.team1Choice);
      setTeam2Choice(data.team2Choice);
      setPhase('complete');
      setStatusMessage(`Coin landed on ${data.result}! ${data.winnerTeamName} wins and gets first pick!`);
      
      // After 3 seconds, the draft will automatically progress to ban phase
      setTimeout(() => {
        setStatusMessage('Proceeding to ban phase...');
      }, 3000);
    });

    return () => {
      newSocket.emit('leave-draft', draftId);
      newSocket.disconnect();
    };
  }, [draftId]);

  const connectToDraft = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/draft/${draftId}/connect`, {}, {
        withCredentials: true
      });
      
      console.log('Connected to draft:', response.data);
      setConnectionStatus('connected');
      
      if (response.data.bothConnected) {
        setBothTeamsConnected(true);
        setPhase('countdown');
      } else {
        setPhase('waiting');
        setStatusMessage('Waiting for other team to connect...');
      }
    } catch (error) {
      console.error('Error connecting to draft:', error);
      setConnectionStatus('error');
      setStatusMessage('Failed to connect to draft');
    }
  };

  const chooseCoinSide = async (choice) => {
    if (!choicesEnabled || phase !== 'choosing') return;
    
    // Check if choice is available
    const otherTeamChoice = userRole === 'captain1' ? team2Choice : team1Choice;
    if (otherTeamChoice === choice) {
      return; // Choice already taken
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/draft/${draftId}/coin-choice`, {
        choice: choice
      }, {
        withCredentials: true
      });
      
      console.log('Coin choice made:', response.data);
      
      // Update local state immediately
      if (userRole === 'captain1') {
        setTeam1Choice(choice);
      } else {
        setTeam2Choice(choice);
      }
      
    } catch (error) {
      console.error('Error making coin choice:', error);
      if (error.response?.data?.error) {
        setStatusMessage(`Error: ${error.response.data.error}`);
      }
    }
  };

  const isChoiceDisabled = (choice) => {
    if (!choicesEnabled || phase !== 'choosing') return true;
    
    // Disable if other team chose this option
    const otherTeamChoice = userRole === 'captain1' ? team2Choice : team1Choice;
    return otherTeamChoice === choice;
  };

  const getMyChoice = () => {
    return userRole === 'captain1' ? team1Choice : team2Choice;
  };

  const renderWaitingScreen = () => (
    <div className="coin-toss-waiting">
      <div className="waiting-content">
        <div className="spinner"></div>
        <h3>Waiting for Teams to Connect</h3>
        <p>{statusMessage}</p>
        
        <div className="team-status">
          <div className={`team-indicator ${draftSession.team1_connected ? 'connected' : 'waiting'}`}>
            <span className="team-name">{draftSession.team1_name}</span>
            <span className="status">{draftSession.team1_connected ? 'Connected' : 'Waiting...'}</span>
          </div>
          <div className={`team-indicator ${draftSession.team2_connected ? 'connected' : 'waiting'}`}>
            <span className="team-name">{draftSession.team2_name}</span>
            <span className="status">{draftSession.team2_connected ? 'Connected' : 'Waiting...'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCountdown = () => (
    <div className="coin-toss-countdown">
      <div className="countdown-content">
        <h3>Both Teams Connected!</h3>
        <p>{statusMessage}</p>
        {countdown !== null && (
          <div className="countdown-timer">
            <span className="countdown-number">{countdown}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderCoinChoice = () => (
    <div className="coin-toss-choice">
      <div className="choice-header">
        <h3>Choose Your Side</h3>
        <p>{statusMessage}</p>
      </div>
      
      <div className="coin-buttons">
        <button
          className={`coin-button heads ${getMyChoice() === 'heads' ? 'selected' : ''} ${isChoiceDisabled('heads') ? 'disabled' : ''}`}
          onClick={() => chooseCoinSide('heads')}
          disabled={isChoiceDisabled('heads')}
        >
          <div className="coin heads-coin">
            <span>HEADS</span>
          </div>
          {team1Choice === 'heads' && <div className="team-label">{draftSession.team1_name}</div>}
          {team2Choice === 'heads' && <div className="team-label">{draftSession.team2_name}</div>}
        </button>
        
        <div className="vs-separator">VS</div>
        
        <button
          className={`coin-button tails ${getMyChoice() === 'tails' ? 'selected' : ''} ${isChoiceDisabled('tails') ? 'disabled' : ''}`}
          onClick={() => chooseCoinSide('tails')}
          disabled={isChoiceDisabled('tails')}
        >
          <div className="coin tails-coin">
            <span>TAILS</span>
          </div>
          {team1Choice === 'tails' && <div className="team-label">{draftSession.team1_name}</div>}
          {team2Choice === 'tails' && <div className="team-label">{draftSession.team2_name}</div>}
        </button>
      </div>
      
      <div className="choice-status">
        <div className="team-choices">
          <div className="team-choice">
            <span className="team-name">{draftSession.team1_name}:</span>
            <span className="choice">{team1Choice || 'Not chosen'}</span>
          </div>
          <div className="team-choice">
            <span className="team-name">{draftSession.team2_name}:</span>
            <span className="choice">{team2Choice || 'Not chosen'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCoinFlip = () => (
    <div className="coin-toss-flipping">
      <div className="flipping-content">
        <h3>Flipping Coin...</h3>
        <div className="coin-animation">
          <div className="flipping-coin"></div>
        </div>
        <p>Both teams have made their choices!</p>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="coin-toss-result">
      <div className="result-content">
        <h3>Coin Toss Complete!</h3>
        
        <div className="coin-result">
          <div className={`final-coin ${coinResult}`}>
            <span>{coinResult?.toUpperCase()}</span>
          </div>
          <p className="result-text">The coin landed on <strong>{coinResult}</strong>!</p>
        </div>
        
        <div className="winner-announcement">
          <h4>{winner === 'team1' ? draftSession.team1_name : draftSession.team2_name} Wins!</h4>
          <p>They get first pick in the draft.</p>
        </div>
        
        <div className="transparency-info">
          <h5>Selection Summary:</h5>
          <div className="selections">
            <div className="selection">
              <span className="team">{draftSession.team1_name}</span>
              <span className="chose">chose</span>
              <span className="choice">{team1Choice}</span>
              <span className={`result ${team1Choice === coinResult ? 'win' : 'lose'}`}>
                {team1Choice === coinResult ? '✓' : '✗'}
              </span>
            </div>
            <div className="selection">
              <span className="team">{draftSession.team2_name}</span>
              <span className="chose">chose</span>
              <span className="choice">{team2Choice}</span>
              <span className={`result ${team2Choice === coinResult ? 'win' : 'lose'}`}>
                {team2Choice === coinResult ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render logic
  if (connectionStatus === 'error') {
    return (
      <div className="coin-toss-error">
        <h3>Connection Error</h3>
        <p>{statusMessage}</p>
        <button onClick={connectToDraft}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="coin-toss-container">
      {phase === 'waiting' && renderWaitingScreen()}
      {phase === 'countdown' && renderCountdown()}
      {phase === 'choosing' && renderCoinChoice()}
      {phase === 'flipping' && renderCoinFlip()}
      {phase === 'complete' && renderResult()}
    </div>
  );
};

export default CoinToss;