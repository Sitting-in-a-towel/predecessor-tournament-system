import React from 'react';
import { toast } from 'react-toastify';

class BracketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Bracket Error:', error, errorInfo);
    
    // Show toast notification
    toast.error('An error occurred in the bracket system. Please refresh the page.');
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#2a2a2a',
          borderRadius: '8px',
          border: '1px solid #ed4245',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#ed4245', marginBottom: '10px' }}>
            Something went wrong with the bracket
          </h3>
          <p style={{ color: '#ccc', marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default BracketErrorBoundary;