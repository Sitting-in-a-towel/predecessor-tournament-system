import React, { useState, useEffect } from 'react';
import HeroGrid from './HeroGrid';
import DraftTimer from './DraftTimer';
import './DraftScreen.css';

const DraftScreen = ({ draftSession, heroes, userRole, matchId }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (draftSession.turn_timer_end) {
      const timer = setInterval(() => {
        const now = new Date();
        const endTime = new Date(draftSession.turn_timer_end);
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [draftSession.turn_timer_end]);

  const isUserTurn = () => {
    const currentTeamId = draftSession.current_turn_team_id;
    if (userRole === 'team1') {
      return currentTeamId === draftSession.team1_id;
    } else if (userRole === 'team2') {
      return currentTeamId === draftSession.team2_id;
    }
    return false;
  };

  const getCurrentTeamName = () => {
    const currentTeamId = draftSession.current_turn_team_id;
    if (currentTeamId === draftSession.team1_id) {
      return draftSession.team1_name;
    } else if (currentTeamId === draftSession.team2_id) {
      return draftSession.team2_name;
    }
    return 'Unknown';
  };

  const getPhaseAction = () => {
    const phase = draftSession.current_phase;
    if (phase.startsWith('ban')) {
      return 'Ban';
    } else if (phase.startsWith('pick')) {
      return 'Pick';
    }
    return phase;
  };

  return (
    <div className="draft-screen">
      <div className="draft-status">
        <div className="phase-info">
          <h2>{getPhaseAction()} Phase</h2>
          <p className="turn-indicator">
            {isUserTurn() ? (
              <span className="your-turn">Your turn to {getPhaseAction().toLowerCase()}</span>
            ) : (
              <span className="opponent-turn">{getCurrentTeamName()}'s turn to {getPhaseAction().toLowerCase()}</span>
            )}
          </p>
        </div>
        
        <DraftTimer 
          timeRemaining={timeRemaining}
          isActive={timeRemaining > 0}
        />
      </div>

      <div className="draft-boards">
        <div className="team-board team1">
          <h3>{draftSession.team1_name}</h3>
          <div className="picks-bans">
            <div className="bans">
              <h4>Bans</h4>
              <div className="hero-slots">
                {draftSession.team1_bans?.map((ban, index) => (
                  <div key={index} className="hero-slot banned">
                    {ban.hero_name}
                  </div>
                ))}
              </div>
            </div>
            <div className="picks">
              <h4>Picks</h4>
              <div className="hero-slots">
                {draftSession.team1_picks?.map((pick, index) => (
                  <div key={index} className="hero-slot picked">
                    {pick.hero_name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="team-board team2">
          <h3>{draftSession.team2_name}</h3>
          <div className="picks-bans">
            <div className="bans">
              <h4>Bans</h4>
              <div className="hero-slots">
                {draftSession.team2_bans?.map((ban, index) => (
                  <div key={index} className="hero-slot banned">
                    {ban.hero_name}
                  </div>
                ))}
              </div>
            </div>
            <div className="picks">
              <h4>Picks</h4>
              <div className="hero-slots">
                {draftSession.team2_picks?.map((pick, index) => (
                  <div key={index} className="hero-slot picked">
                    {pick.hero_name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <HeroGrid
        heroes={heroes}
        bannedHeroes={[...draftSession.team1_bans, ...draftSession.team2_bans]}
        pickedHeroes={[...draftSession.team1_picks, ...draftSession.team2_picks]}
        isUserTurn={isUserTurn()}
        currentAction={getPhaseAction()}
        onHeroSelect={(hero) => {
          // This will be implemented to handle hero selection
          console.log('Hero selected:', hero);
        }}
      />
    </div>
  );
};

export default DraftScreen;