import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import NewDraftInterface from './NewDraftInterface';
import RaceCoinToss from './RaceCoinToss';
import WaitingModal from './WaitingModal';
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
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [captainStatus, setCaptainStatus] = useState({
    team1Connected: false,
    team2Connected: false,
    presentCount: 0
  });

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
        const heroesResponse = await axios.get(`${API_BASE_URL}/heroes`);
        setHeroes(heroesResponse.data || []);
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

      // Initialize socket connection with enhanced events
      const socketConnection = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
        withCredentials: true
      });

      socketConnection.on('connect', () => {
        console.log('Connected to draft socket');
        
        // Join the draft session using the new event structure
        if (userRole !== 'spectator') {
          const teamNumber = userRole === 'team1' ? 1 : 2;
          socketConnection.emit('join-draft-session', {
            sessionId: draftId,
            userId: user?.id || `browser_${Date.now()}_team${teamNumber}`,
            teamNumber: teamNumber
          });
          console.log(`Joining as captain for team ${teamNumber}`);
        } else {
          // Spectators join without captain privileges
          socketConnection.emit('join-draft', draftId);
          console.log('Joining as spectator');
        }
      });

      // New event: Waiting for other captain
      socketConnection.on('waiting-for-captain', (data) => {
        console.log('Waiting for captain:', data);
        setShowWaitingModal(true);
        setCaptainStatus({
          team1Connected: data.team1Connected || false,
          team2Connected: data.team2Connected || false,
          presentCount: data.presentCount || 0
        });
      });

      // New event: Both captains present
      socketConnection.on('both-captains-present', (data) => {
        console.log('Both captains present:', data);
        setShowWaitingModal(false);
        setCaptainStatus({
          team1Connected: true,
          team2Connected: true,
          presentCount: 2
        });
        toast.success('Both captains connected! Starting draft...');
        loadDraftSession(); // Refresh session data
      });

      // Enhanced coin toss events
      socketConnection.on('coin-toss-phase-start', (data) => {
        console.log('Coin toss phase started:', data);
        toast.info(data.message);
      });

      socketConnection.on('coin-toss-choice-made', (data) => {
        console.log('Coin toss choice made:', data);
        toast.info(`${data.choice} has been chosen by Team ${data.teamNumber}`);
        loadDraftSession(); // Refresh to show updated choices
      });

      socketConnection.on('coin-toss-complete', (data) => {
        console.log('Coin toss completed:', data);
        toast.success(`Coin toss result: ${data.result}! Team ${data.winner} gets first pick.`);
        loadDraftSession(); // Refresh session data
      });

      socketConnection.on('coin-toss-error', (data) => {
        console.error('Coin toss error:', data);
        toast.error(data.message);
      });

      // Captain connection status events
      socketConnection.on('captain-left', (data) => {
        console.log('Captain left:', data);
        toast.warning(data.message);
        setShowWaitingModal(true);
        loadDraftSession();
      });

      socketConnection.on('captain-disconnected', (data) => {
        console.log('Captain disconnected:', data);
        toast.warning(`Team ${data.teamNumber} captain disconnected`);
      });

      // Existing events
      socketConnection.on('draft-action', (data) => {
        console.log('Draft action update:', data);
        loadDraftSession(); // Refresh session data
      });

      socketConnection.on('draft-stopped', (data) => {
        console.log('Draft stopped:', data);
        toast.warning('Draft has been stopped by an administrator');
        loadDraftSession(); // Refresh session data
      });

      // Get current session state
      socketConnection.on('draft-session-state', (sessionData) => {
        console.log('Received session state:', sessionData);
        setDraftSession(sessionData);
        
        // Update captain status based on session data
        const team1Connected = sessionData.team1_connected || false;
        const team2Connected = sessionData.team2_connected || false;
        const presentCount = (team1Connected ? 1 : 0) + (team2Connected ? 1 : 0);
        
        setCaptainStatus({
          team1Connected,
          team2Connected,
          presentCount
        });
        
        // Show waiting modal if both captains aren't present
        if (userRole !== 'spectator' && presentCount < 2) {
          setShowWaitingModal(true);
        } else {
          setShowWaitingModal(false);
        }
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
    if (phase === 'coin toss' || phase === 'Coin Toss') {
      return (
        <RaceCoinToss
          draftSession={draftSession}
          userRole={userRole}
          draftId={draftId}
        />
      );
    }

    // Handle draft phases
    if (phase === 'ban phase' || phase === 'pick phase') {
      return (
        <NewDraftInterface
          mode={userRole}
          draftSession={draftSession}
          draftId={draftId}
        />
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
      {/* Waiting Modal - appears over everything when waiting for captains */}
      <WaitingModal 
        isVisible={showWaitingModal}
        presentCount={captainStatus.presentCount}
        totalNeeded={2}
        team1Connected={captainStatus.team1Connected}
        team2Connected={captainStatus.team2Connected}
        message="Waiting for other captain to join the draft session..."
        sessionId={draftId}
      />
      
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
          {/* Captain connection indicators */}
          <div className="captain-connections">
            <span className={`captain-dot ${captainStatus.team1Connected ? 'connected' : 'disconnected'}`} 
                  title="Team 1 Captain"></span>
            <span className={`captain-dot ${captainStatus.team2Connected ? 'connected' : 'disconnected'}`} 
                  title="Team 2 Captain"></span>
          </div>
        </div>
      </div>

      {renderDraftScreen()}
    </div>
  );
};

export default DraftContainer;