import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { roles } from '../../data/predecessorHeroes';
import './NewDraftInterface.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const NewDraftInterface = ({ mode = 'team1' }) => {
  const { draftId } = useParams();
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [draftSession, setDraftSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHero, setSelectedHero] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('waiting');
  const [timer, setTimer] = useState(20);
  const [selectedRole, setSelectedRole] = useState('All');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [hoveredHero, setHoveredHero] = useState(null);
  const [bothTeamsConnected, setBothTeamsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [heroes, setHeroes] = useState([]);
  const [loadingHeroes, setLoadingHeroes] = useState(true);
  const lockButtonRef = useRef(null);

  // Phase states: waiting, coin_toss, ban_phase, pick_phase, completed
  
  useEffect(() => {
    initializeDraft();
    loadHeroes();
    
    return () => {
      if (socket) {
        if (socket.timerInterval) {
          clearInterval(socket.timerInterval);
        }
        socket.disconnect();
      }
    };
  }, [draftId]);

  const loadHeroes = async () => {
    try {
      setLoadingHeroes(true);
      console.log('🦸 Loading heroes from backend API...');
      
      const response = await axios.get(`${API_BASE_URL}/heroes`, {
        withCredentials: true
      });
      const heroesData = response.data;
      
      console.log('✅ Loaded heroes data:', heroesData.length, 'heroes');
      console.log('🎯 Sample heroes:', heroesData.slice(0, 3));
      
      setHeroes(heroesData);
      
    } catch (error) {
      console.error('❌ Failed to load heroes from backend:', error);
      toast.warning('Using fallback hero data - images may not load');
      
      // Fallback to static data if needed
      const fallbackHeroes = [
        { id: 'grux', name: 'Grux', role: 'Offlane', image: '/assets/images/heroes/grux.jpg' },
        { id: 'kwang', name: 'Kwang', role: 'Offlane', image: '/assets/images/heroes/kwang.jpg' },
        { id: 'countess', name: 'Countess', role: 'Midlane', image: '/assets/images/heroes/countess.jpg' },
        { id: 'aurora', name: 'Aurora', role: 'Offlane', image: '/assets/images/heroes/aurora.jpg' },
        { id: 'crunch', name: 'Crunch', role: 'Offlane', image: '/assets/images/heroes/crunch.jpg' }
      ];
      setHeroes(fallbackHeroes);
    } finally {
      setLoadingHeroes(false);
    }
  };

  const initializeDraft = async () => {
    try {
      setLoading(true);
      
      // Load draft session
      const response = await axios.get(`${API_BASE_URL}/draft/${draftId}`);
      const draft = response.data;
      setDraftSession(draft);
      
      // Connect to draft if not spectator
      if (mode !== 'spectator') {
        try {
          console.log('🔌 Connecting to draft session...');
          await axios.post(`${API_BASE_URL}/draft/${draftId}/connect`, {}, {
            withCredentials: true
          });
          console.log('✅ Connected to draft session');
        } catch (connectError) {
          console.error('❌ Failed to connect to draft:', connectError);
          // Don't fail completely if connection fails
        }
      }
      
      // Determine phase - prioritize connection status
      const bothConnected = draft.team1_connected && draft.team2_connected;
      
      if (!bothConnected && (draft.current_phase?.includes('Ban') || draft.current_phase?.includes('Pick'))) {
        // If we're in ban/pick phase but both teams aren't connected, wait
        setCurrentPhase('waiting');
      } else if (draft.status === 'Waiting' && draft.current_phase === 'Coin Toss') {
        setCurrentPhase('coin_toss');
      } else if (draft.current_phase?.includes('Ban')) {
        setCurrentPhase('ban_phase');
      } else if (draft.current_phase?.includes('Pick')) {
        setCurrentPhase('pick_phase');
      } else if (draft.status === 'Completed') {
        setCurrentPhase('completed');
      } else {
        setCurrentPhase('waiting');
      }
      
      // Check if it's my turn
      checkTurn(draft);
      
      // Check connection status
      const teamsConnected = draft.team1_connected && draft.team2_connected;
      setBothTeamsConnected(teamsConnected);
      
      if (!teamsConnected) {
        if (draft.team1_connected || draft.team2_connected) {
          const connectedTeam = draft.team1_connected ? draft.team1_name : draft.team2_name;
          setConnectionStatus(`${connectedTeam} connected. Waiting for other team...`);
        } else {
          setConnectionStatus('Waiting for teams to connect...');
        }
      } else {
        setConnectionStatus('Both teams connected!');
      }
      
      // Initialize socket
      const socketConnection = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3001', {
        withCredentials: true
      });
      
      socketConnection.on('connect', () => {
        console.log('Connected to draft socket');
        socketConnection.emit('join-draft', draftId);
      });
      
      socketConnection.on('draft-update', (data) => {
        handleDraftUpdate(data);
      });
      
      socketConnection.on('timer-update', (data) => {
        setTimer(data.remaining);
      });
      
      // Start client-side timer calculation
      const timerInterval = setInterval(() => {
        if (draftSession?.turn_timer_end) {
          const now = new Date();
          const endTime = new Date(draftSession.turn_timer_end);
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
          setTimer(remaining);
          
          if (remaining === 0) {
            console.log('⏰ Timer expired!');
          }
        }
      }, 1000);
      
      // Store interval ref for cleanup
      socketConnection.timerInterval = timerInterval;
      
      socketConnection.on('phase-change', (data) => {
        setCurrentPhase(data.phase);
        checkTurn(data.draft);
      });
      
      // Connection status events
      socketConnection.on('captain-connected', (data) => {
        console.log('👥 Captain connected:', data);
        setConnectionStatus(`${data.teamName} connected. Waiting for other team...`);
      });
      
      socketConnection.on('both-teams-connected', (data) => {
        console.log('🎯 Both teams connected:', data);
        setBothTeamsConnected(true);
        setConnectionStatus('Both teams connected! Draft starting...');
      });
      
      setSocket(socketConnection);
      
    } catch (error) {
      console.error('Error initializing draft:', error);
      toast.error('Failed to load draft session');
    } finally {
      setLoading(false);
    }
  };
  
  const checkTurn = (draft) => {
    if (mode === 'spectator') {
      setIsMyTurn(false);
      return;
    }
    
    const currentTurn = draft.current_turn;
    const myTurn = currentTurn === mode;
    
    console.log('🎯 Turn Check Debug:', {
      mode,
      currentTurn,
      myTurn,
      draftPhase: draft.current_phase,
      draftStatus: draft.status
    });
    
    setIsMyTurn(myTurn);
  };
  
  const handleDraftUpdate = (data) => {
    setDraftSession(data.draft);
    checkTurn(data.draft);
    
    // Update timer immediately on draft updates
    if (data.draft.turn_timer_end) {
      const now = new Date();
      const endTime = new Date(data.draft.turn_timer_end);
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimer(remaining);
    }
    
    if (data.action === 'ban') {
      toast.info(`${data.heroName} has been banned`);
    } else if (data.action === 'pick') {
      toast.info(`${data.heroName} has been picked`);
    }
  };
  
  const handleHeroClick = (hero) => {
    if (!isMyTurn) {
      toast.warning('Not your turn');
      return;
    }
    
    // Check if hero is already banned or picked
    if (isHeroBanned(hero.id) || isHeroPicked(hero.id)) {
      toast.warning('Hero not available');
      return;
    }
    
    setSelectedHero(hero);
  };
  
  const handleLock = async () => {
    if (!selectedHero || !isMyTurn) return;
    
    try {
      const action = currentPhase === 'ban_phase' ? 'ban' : 'pick';
      
      console.log('🔒 Draft Action Debug:', {
        draftId,
        action,
        heroId: selectedHero.id,
        heroName: selectedHero.name,
        team: mode,
        currentPhase,
        isMyTurn,
        selectedHero
      });
      
      const response = await axios.post(`${API_BASE_URL}/draft/${draftId}/action`, {
        action: action,
        heroId: selectedHero.id,
        team: mode
      }, {
        withCredentials: true
      });
      
      console.log('✅ Draft action response:', response.data);
      
      if (response.data.success) {
        setSelectedHero(null);
        toast.success(`${selectedHero.name} ${action}ned!`);
      }
      
    } catch (error) {
      console.error('❌ Error locking hero:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.error || 'Failed to lock hero');
    }
  };
  
  const handleSkip = async () => {
    if (!isMyTurn) return;
    
    try {
      await axios.post(`${API_BASE_URL}/draft/${draftId}/skip`, {
        team: mode
      }, {
        withCredentials: true
      });
      
      toast.info('Turn skipped');
      
    } catch (error) {
      console.error('Error skipping turn:', error);
    }
  };
  
  const isHeroBanned = (heroId) => {
    if (!draftSession) return false;
    const allBans = [
      ...(draftSession.team1_bans || []),
      ...(draftSession.team2_bans || [])
    ];
    return allBans.some(ban => ban.hero_id === heroId);
  };
  
  const isHeroPicked = (heroId) => {
    if (!draftSession) return false;
    const allPicks = [
      ...(draftSession.team1_picks || []),
      ...(draftSession.team2_picks || [])
    ];
    return allPicks.some(pick => pick.hero_id === heroId);
  };
  
  const getFilteredHeroes = () => {
    if (selectedRole === 'All') return heroes;
    return heroes.filter(hero => hero.role === selectedRole || hero.roles?.includes(selectedRole));
  };
  
  const renderTeamSlots = (teamNum) => {
    const bans = teamNum === 1 ? draftSession?.team1_bans || [] : draftSession?.team2_bans || [];
    const picks = teamNum === 1 ? draftSession?.team1_picks || [] : draftSession?.team2_picks || [];
    const banCount = draftSession?.ban_count || 2;
    
    // Check if it's this team's turn
    const teamKey = `team${teamNum}`;
    const isMyTeamTurn = draftSession?.current_turn === teamKey;
    const isActiveAction = currentPhase === 'ban_phase' || currentPhase === 'pick_phase';
    const showTurnIndicator = isMyTeamTurn && isActiveAction;
    
    return (
      <div className={`team-slots team-${teamNum} ${showTurnIndicator ? 'active-turn' : ''}`}>
        <h3>
          {teamNum === 1 ? draftSession?.team1_name : draftSession?.team2_name}
          {showTurnIndicator && (
            <span className="turn-indicator">
              {currentPhase === 'ban_phase' ? 'BANNING' : 'PICKING'}
            </span>
          )}
        </h3>
        
        {/* Ban Slots */}
        <div className="ban-slots">
          {[...Array(banCount)].map((_, index) => (
            <div key={`ban-${index}`} className="slot ban-slot">
              {bans[index] ? (
                <img 
                  src={bans[index].hero_image} 
                  alt={bans[index].hero_name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML += `<div class="slot-placeholder">${bans[index].hero_name.charAt(0)}</div>`;
                  }}
                />
              ) : (
                <div className="empty-slot">Ban {index + 1}</div>
              )}
            </div>
          ))}
        </div>
        
        {/* Pick Slots */}
        <div className="pick-slots">
          {[...Array(5)].map((_, index) => (
            <div key={`pick-${index}`} className="slot pick-slot">
              {picks[index] ? (
                <img 
                  src={picks[index].hero_image} 
                  alt={picks[index].hero_name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML += `<div class="slot-placeholder">${picks[index].hero_name.charAt(0)}</div>`;
                  }}
                />
              ) : (
                <div className="empty-slot">Pick {index + 1}</div>
              )}
              {selectedHero && isMyTurn && mode === `team${teamNum}` && !picks[index] && currentPhase === 'pick_phase' && (
                <div className="preview-hero">
                  <img src={selectedHero.image} alt={selectedHero.name} style={{ opacity: 0.5 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderHeroGrid = () => {
    const heroes = getFilteredHeroes();
    
    return (
      <div className="hero-grid-container">
        <div className="draft-header">
          <button 
            className="skip-button"
            onClick={handleSkip}
            disabled={!isMyTurn}
          >
            Skip {currentPhase === 'ban_phase' ? 'ban' : 'turn'}
          </button>
          
          <div className="timer-display">
            <span className="timer-value">{timer}</span>
          </div>
        </div>
        
        <div className="role-filters">
          {roles.map(role => (
            <button
              key={role}
              className={`role-filter ${selectedRole === role ? 'active' : ''}`}
              onClick={() => setSelectedRole(role)}
            >
              {role}
            </button>
          ))}
        </div>
        
        <div className="hero-grid">
          {heroes.map(hero => {
            const isBanned = isHeroBanned(hero.id);
            const isPicked = isHeroPicked(hero.id);
            const isSelected = selectedHero?.id === hero.id;
            
            return (
              <div
                key={hero.id}
                className={`hero-item ${isBanned ? 'banned' : ''} ${isPicked ? 'picked' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleHeroClick(hero)}
                onMouseEnter={() => setHoveredHero(hero)}
                onMouseLeave={() => setHoveredHero(null)}
              >
                <img 
                  src={hero.image} 
                  alt={hero.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML += `<div class="hero-placeholder">${hero.name.charAt(0)}</div>`;
                  }}
                />
                {(isBanned || isPicked) && (
                  <div className="hero-overlay">
                    <span>{isBanned ? 'BANNED' : 'PICKED'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {selectedHero && isMyTurn && (
          <button
            ref={lockButtonRef}
            className="lock-button"
            onClick={handleLock}
          >
            Lock {currentPhase === 'ban_phase' ? 'Ban' : 'Pick'}
          </button>
        )}
      </div>
    );
  };
  
  const renderWaitingScreen = () => {
    return (
      <div className="waiting-screen">
        <div className="waiting-content">
          <div className="spinner"></div>
          <h2>{connectionStatus || 'Waiting for teams to connect...'}</h2>
          {draftSession && (
            <div className="team-status">
              <div className={`team-indicator ${draftSession.team1_connected ? 'connected' : 'waiting'}`}>
                <span>{draftSession.team1_name || 'Team 1'}</span>
                <span className="status">{draftSession.team1_connected ? 'Connected' : 'Waiting...'}</span>
              </div>
              <div className={`team-indicator ${draftSession.team2_connected ? 'connected' : 'waiting'}`}>
                <span>{draftSession.team2_name || 'Team 2'}</span>
                <span className="status">{draftSession.team2_connected ? 'Connected' : 'Waiting...'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderCompletedScreen = () => {
    const matchCode = draftSession?.match_code || generateMatchCode();
    
    return (
      <div className="completed-screen">
        <h1>Draft finished!</h1>
        <p>Custom match code: <strong>{matchCode}</strong></p>
        <button onClick={() => navigator.clipboard.writeText(matchCode)}>
          Copy Code
        </button>
        
        <div className="final-teams">
          {renderTeamSlots(1)}
          {renderTeamSlots(2)}
        </div>
      </div>
    );
  };
  
  const generateMatchCode = () => {
    return Math.random().toString(36).substr(2, 10);
  };
  
  if (loading || loadingHeroes) {
    return (
      <div className="draft-loading">
        <div className="spinner"></div>
        <p>{loading ? 'Loading draft...' : 'Loading heroes...'}</p>
      </div>
    );
  }
  
  if (currentPhase === 'waiting') {
    return renderWaitingScreen();
  }
  
  if (currentPhase === 'completed') {
    return renderCompletedScreen();
  }
  
  return (
    <div className="new-draft-interface">
      {renderTeamSlots(1)}
      {renderHeroGrid()}
      {renderTeamSlots(2)}
      
      {hoveredHero && (
        <div className="hero-tooltip">
          <h4>{hoveredHero.name}</h4>
          <p>{hoveredHero.role}</p>
        </div>
      )}
    </div>
  );
};

export default NewDraftInterface;