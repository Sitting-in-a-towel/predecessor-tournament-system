import React from 'react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();

  const handleDashboardClick = () => {
    navigate('/admin/dashboard');
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Manage tournaments, users, and system settings.</p>
      </div>

      <div className="admin-container">
        <div className="admin-nav">
          <button className="nav-button active" onClick={handleDashboardClick}>Dashboard</button>
          <button className="nav-button">Tournaments</button>
          <button className="nav-button">Users</button>
          <button className="nav-button">Teams</button>
          <button className="nav-button">Settings</button>
        </div>

        <div className="admin-content">
          <div className="admin-dashboard">
            <div className="stats-overview">
              <div className="stat-card">
                <h3>0</h3>
                <p>Active Tournaments</p>
              </div>
              <div className="stat-card">
                <h3>0</h3>
                <p>Registered Users</p>
              </div>
              <div className="stat-card">
                <h3>0</h3>
                <p>Active Teams</p>
              </div>
              <div className="stat-card">
                <h3>0</h3>
                <p>Ongoing Matches</p>
              </div>
            </div>

            <div className="admin-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-button">Create Tournament</button>
                <button className="action-button">Manage Users</button>
                <button className="action-button">View Reports</button>
                <button className="action-button">System Settings</button>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <p>No recent activity to display.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;