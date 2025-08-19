import React from 'react';
import './WaitingModal.css';

const WaitingModal = ({ 
  isVisible, 
  presentCount = 0, 
  totalNeeded = 2, 
  team1Connected = false, 
  team2Connected = false,
  message = "Waiting for other captain to join...",
  sessionId 
}) => {
  if (!isVisible) return null;

  return (
    <div className="waiting-modal-overlay">
      <div className="waiting-modal">
        <div className="waiting-modal-header">
          <h2>Draft Session</h2>
          <div className="session-id">Session: {sessionId}</div>
        </div>
        
        <div className="waiting-modal-content">
          <div className="waiting-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-text">Waiting...</div>
          </div>
          
          <h3>{message}</h3>
          
          <div className="captain-status">
            <div className="captain-status-header">Captain Status:</div>
            
            <div className="captain-indicators">
              <div className={`captain-indicator ${team1Connected ? 'connected' : 'disconnected'}`}>
                <div className="captain-dot"></div>
                <span>Team 1 Captain</span>
                {team1Connected && <span className="status-label">Connected</span>}
                {!team1Connected && <span className="status-label">Waiting...</span>}
              </div>
              
              <div className={`captain-indicator ${team2Connected ? 'connected' : 'disconnected'}`}>
                <div className="captain-dot"></div>
                <span>Team 2 Captain</span>
                {team2Connected && <span className="status-label">Connected</span>}
                {!team2Connected && <span className="status-label">Waiting...</span>}
              </div>
            </div>
          </div>
          
          <div className="connection-progress">
            <div className="progress-label">
              {presentCount} of {totalNeeded} captains connected
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(presentCount / totalNeeded) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="waiting-instructions">
            <p>📋 Both team captains must join the draft session before the coin toss can begin.</p>
            <p>🔗 Share this URL with the other captain if needed:</p>
            <div className="url-share">
              {window.location.href}
            </div>
          </div>
        </div>
        
        <div className="waiting-modal-footer">
          <div className="connection-status">
            {presentCount === 0 && "No captains connected yet"}
            {presentCount === 1 && "Waiting for second captain..."}
            {presentCount === 2 && "All captains connected! Starting coin toss..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingModal;