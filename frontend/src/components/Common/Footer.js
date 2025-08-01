import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Predecessor Tournaments</h3>
            <p>Competitive tournament management for the Predecessor community.</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/tournaments?status=active">Active Tournaments</Link></li>
              <li><Link to="/feedback">Feedback & Support</Link></li>
              <li><a href="https://omeda.city/dashboard" target="_blank" rel="noopener noreferrer">Omeda Studios</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Tournament Info</h4>
            <ul>
              <li>Captain's Draft Format</li>
              <li>Best of 3/5 Matches</li>
              <li>Real-time Draft System</li>
              <li>Discord Integration</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 Predecessor Tournament Management. Built for the Predecessor community.</p>
        </div>
      </div>
    </footer>
  );
};