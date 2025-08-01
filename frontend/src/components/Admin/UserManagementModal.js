import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const UserManagementModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [updatingUser, setUpdatingUser] = useState(null);

  const loadUsers = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users?page=${page}&limit=20`, {
        withCredentials: true
      });

      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    setUpdatingUser(userId);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/users/${userId}`,
        { isAdmin: !currentStatus },
        { withCredentials: true }
      );

      toast.success(response.data.message);
      
      // Update user in local state
      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, is_admin: !currentStatus }
          : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setUpdatingUser(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div className="modal-header" style={{
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #333',
          paddingBottom: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: '#fff', margin: 0 }}>User Management</h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>
            Loading users...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#333',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>Username</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>Email</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>Admin</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>Joined</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>Actions</div>
              </div>

              {users.map(user => (
                <div 
                  key={user.user_id}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ color: '#fff' }}>
                    {user.discord_username}
                    {user.omeda_player_id && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Omeda: {user.omeda_player_id.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                  <div style={{ color: '#fff', fontSize: '14px' }}>
                    {user.email || 'No email'}
                  </div>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: user.is_admin ? '#28a745' : '#6c757d',
                      color: '#fff'
                    }}>
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <button
                      onClick={() => toggleAdminStatus(user.user_id, user.is_admin)}
                      disabled={updatingUser === user.user_id}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: user.is_admin ? '#dc3545' : '#007bff',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: updatingUser === user.user_id ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {updatingUser === user.user_id 
                        ? 'Updating...' 
                        : user.is_admin 
                          ? 'Demote' 
                          : 'Promote'
                      }
                    </button>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  No users found
                </div>
              )}
            </div>

            {pagination.pages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '0.5rem',
                marginTop: '1rem'
              }}>
                <button
                  onClick={() => loadUsers(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    cursor: pagination.page === 1 || loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>

                <span style={{ 
                  padding: '8px 12px',
                  color: '#fff',
                  alignSelf: 'center'
                }}>
                  Page {pagination.page} of {pagination.pages}
                </span>

                <button
                  onClick={() => loadUsers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages || loading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    cursor: pagination.page === pagination.pages || loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #333'
            }}>
              <div style={{ color: '#666', fontSize: '14px' }}>
                Showing {users.length} of {pagination.total} users
              </div>
              
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#f8f9fa',
                  color: '#333',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagementModal;