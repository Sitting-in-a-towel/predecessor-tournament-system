import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import './RaceCoinToss.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const RaceCoinToss = ({ draftSession, userRole, draftId }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [phase, setPhase] = useState('selection'); // selection, result, order_choice
  const [myChoice, setMyChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [coinResult, setCoinResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [pickOrder, setPickOrder] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001', {
      withCredentials: true
    });

    setSocket(newSocket);
    newSocket.emit('join-draft', draftId);

    // Socket listeners for enhanced coin toss updates
    newSocket.on('coin-toss-choice-made', (data) => {
      console.log('Coin toss choice made:', data);
      
      if (data.teamNumber === 1) {
        if (userRole === 'team2') {
          setOpponentChoice(data.choice);
          disableChoice(data.choice);
        } else {
          setMyChoice(data.choice);
        }
      } else {
        if (userRole === 'team1') {
          setOpponentChoice(data.choice);
          disableChoice(data.choice);
        } else {
          setMyChoice(data.choice);
        }
      }
    });

    newSocket.on('coin-toss-complete', (data) => {
      console.log('Coin toss completed:', data);
      setCoinResult(data.result);
      setWinner(data.winner);
      setPhase('result');
      
      setTimeout(() => {
        if (data.winner === userRole) {
          setPhase('order_choice');
        } else {
          setPhase('waiting_for_order');
        }
      }, 3000);
    });

    newSocket.on('coin-toss-error', (data) => {
      console.error('Coin toss error:', data);
      alert(data.message); // Simple error handling
    });

    newSocket.on('pick-order-chosen', (data) => {
      setPickOrder(data.order);
      setPhase('complete');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [draftId, userRole]);

  const selectCoinSide = (choice) => {
    if (myChoice || opponentChoice === choice || !socket) return;
    
    console.log(`Selecting coin side: ${choice}`);
    
    // Get team number from userRole
    const teamNumber = userRole === 'team1' ? 1 : 2;
    
    // Send choice via WebSocket for real-time race logic with userId
    socket.emit('coin-toss-selection', {
      sessionId: draftId,
      userId: user?.id || `browser_${Date.now()}_team${teamNumber}`,
      choice: choice.toUpperCase()
    });
  };

  const selectPickOrder = async (order) => {
    if (winner !== userRole) return;
    
    try {
      await axios.post(`${API_BASE_URL}/draft/${draftId}/pick-order`, {
        order: order // 'first' or 'second'
      }, {
        withCredentials: true
      });
      
      setPickOrder(order);
      setPhase('complete');
    } catch (error) {
      console.error('Error selecting pick order:', error);
    }
  };

  const disableChoice = (choice) => {
    // Visual feedback that option is taken
    const button = document.querySelector(`.coin-button.${choice}`);
    if (button) {
      button.classList.add('disabled');
    }
  };

  const renderSelectionPhase = () => (
    <div className="race-coin-selection">
      <h2>Heads or tails?</h2>
      <p>Be quick! First to choose gets their pick.</p>
      
      <div className="coin-choices">
        <button
          className={`coin-button heads ${myChoice === 'heads' ? 'selected' : ''} ${opponentChoice === 'heads' ? 'disabled' : ''}`}
          onClick={() => selectCoinSide('heads')}
          disabled={myChoice || opponentChoice === 'heads'}
        >
          <div className="coin-face heads-face">
            HEADS
          </div>
        </button>
        
        <button
          className={`coin-button tails ${myChoice === 'tails' ? 'selected' : ''} ${opponentChoice === 'tails' ? 'disabled' : ''}`}
          onClick={() => selectCoinSide('tails')}
          disabled={myChoice || opponentChoice === 'tails'}
        >
          <div className="coin-face tails-face">
            TAILS
          </div>
        </button>
      </div>
      
      {myChoice && (
        <p className="choice-confirmation">
          You chose <strong>{myChoice}</strong>. Opponent gets <strong>{opponentChoice}</strong>.
        </p>
      )}
    </div>
  );

  const renderResultPhase = () => (
    <div className="coin-result-display">
      <div className={`coin-animation ${coinResult}`}>
        <div className="coin-3d">
          {coinResult?.toUpperCase()}
        </div>
      </div>
      
      <h2>Coin flip result: {coinResult}</h2>
      <p className="winner-text">
        {winner === userRole ? 'You won!' : `${winner === 'team1' ? draftSession.team1_name : draftSession.team2_name} won!`}
      </p>
    </div>
  );

  const renderOrderChoice = () => (
    <div className="order-choice">
      <h2>You won the coin toss!</h2>
      <p>Choose your draft order:</p>
      
      <div className="order-buttons">
        <button
          className="order-button"
          onClick={() => selectPickOrder('first')}
        >
          Pick First
        </button>
        <button
          className="order-button"
          onClick={() => selectPickOrder('second')}
        >
          Pick Second
        </button>
      </div>
    </div>
  );

  const renderWaitingForOrder = () => (
    <div className="waiting-for-order">
      <h2>Coin flip result: {coinResult}</h2>
      <p>Wait for your opponent to choose the draft's order</p>
    </div>
  );

  const renderComplete = () => (
    <div className="coin-toss-complete">
      <h2>Coin Toss Complete</h2>
      <p>{winner === 'team1' ? draftSession.team1_name : draftSession.team2_name} will pick {pickOrder}</p>
      <p>Proceeding to draft...</p>
    </div>
  );

  return (
    <div className="race-coin-toss-container">
      {phase === 'selection' && renderSelectionPhase()}
      {phase === 'result' && renderResultPhase()}
      {phase === 'order_choice' && renderOrderChoice()}
      {phase === 'waiting_for_order' && renderWaitingForOrder()}
      {phase === 'complete' && renderComplete()}
    </div>
  );
};

export default RaceCoinToss;