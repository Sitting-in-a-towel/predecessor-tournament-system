import React from 'react';
import './DraftTimer.css';

const DraftTimer = ({ timeRemaining, isActive }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (!isActive) return 'inactive';
    if (timeRemaining <= 5) return 'critical';
    if (timeRemaining <= 10) return 'warning';
    return 'active';
  };

  return (
    <div className={`draft-timer ${getTimerClass()}`}>
      <div className="timer-circle">
        <div className="timer-text">
          {isActive ? formatTime(timeRemaining) : '--:--'}
        </div>
        {isActive && (
          <svg className="timer-ring" width="80" height="80">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 35}`}
              strokeDashoffset={`${2 * Math.PI * 35 * (1 - (timeRemaining / 30))}`}
              transform="rotate(-90 40 40)"
            />
          </svg>
        )}
      </div>
      
      <div className="timer-label">
        {isActive ? 'Time Left' : 'Waiting'}
      </div>
    </div>
  );
};

export default DraftTimer;