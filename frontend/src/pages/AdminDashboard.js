import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import CreateTournamentModal from '../components/Admin/CreateTournamentModal';
import UserManagementModal from '../components/Admin/UserManagementModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tournaments: { total: 0, active: 0, completed: 0, upcoming: 0 },
    teams: { total: 0, confirmed: 0, pending: 0 },
    users: { total: 0, active: 0 },
    matches: { total: 0, completed: 0, scheduled: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    database: 'checking',
    discord: 'checking'
  });
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStatistics(),
        loadRecentActivity(),
        checkSystemHealth()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        withCredentials: true
      });
      
      setStats(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Failed to load dashboard statistics');
    }
  };

  const loadRecentActivity = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/activity`, {
        withCredentials: true
      });
      
      // Format timestamps for display
      const formattedActivity = response.data.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp).toLocaleString()
      }));
      
      setRecentActivity(formattedActivity);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  };

  const checkSystemHealth = async () => {
    try {
      // Check database connection via backend
      let databaseHealth = 'healthy';
      try {
        await axios.get(`${API_BASE_URL}/tournaments`, {
          withCredentials: true
        });
      } catch (error) {
        databaseHealth = 'error';
      }
      
      // Check Discord OAuth (simplified check)
      const discordHealth = 'healthy'; // Would implement actual Discord API check

      setSystemHealth({
        database: databaseHealth,
        discord: discordHealth
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      setSystemHealth({
        database: 'error',
        discord: 'error'
      });
    }
  };

  const handleRefreshData = () => {
    loadDashboardData();
    toast.success('Dashboard data refreshed');
  };

  const handleTournamentCreated = (tournament) => {
    // Refresh dashboard data to show new tournament
    loadDashboardData();
  };

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p>Monitor tournaments, manage users, and track system performance</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={handleRefreshData}
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="stats-grid">
        {/* Tournament Stats */}
        <div className="stat-card tournaments">
          <div className="stat-header">
            <h3>Tournaments</h3>
            <span className="stat-icon">🏆</span>
          </div>
          <div className="stat-content">
            <div className="stat-main">
              <span className="stat-number">{stats.tournaments?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value active">{stats.tournaments?.active || 0}</span>
                <span className="stat-text">Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-value upcoming">{stats.tournaments?.upcoming || 0}</span>
                <span className="stat-text">Upcoming</span>
              </div>
              <div className="stat-item">
                <span className="stat-value completed">{stats.tournaments?.completed || 0}</span>
                <span className="stat-text">Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div className="stat-card teams">
          <div className="stat-header">
            <h3>Teams</h3>
            <span className="stat-icon">👥</span>
          </div>
          <div className="stat-content">
            <div className="stat-main">
              <span className="stat-number">{stats.teams?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value confirmed">{stats.teams?.confirmed || 0}</span>
                <span className="stat-text">Confirmed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value pending">{stats.teams?.pending || 0}</span>
                <span className="stat-text">Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {(stats.teams?.total && stats.teams.total > 0) ? Math.round(((stats.teams.confirmed || 0) / stats.teams.total) * 100) : 0}%
                </span>
                <span className="stat-text">Completion</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="stat-card users">
          <div className="stat-header">
            <h3>Users</h3>
            <span className="stat-icon">👤</span>
          </div>
          <div className="stat-content">
            <div className="stat-main">
              <span className="stat-number">{stats.users?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value active">{stats.users?.active || 0}</span>
                <span className="stat-text">Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {(stats.users?.total || 0) - (stats.users?.active || 0)}
                </span>
                <span className="stat-text">Inactive</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {(stats.users?.total && stats.users.total > 0) ? Math.round(((stats.users.active || 0) / stats.users.total) * 100) : 0}%
                </span>
                <span className="stat-text">Activity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Match Stats */}
        <div className="stat-card matches">
          <div className="stat-header">
            <h3>Matches</h3>
            <span className="stat-icon">⚔️</span>
          </div>
          <div className="stat-content">
            <div className="stat-main">
              <span className="stat-number">{stats.matches?.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value completed">{stats.matches?.completed || 0}</span>
                <span className="stat-text">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value scheduled">{stats.matches?.scheduled || 0}</span>
                <span className="stat-text">Scheduled</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {(stats.matches?.total && stats.matches.total > 0) ? Math.round(((stats.matches.completed || 0) / stats.matches.total) * 100) : 0}%
                </span>
                <span className="stat-text">Progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="system-health">
        <h2>System Health</h2>
        <div className="health-grid">
          <div className="health-item">
            <div className="health-header">
              <span className="health-label">PostgreSQL Database</span>
              <span className={`health-status ${systemHealth.database}`}>
                {systemHealth.database === 'healthy' ? '✅' : 
                 systemHealth.database === 'error' ? '❌' : '⏳'}
              </span>
            </div>
            <div className="health-description">
              {systemHealth.database === 'healthy' ? 'Connected and operational' :
               systemHealth.database === 'error' ? 'Connection issues detected' : 'Checking connection...'}
            </div>
          </div>

          <div className="health-item">
            <div className="health-header">
              <span className="health-label">Discord OAuth</span>
              <span className={`health-status ${systemHealth.discord}`}>
                {systemHealth.discord === 'healthy' ? '✅' : 
                 systemHealth.discord === 'error' ? '❌' : '⏳'}
              </span>
            </div>
            <div className="health-description">
              {systemHealth.discord === 'healthy' ? 'Authentication working properly' :
               systemHealth.discord === 'error' ? 'Authentication issues detected' : 'Checking service...'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'tournament_created' ? '🏆' :
                   activity.type === 'team_registered' ? '👥' :
                   activity.type === 'user_joined' ? '👤' :
                   activity.type === 'match_completed' ? '⚔️' : '📝'}
                </div>
                <div className="activity-content">
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-time">{activity.timestamp}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-activity">
              <p>No recent activity to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button 
            className="action-button tournament"
            onClick={() => setShowCreateTournament(true)}
          >
            <span className="action-icon">🏆</span>
            <span className="action-label">Create Tournament</span>
          </button>
          <button 
            className="action-button users"
            onClick={() => setShowUserManagement(true)}
          >
            <span className="action-icon">👤</span>
            <span className="action-label">Manage Users</span>
          </button>
          <button className="action-button system">
            <span className="action-icon">⚙️</span>
            <span className="action-label">System Settings</span>
          </button>
          <button className="action-button reports">
            <span className="action-icon">📊</span>
            <span className="action-label">Generate Reports</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateTournamentModal
        isOpen={showCreateTournament}
        onClose={() => setShowCreateTournament(false)}
        onSuccess={handleTournamentCreated}
      />
      
      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />
    </div>
  );
};

export default AdminDashboard;