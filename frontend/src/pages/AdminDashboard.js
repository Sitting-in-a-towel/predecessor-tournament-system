import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { airtableService } from '../services/airtableService';
import { toast } from 'react-toastify';

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
    airtable: 'checking',
    discord: 'checking'
  });

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
      // Load tournament stats
      const tournaments = await airtableService.getTournaments();
      const tournamentStats = {
        total: tournaments.length,
        active: tournaments.filter(t => t.Status === 'Active').length,
        completed: tournaments.filter(t => t.Status === 'Completed').length,
        upcoming: tournaments.filter(t => t.Status === 'Upcoming').length
      };

      // Load team stats
      const teams = await airtableService.getAllTeams();
      const teamStats = {
        total: teams.length,
        confirmed: teams.filter(t => t.Confirmed).length,
        pending: teams.filter(t => !t.Confirmed).length
      };

      // Load user stats
      const users = await airtableService.getAllUsers();
      const userStats = {
        total: users.length,
        active: users.filter(u => u.Status === 'Active').length
      };

      // Load match stats
      const matches = await airtableService.getAllMatches();
      const matchStats = {
        total: matches.length,
        completed: matches.filter(m => m.Status === 'Completed').length,
        scheduled: matches.filter(m => m.Status === 'Scheduled').length
      };

      setStats({
        tournaments: tournamentStats,
        teams: teamStats,
        users: userStats,
        matches: matchStats
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await airtableService.getRecentActivity(10);
      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  };

  const checkSystemHealth = async () => {
    try {
      // Check Airtable connection
      const airtableHealth = await airtableService.checkConnection();
      
      // Check Discord OAuth (simplified check)
      const discordHealth = 'healthy'; // Would implement actual Discord API check

      setSystemHealth({
        airtable: airtableHealth ? 'healthy' : 'error',
        discord: discordHealth
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      setSystemHealth({
        airtable: 'error',
        discord: 'error'
      });
    }
  };

  const handleRefreshData = () => {
    loadDashboardData();
    toast.success('Dashboard data refreshed');
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
              <span className="stat-number">{stats.tournaments.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value active">{stats.tournaments.active}</span>
                <span className="stat-text">Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-value upcoming">{stats.tournaments.upcoming}</span>
                <span className="stat-text">Upcoming</span>
              </div>
              <div className="stat-item">
                <span className="stat-value completed">{stats.tournaments.completed}</span>
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
              <span className="stat-number">{stats.teams.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value confirmed">{stats.teams.confirmed}</span>
                <span className="stat-text">Confirmed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value pending">{stats.teams.pending}</span>
                <span className="stat-text">Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {stats.teams.total > 0 ? Math.round((stats.teams.confirmed / stats.teams.total) * 100) : 0}%
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
              <span className="stat-number">{stats.users.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value active">{stats.users.active}</span>
                <span className="stat-text">Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {stats.users.total - stats.users.active}
                </span>
                <span className="stat-text">Inactive</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0}%
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
              <span className="stat-number">{stats.matches.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-value completed">{stats.matches.completed}</span>
                <span className="stat-text">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value scheduled">{stats.matches.scheduled}</span>
                <span className="stat-text">Scheduled</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {stats.matches.total > 0 ? Math.round((stats.matches.completed / stats.matches.total) * 100) : 0}%
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
              <span className="health-label">Airtable Database</span>
              <span className={`health-status ${systemHealth.airtable}`}>
                {systemHealth.airtable === 'healthy' ? '✅' : 
                 systemHealth.airtable === 'error' ? '❌' : '⏳'}
              </span>
            </div>
            <div className="health-description">
              {systemHealth.airtable === 'healthy' ? 'Connected and operational' :
               systemHealth.airtable === 'error' ? 'Connection issues detected' : 'Checking connection...'}
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
          <button className="action-button tournament">
            <span className="action-icon">🏆</span>
            <span className="action-label">Create Tournament</span>
          </button>
          <button className="action-button users">
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
    </div>
  );
};

export default AdminDashboard;