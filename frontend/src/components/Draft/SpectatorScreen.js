import React from 'react';
import HeroGrid from './HeroGrid';
import DraftTimer from './DraftTimer';
import './SpectatorScreen.css';

const SpectatorScreen = ({ draftSession, heroes, phase }) => {
  if (phase === 'coin_toss') {
    return (
      <div className="spectator-screen coin-toss">
        <div className="spectator-header">
          <h2>👁️ Spectator Mode - Coin Toss</h2>
        </div>

        <div className="coin-toss-spectator">
          <h3>Teams are choosing heads or tails...</h3>
          
          <div className="team-choices">
            <div className="team-choice-status">
              <h4>{draftSession.team1_name}</h4>
              <div className="choice-status">
                {draftSession.team1_coin_choice ? (
                  <span className="chosen">Chose {draftSession.team1_coin_choice}</span>
                ) : (
                  <span className="waiting">Choosing...</span>
                )}
              </div>
            </div>

            <div className="vs-divider">VS</div>

            <div className="team-choice-status">
              <h4>{draftSession.team2_name}</h4>
              <div className="choice-status">
                {draftSession.team2_coin_choice ? (
                  <span className="chosen">Chose {draftSession.team2_coin_choice}</span>
                ) : (
                  <span className="waiting">Choosing...</span>
                )}
              </div>
            </div>
          </div>

          {draftSession.coin_toss_status === 'completed' && (
            <div className="coin-result">
              <h3>Coin Result: {draftSession.coin_result}</h3>
              <p className="winner">
                {draftSession.winner_team_name} wins the coin toss and gets first pick!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="spectator-screen completed">
        <div className="spectator-header">
          <h2>👁️ Spectator Mode - Draft Completed</h2>
        </div>

        <div className="draft-results">
          <h3>Final Draft Results</h3>
          
          <div className="team-results">
            <div className="team-result">
              <h4>{draftSession.team1_name}</h4>
              <div className="final-picks">
                {draftSession.team1_picks?.map((pick, index) => (
                  <div key={index} className="final-pick">
                    {pick.hero_name} ({pick.hero_role})
                  </div>
                ))}
              </div>
            </div>

            <div className="team-result">
              <h4>{draftSession.team2_name}</h4>
              <div className="final-picks">
                {draftSession.team2_picks?.map((pick, index) => (
                  <div key={index} className="final-pick">
                    {pick.hero_name} ({pick.hero_role})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Drafting phase spectator view
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
    if (phase?.startsWith('ban')) {
      return 'Ban';
    } else if (phase?.startsWith('pick')) {
      return 'Pick';
    }
    return phase || 'Draft';
  };

  return (
    <div className="spectator-screen drafting">
      <div className="spectator-header">
        <h2>👁️ Spectator Mode</h2>
        <div className="current-action">
          <span className="action">{getPhaseAction()}</span>
          <span className="team">{getCurrentTeamName()}</span>
        </div>
      </div>

      <div className="spectator-draft-boards">
        <div className="spectator-team-board team1">
          <h3>{draftSession.team1_name}</h3>
          <div className="spectator-picks-bans">
            <div className="bans">
              <h4>Bans</h4>
              <div className="hero-slots">
                {draftSession.team1_bans?.map((ban, index) => (
                  <div key={index} className="hero-slot banned">
                    <span className="hero-name">{ban.hero_name}</span>
                    <span className="hero-role">{ban.hero_role}</span>
                  </div>
                ))}
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 3 - (draftSession.team1_bans?.length || 0)) }).map((_, index) => (
                  <div key={`empty-${index}`} className="hero-slot empty">
                    <span className="placeholder">-</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="picks">
              <h4>Picks</h4>
              <div className="hero-slots">
                {draftSession.team1_picks?.map((pick, index) => (
                  <div key={index} className="hero-slot picked">
                    <span className="hero-name">{pick.hero_name}</span>
                    <span className="hero-role">{pick.hero_role}</span>
                  </div>
                ))}
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 5 - (draftSession.team1_picks?.length || 0)) }).map((_, index) => (
                  <div key={`empty-${index}`} className="hero-slot empty">
                    <span className="placeholder">-</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="spectator-team-board team2">
          <h3>{draftSession.team2_name}</h3>
          <div className="spectator-picks-bans">
            <div className="bans">
              <h4>Bans</h4>
              <div className="hero-slots">
                {draftSession.team2_bans?.map((ban, index) => (
                  <div key={index} className="hero-slot banned">
                    <span className="hero-name">{ban.hero_name}</span>
                    <span className="hero-role">{ban.hero_role}</span>
                  </div>
                ))}
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 3 - (draftSession.team2_bans?.length || 0)) }).map((_, index) => (
                  <div key={`empty-${index}`} className="hero-slot empty">
                    <span className="placeholder">-</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="picks">
              <h4>Picks</h4>
              <div className="hero-slots">
                {draftSession.team2_picks?.map((pick, index) => (
                  <div key={index} className="hero-slot picked">
                    <span className="hero-name">{pick.hero_name}</span>
                    <span className="hero-role">{pick.hero_role}</span>
                  </div>
                ))}
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 5 - (draftSession.team2_picks?.length || 0)) }).map((_, index) => (
                  <div key={`empty-${index}`} className="hero-slot empty">
                    <span className="placeholder">-</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <HeroGrid
        heroes={heroes}
        bannedHeroes={[...(draftSession.team1_bans || []), ...(draftSession.team2_bans || [])]}
        pickedHeroes={[...(draftSession.team1_picks || []), ...(draftSession.team2_picks || [])]}
        isSpectator={true}
        currentAction={getPhaseAction()}
      />
    </div>
  );
};

export default SpectatorScreen;