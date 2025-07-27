import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Predecessor Tournament Management</h1>
          <p>
            The ultimate platform for organizing and participating in competitive 
            Predecessor tournaments with captain's draft, real-time brackets, 
            and Discord integration.
          </p>
          
          {!isAuthenticated ? (
            <div className="hero-actions">
              <Link to="/login" className="cta-button primary">
                Get Started with Discord
              </Link>
              <Link to="/tournaments" className="cta-button secondary">
                View Tournaments
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <Link to="/tournaments" className="cta-button primary">
                Join Tournament
              </Link>
              <Link to="/teams" className="cta-button secondary">
                Manage Teams
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <h2>Tournament Features</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <h3>Captain's Draft</h3>
              <p>
                Secure captain-only access with unique links, customizable pick/ban 
                orders, and coin toss functionality for fair matches.
              </p>
            </div>
            
            <div className="feature-card">
              <h3>Real-time Brackets</h3>
              <p>
                Live tournament brackets with automatic progression, match scheduling, 
                and result tracking for seamless tournament management.
              </p>
            </div>
            
            <div className="feature-card">
              <h3>Team Management</h3>
              <p>
                Easy team registration, player invitations, roster management, 
                and substitute player support (up to 3 subs per team).
              </p>
            </div>
            
            <div className="feature-card">
              <h3>Discord Integration</h3>
              <p>
                Seamless Discord OAuth authentication, admin role verification, 
                and notification system for tournament updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="tournament-formats-section">
        <div className="container">
          <h2>Supported Tournament Formats</h2>
          
          <div className="formats-grid">
            <div className="format-card">
              <h4>Single Elimination</h4>
              <p>Fast-paced knockout format</p>
            </div>
            <div className="format-card">
              <h4>Double Elimination</h4>
              <p>Second chances with winners/losers brackets</p>
            </div>
            <div className="format-card">
              <h4>Round Robin</h4>
              <p>Every team plays every other team</p>
            </div>
            <div className="format-card">
              <h4>Swiss Format</h4>
              <p>Balanced matchmaking system</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;