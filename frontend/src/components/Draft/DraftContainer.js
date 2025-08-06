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

const DraftContainer = () => {
  const { user } = useAuth();
  const { matchId } = useParams();
  const [socket, setSocket] = useState(null);
  const [draftSession, setDraftSession] = useState(null);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('spectator'); // 'team1', 'team2', 'spectator'

  useEffect(() => {
    if (matchId) {
      initializeDraft();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [matchId]);

  const initializeDraft = async () => {
    try {
      setLoading(true);

      // Load heroes data
      const heroesResponse = await axios.get(`${API_BASE_URL}/draft/heroes`);
      setHeroes(heroesResponse.data.heroes || []);

      // Load or create draft session
      try {
        const sessionResponse = await axios.get(`${API_BASE_URL}/draft/sessions/${matchId}`);
        setDraftSession(sessionResponse.data.draftSession);
      } catch (error) {
        if (error.response?.status === 404) {
          // Draft session doesn't exist, would need to be created by admin/match setup
          toast.error('Draft session not found. Contact admin to set up the draft.');
          return;
        }
        throw error;
      }

      // Determine user's role in the draft
      if (user) {
        // This would need to be determined based on user's team membership
        // For now, set as spectator - this will be improved
        setUserRole('spectator');
      }

      // Initialize socket connection
      const socketConnection = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        withCredentials: true
      });

      socketConnection.on('connect', () => {
        console.log('Connected to draft socket');
        socketConnection.emit('join-draft', matchId);
      });

      socketConnection.on('coin-toss-update', (data) => {
        console.log('Coin toss update:', data);
        loadDraftSession(); // Refresh session data
      });

      socketConnection.on('draft-update', (data) => {
        console.log('Draft update:', data);
        loadDraftSession(); // Refresh session data
      });

      setSocket(socketConnection);

    } catch (error) {
      console.error('Error initializing draft:', error);
      toast.error('Failed to initialize draft session');
    } finally {
      setLoading(false);
    }
  };

  const loadDraftSession = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/draft/sessions/${matchId}`);
      setDraftSession(response.data.draftSession);
    } catch (error) {
      console.error('Error loading draft session:', error);
    }
  };

  const handleCoinTossChoice = async (choice, teamId) => {
    try {
      await axios.post(`${API_BASE_URL}/draft/sessions/${matchId}/coin-toss`, {
        choice,
        teamId
      }, {
        withCredentials: true
      });
      
      toast.success(`Selected ${choice}!`);
    } catch (error) {
      console.error('Error submitting coin toss choice:', error);
      toast.error(error.response?.data?.error || 'Failed to submit choice');
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
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading draft session...</p>
        </div>
      </div>
    );
  }

  if (!draftSession) {
    return (
      <div className="draft-container error">
        <div className="error-message">
          <h2>Draft Session Not Found</h2>
          <p>This draft session doesn't exist or hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  // Determine which screen to show based on draft status
  const renderDraftScreen = () => {
    const currentUserRole = determineUserRole();

    switch (draftSession.draft_status) {
      case 'coin_toss':
        if (currentUserRole === 'spectator') {
          return (
            <SpectatorScreen
              draftSession={draftSession}
              heroes={heroes}
              phase="coin_toss"
            />
          );
        }
        return (
          <CoinTossScreen
            draftSession={draftSession}
            userRole={currentUserRole}
            onCoinTossChoice={handleCoinTossChoice}
          />
        );

      case 'drafting':
        if (currentUserRole === 'spectator') {
          return (
            <SpectatorScreen
              draftSession={draftSession}
              heroes={heroes}
              phase="drafting"
            />
          );
        }
        return (
          <DraftScreen
            draftSession={draftSession}
            heroes={heroes}
            userRole={currentUserRole}
            matchId={matchId}
          />
        );

      case 'completed':
        return (
          <SpectatorScreen
            draftSession={draftSession}
            heroes={heroes}
            phase="completed"
          />
        );

      default:
        return (
          <div className="draft-error">
            <p>Unknown draft status: {draftSession.draft_status}</p>
          </div>
        );
    }
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
        <div className="tournament-info">
          <span>{draftSession.tournament_name}</span>
        </div>
      </div>

      {renderDraftScreen()}
    </div>
  );
};

export default DraftContainer;