import React from 'react';
import './HeroGrid.css';

const HeroGrid = ({ heroes, bannedHeroes = [], pickedHeroes = [], isUserTurn = false, isSpectator = false, currentAction = '', onHeroSelect }) => {
  const getHeroStatus = (hero) => {
    const isBanned = bannedHeroes.some(banned => banned.hero_name === hero.hero_name);
    const isPicked = pickedHeroes.some(picked => picked.hero_name === hero.hero_name);
    
    if (isBanned) return 'banned';
    if (isPicked) return 'picked';
    return 'available';
  };

  const canSelectHero = (hero) => {
    if (isSpectator) return false;
    if (!isUserTurn) return false;
    return getHeroStatus(hero) === 'available';
  };

  const handleHeroClick = (hero) => {
    if (canSelectHero(hero) && onHeroSelect) {
      onHeroSelect(hero);
    }
  };

  // Group heroes by role
  const herosByRole = heroes.reduce((acc, hero) => {
    if (!acc[hero.hero_role]) {
      acc[hero.hero_role] = [];
    }
    acc[hero.hero_role].push(hero);
    return acc;
  }, {});

  const roles = ['Carry', 'Support', 'Mid', 'Offlane', 'Jungle'];

  return (
    <div className="hero-grid-container">
      <div className="hero-grid-header">
        <h3>Hero Selection</h3>
        {!isSpectator && (
          <div className="selection-status">
            {isUserTurn ? (
              <span className="your-turn">Click a hero to {currentAction.toLowerCase()}</span>
            ) : (
              <span className="waiting">Waiting for opponent...</span>
            )}
          </div>
        )}
      </div>

      <div className="hero-grid">
        {roles.map(role => (
          herosByRole[role] && herosByRole[role].length > 0 && (
            <div key={role} className="hero-role-section">
              <h4 className="role-header">{role}</h4>
              <div className="hero-role-grid">
                {herosByRole[role].map(hero => {
                  const status = getHeroStatus(hero);
                  const selectable = canSelectHero(hero);
                  
                  return (
                    <div
                      key={hero.id}
                      className={`hero-card ${status} ${selectable ? 'selectable' : ''} ${isUserTurn && status === 'available' ? 'highlight' : ''}`}
                      onClick={() => handleHeroClick(hero)}
                      title={`${hero.hero_name} (${hero.hero_role})`}
                    >
                      <div className="hero-image">
                        {hero.hero_image_url ? (
                          <img 
                            src={hero.hero_image_url} 
                            alt={hero.hero_name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.querySelector('.hero-placeholder').style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="hero-placeholder" style={{ display: hero.hero_image_url ? 'none' : 'flex' }}>
                          {hero.hero_name.charAt(0)}
                        </div>
                      </div>
                      
                      <div className="hero-info">
                        <div className="hero-name">{hero.hero_name}</div>
                      </div>

                      {status === 'banned' && (
                        <div className="status-overlay banned-overlay">
                          <span>BANNED</span>
                        </div>
                      )}

                      {status === 'picked' && (
                        <div className="status-overlay picked-overlay">
                          <span>PICKED</span>
                        </div>
                      )}

                      {selectable && isUserTurn && (
                        <div className="selection-indicator">
                          <span>{currentAction}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default HeroGrid;