import React, { useState } from 'react';
import { toast } from 'react-toastify';
import LoadingSpinner from '../Common/LoadingSpinner';
import { backendService } from '../../services/backendService';

const DeploymentChecklist = () => {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const runChecklist = async () => {
    try {
      setLoading(true);
      const response = await backendService.axios.get('/deployment/checklist');
      setChecklist(response.data);
      setLastRun(new Date());
      
      if (response.data.status === 'READY') {
        toast.success('All checks passed! Ready for deployment');
      } else {
        toast.error('Critical issues found - deployment blocked');
      }
    } catch (error) {
      console.error('Error running checklist:', error);
      toast.error('Failed to run deployment checklist');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warn': return '⚠️';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'READY': return '#22c55e';
      case 'BLOCKED': return '#ef4444';
      case 'ERROR': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="deployment-checklist">
      <div className="checklist-header">
        <h2>Pre-Deployment Checklist</h2>
        <p>Run comprehensive checks before deploying to production</p>
        
        <div className="checklist-actions">
          <button 
            onClick={runChecklist} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Running Checklist...' : 'Run Checklist'}
          </button>
          
          {lastRun && (
            <span className="last-run">
              Last run: {lastRun.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="checklist-loading">
          <LoadingSpinner message="Running pre-deployment checks..." />
        </div>
      )}

      {checklist && (
        <div className="checklist-results">
          <div className="results-header">
            <div 
              className="overall-status"
              style={{ 
                backgroundColor: `${getStatusColor(checklist.status)}20`,
                color: getStatusColor(checklist.status),
                border: `2px solid ${getStatusColor(checklist.status)}`
              }}
            >
              <h3>Status: {checklist.status}</h3>
              <p>{checklist.recommendation}</p>
            </div>
            
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-number">{checklist.checklist.summary.passed}</span>
                <span className="stat-label">Passed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{checklist.checklist.summary.failed}</span>
                <span className="stat-label">Failed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{checklist.checklist.summary.warnings}</span>
                <span className="stat-label">Warnings</span>
              </div>
            </div>
          </div>

          <div className="checks-section">
            <h4>Detailed Checks</h4>
            {checklist.checklist.checks.map((check, index) => (
              <div key={index} className={`check-item ${check.status}`}>
                <div className="check-header">
                  <span className="check-icon">{getStatusIcon(check.status)}</span>
                  <h5>{check.name}</h5>
                  <span className={`check-status ${check.status}`}>
                    {check.status.toUpperCase()}
                  </span>
                </div>
                
                <p className="check-description">{check.description}</p>
                
                {check.details && check.details.length > 0 && (
                  <div className="check-details">
                    <strong>Details:</strong>
                    <ul>
                      {check.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {checklist.checklist.warnings.length > 0 && (
            <div className="warnings-section">
              <h4>⚠️ Warnings</h4>
              <ul>
                {checklist.checklist.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {checklist.checklist.errors.length > 0 && (
            <div className="errors-section">
              <h4>❌ Critical Issues</h4>
              <ul>
                {checklist.checklist.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="checklist-footer">
            <p>
              <strong>Environment:</strong> {checklist.checklist.environment} | 
              <strong> Timestamp:</strong> {new Date(checklist.checklist.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeploymentChecklist;