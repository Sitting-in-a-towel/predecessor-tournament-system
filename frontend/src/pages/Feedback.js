import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Feedback = () => {
  const { user, isAuthenticated } = useAuth();
  const [feedbackData, setFeedbackData] = useState({
    type: 'feedback',
    category: 'general',
    subject: '',
    message: '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFeedbackData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedbackData.subject.trim() || !feedbackData.message.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setLoading(true);
    
    try {
      // For now, just simulate success since backend endpoint doesn't exist yet
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Thank you for your feedback! We\'ll review it and get back to you if needed.');
      
      // Reset form
      setFeedbackData({
        type: 'feedback',
        category: 'general',
        subject: '',
        message: '',
        email: user?.email || ''
      });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '2.5rem', marginBottom: '1rem' }}>
          Feedback & Support
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Help us improve the tournament platform by sharing your feedback or reporting issues
        </p>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Feedback Form */}
        <div style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '2rem',
          boxShadow: 'var(--shadow)'
        }}>
          <h2 style={{ 
            color: 'var(--primary-color)', 
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem'
          }}>Submit Feedback</h2>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-color)', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem' 
                }}>Type</label>
                <select
                  name="type"
                  value={feedbackData.type}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--background-color)',
                    color: 'var(--text-color)',
                    fontSize: '14px'
                  }}
                >
                  <option value="feedback">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="support">Technical Support</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-color)', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem' 
                }}>Category</label>
                <select
                  name="category"
                  value={feedbackData.category}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--background-color)',
                    color: 'var(--text-color)',
                    fontSize: '14px'
                  }}
                >
                  <option value="general">General</option>
                  <option value="tournaments">Tournaments</option>
                  <option value="teams">Team Management</option>
                  <option value="invitations">Team Invitations</option>
                  <option value="profile">User Profile</option>
                  <option value="ui">User Interface</option>
                  <option value="performance">Performance</option>
                  <option value="discord">Discord Integration</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-color)', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>Subject</label>
              <input
                type="text"
                name="subject"
                value={feedbackData.subject}
                onChange={handleInputChange}
                placeholder="Brief description of your feedback or issue"
                maxLength="200"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#333',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-color)', 
                fontWeight: 'bold', 
                marginBottom: '0.5rem' 
              }}>Message</label>
              <textarea
                name="message"
                value={feedbackData.message}
                onChange={handleInputChange}
                placeholder="Please provide detailed information about your feedback, feature request, or issue. Include steps to reproduce if reporting a bug."
                rows="6"
                maxLength="2000"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  color: '#333',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {feedbackData.message.length}/2000 characters
              </small>
            </div>

            {!isAuthenticated && (
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-color)', 
                  fontWeight: 'bold', 
                  marginBottom: '0.5rem' 
                }}>Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={feedbackData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    color: '#333',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Provide your email if you'd like a response
                </small>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? 'var(--border-color)' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--border-radius)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                justifySelf: 'start'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>

        {/* Information Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow)'
          }}>
            <h3 style={{ color: 'var(--primary-color)', margin: '0 0 1rem 0' }}>
              🐛 Bug Reports
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
              Found something broken? Please include:
            </p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0.5rem 0 0 1rem' }}>
              <li>Steps to reproduce the issue</li>
              <li>What you expected to happen</li>
              <li>What actually happened</li>
              <li>Browser and device info</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow)'
          }}>
            <h3 style={{ color: 'var(--primary-color)', margin: '0 0 1rem 0' }}>
              💡 Feature Requests
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
              Have an idea to improve the platform? We'd love to hear:
            </p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0.5rem 0 0 1rem' }}>
              <li>What feature you'd like to see</li>
              <li>How it would help you</li>
              <li>Any specific requirements</li>
              <li>Examples from other platforms</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;