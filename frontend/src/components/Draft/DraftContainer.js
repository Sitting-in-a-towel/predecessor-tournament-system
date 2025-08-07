import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import CoinTossScreen from './CoinTossScreen';
import DraftScreen from './DraftScreen';
import SpectatorScreen from './SpectatorScreen';
import './DraftContainer.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DraftContainer = ({ spectatorMode = false }) => {
  const { user } = useAuth();
  const { draftId } = useParams();
  const [socket, setSocket] = useState(null);
  const [draftSession, setDraftSession] = useState(null);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('spectator'); // 'team1', 'team2', 'spectator'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (draftId) {
      initializeDraft();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [draftId]);

  const initializeDraft = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Initializing draft with ID:', draftId);

      // Load heroes data
      try {
        const heroesResponse = await axios.get(`${API_BASE_URL}/draft/heroes`);
        setHeroes(heroesResponse.data.heroes || []);
      } catch (heroError) {
        console.warn('Failed to load heroes:', heroError.message);
        setHeroes([]); // Continue without heroes for now
      }

      // Load draft session using the correct endpoint
      try {
        console.log('Fetching draft session from:', `${API_BASE_URL}/draft/${draftId}`);
        const sessionResponse = await axios.get(`${API_BASE_URL}/draft/${draftId}`);
        const draft = sessionResponse.data;
        console.log('Loaded draft session:', draft);
        
        // Validate draft data structure
        if (!draft || !draft.draft_id) {
          throw new Error('Invalid draft session data received');
        }
        
        setDraftSession(draft);
      } catch (sessionError) {
        console.error('Error loading draft session:', sessionError);
        if (sessionError.response?.status === 404) {
          setError('Draft session not found. This draft may not exist or may have been deleted.');
        } else if (sessionError.response?.status === 500) {
          setError('Server error loading draft session. Please try again later.');
        } else {
          setError(sessionError.message || 'Failed to load draft session.');
        }
        return;
      }

      // Determine user's role in the draft
      if (user && !spectatorMode) {
        // Get URL parameters to check if user is a captain
        const urlParams = new URLSearchParams(window.location.search);
        const captainParam = urlParams.get('captain');
        
        if (captainParam === '1') {
          setUserRole('team1');
        } else if (captainParam === '2') {
          setUserRole('team2');
        } else {
          setUserRole('spectator');
        }
      } else {
        setUserRole('spectator');
      }

      // Initialize socket connection
      const socketConnection = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        withCredentials: true
      });

      socketConnection.on('connect', () => {
        console.log('Connected to draft socket');
        socketConnection.emit('join-draft', draftId);
      });

      socketConnection.on('coin-toss-result', (data) => {
        console.log('Coin toss result:', data);
        loadDraftSession(); // Refresh session data
      });

      socketConnection.on('draft-action', (data) => {
        console.log('Draft action update:', data);
        loadDraftSession(); // Refresh session data
      });

      socketConnection.on('draft-stopped', (data) => {
        console.log('Draft stopped:', data);
        toast.warning('Draft has been stopped by an administrator');
        loadDraftSession(); // Refresh session data
      });

      setSocket(socketConnection);

    } catch (error) {
      console.error('Error initializing draft:', error);
      setError(error.response?.data?.error || 'Failed to initialize draft session');
    } finally {
      setLoading(false);
    }
  };

  const loadDraftSession = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/draft/${draftId}`);
      setDraftSession(response.data);
    } catch (error) {
      console.error('Error reloading draft session:', error);
    }
  };

  const handleCoinTossChoice = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/draft/${draftId}/coin-toss`, {}, {
        withCredentials: true
      });
      
      const { winner, firstPick } = response.data;
      toast.success(`Coin toss complete! Team ${winner} wins and Team ${firstPick} picks first!`);
      
      // Refresh draft session to show new state
      await loadDraftSession();
    } catch (error) {
      console.error('Error performing coin toss:', error);
      toast.error(error.response?.data?.error || 'Failed to perform coin toss');
    }
  };

  const determineUserRole = () => {
    if (!user || !draftSession) return 'spectator';
    
    // Check if user is part of either team
    // This logic would need to be implemented based on team membership
    // For now, return spectator
    return 'spectator';
  };

  if (loading) {
    return (
      <div className="draft-container loading">
        <div className="loading-content">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-text">Loading draft session...</p>
        </div>
      </div>
    );
  }

  if (error || !draftSession) {
    return (
      <div className="draft-container error">
        <div className="error-message">
          <h2>Draft Session Error</h2>
          <p>{error || 'This draft session doesn\'t exist or hasn\'t been set up yet.'}</p>
          <button className="btn btn-primary" onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Determine which screen to show based on draft status and phase
  const renderDraftScreen = () => {
    const status = draftSession.status?.toLowerCase() || 'waiting';
    const phase = draftSession.current_phase?.toLowerCase() || 'coin toss';
    
    console.log('Rendering draft screen - Status:', status, 'Phase:', phase, 'UserRole:', userRole);

    // Handle coin toss phase
    if (phase === 'coin toss' && status === 'waiting') {
      return (
        <div className="coin-toss-container">
          <div className="coin-toss-header">
            <h2>Coin Toss</h2>
            <p>Determining first pick...</p>
          </div>
          <div className="coin-toss-content">
            <p>Teams: <strong>{draftSession.team1_name}</strong> vs <strong>{draftSession.team2_name}</strong></p>
            {userRole !== 'spectator' && (
              <button 
                className="btn btn-primary coin-toss-btn"
                onClick={handleCoinTossChoice}
              >
                Perform Coin Toss
              </button>
            )}
            {userRole === 'spectator' && (
              <p className="spectator-message">Waiting for captains to perform coin toss...</p>
            )}
          </div>
        </div>
      );
    }

    // Handle draft phases
    if (phase === 'ban phase' || phase === 'pick phase') {
      return (
        <div className="draft-active">
          <div className="draft-header-info">
            <h2>Draft in Progress</h2>
            <div className="draft-phase-info">
              <span className="phase">{draftSession.current_phase}</span>
              <span className="turn">Turn: {draftSession.current_turn}</span>
            </div>
          </div>
          <p>Draft system is currently under development. Please check back later.</p>
        </div>
      );
    }

    // Handle completed drafts
    if (status === 'completed') {
      return (
        <div className="draft-completed">
          <h2>Draft Completed</h2>
          <p>This draft session has been completed.</p>
        </div>
      );
    }

    // Handle stopped drafts
    if (status === 'stopped') {
      return (
        <div className="draft-stopped">
          <h2>Draft Stopped</h2>
          <p>This draft session has been stopped by an administrator.</p>
        </div>
      );
    }

    // Default state
    return (
      <div className="draft-waiting">
        <h2>Draft Session Ready</h2>
        <p>Status: {draftSession.status}</p>
        <p>Phase: {draftSession.current_phase}</p>
      </div>
    );
  };

  return (
    <div className="draft-container">
      <div className="draft-header">
        <h1>Draft Session</h1>
        <div className="match-info">
          <span className="team">{draftSession.team1_name}</span>
          <span className="vs">VS</span>
          <span className="team">{draftSession.team2_name}</span>
        </div>
        <div className="draft-meta-info">
          <span className="status">Status: {draftSession.status}</span>
          <span className="phase">Phase: {draftSession.current_phase}</span>
          {userRole !== 'spectator' && (
            <span className="role">Role: {userRole === 'team1' ? 'Team 1 Captain' : 'Team 2 Captain'}</span>
          )}
        </div>
      </div>

      {renderDraftScreen()}
    </div>
  );
};

export default DraftContainer;