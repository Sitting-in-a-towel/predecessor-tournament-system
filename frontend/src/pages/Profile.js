import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account settings and tournament preferences.</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.discordUsername?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{user?.discordUsername}</h2>
              <p>Discord ID: {user?.discordID}</p>
              {user?.isAdmin && <span className="admin-badge">Admin</span>}
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-group">
              <label>Email</label>
              <p>{user?.email || 'Not provided'}</p>
            </div>

            <div className="detail-group">
              <label>Member Since</label>
              <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>

            <div className="detail-group">
              <label>Last Active</label>
              <p>{user?.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <h3>Tournament Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>0</h4>
              <p>Tournaments Joined</p>
            </div>
            <div className="stat-card">
              <h4>0</h4>
              <p>Teams Created</p>
            </div>
            <div className="stat-card">
              <h4>0</h4>
              <p>Matches Played</p>
            </div>
            <div className="stat-card">
              <h4>0</h4>
              <p>Wins</p>
            </div>
          </div>
        </div>

        <div className="profile-preferences">
          <h3>Tournament Preferences</h3>
          <div className="preferences-form">
            <div className="form-group">
              <label>Preferred Role</label>
              <select>
                <option value="">Select Role</option>
                <option value="carry">Carry</option>
                <option value="support">Support</option>
                <option value="midlane">Midlane</option>
                <option value="offlane">Offlane</option>
                <option value="jungle">Jungle</option>
                <option value="flex">Flex</option>
              </select>
            </div>

            <div className="form-group">
              <label>Experience Level</label>
              <select>
                <option value="">Select Experience</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="professional">Professional</option>
              </select>
            </div>

            <button className="btn-primary">Save Preferences</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;