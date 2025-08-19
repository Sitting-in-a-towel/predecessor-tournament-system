import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Header = () => {
  const { user, isAuthenticated, logout, login } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLogin = () => {
    login(true); // Remember user for 30 days
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>Predecessor Tournaments</h1>
        </Link>

        <nav className="main-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/tournaments" className="nav-link">Tournaments</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/teams" className="nav-link">Teams</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              {user?.isAdmin && (
                <Link to="/admin/dashboard" className="nav-link admin-link">Admin</Link>
              )}
            </>
          ) : null}
        </nav>

        <div className="auth-section">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="username">{user?.discordUsername}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={handleLogin}>
              Login with Discord
            </button>
          )}
        </div>
      </div>
    </header>
  );
};