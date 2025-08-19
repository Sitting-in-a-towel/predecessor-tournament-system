# Monitoring and Analytics Setup

## Overview

This guide covers setting up comprehensive monitoring for your Predecessor Tournament System, including error tracking, performance monitoring, and user analytics.

## Monitoring Stack

### 1. Error Tracking - Sentry
**Purpose**: Track and debug errors in real-time
**Cost**: Free tier (5,000 errors/month)
**Setup time**: 15 minutes

### 2. Performance Monitoring - LogRocket  
**Purpose**: Session replay and performance insights
**Cost**: Free tier (1,000 sessions/month)
**Setup time**: 10 minutes

### 3. Analytics - Google Analytics 4
**Purpose**: User behavior and traffic analysis
**Cost**: Free
**Setup time**: 10 minutes

### 4. Uptime Monitoring - Uptime Robot
**Purpose**: Website uptime monitoring and alerts
**Cost**: Free tier (50 monitors)
**Setup time**: 5 minutes

## Setup Instructions

### 1. Error Tracking with Sentry

#### Backend Setup
```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

Add to `backend/utils/sentry.js`:
```javascript
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

module.exports = Sentry;
```

Add to `backend/server.js`:
```javascript
const Sentry = require('./utils/sentry');

// Add this BEFORE any other middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Add this AFTER all routes but BEFORE error handlers
app.use(Sentry.Handlers.errorHandler());
```

#### Frontend Setup
```bash
cd frontend
npm install @sentry/react
```

Add to `frontend/src/utils/sentry.js`:
```javascript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost', /^https:\/\/yourapi\.railway\.app\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 2. Performance Monitoring with LogRocket

```bash
cd frontend
npm install logrocket logrocket-react
```

Add to `frontend/src/utils/logrocket.js`:
```javascript
import LogRocket from 'logrocket';

LogRocket.init(process.env.REACT_APP_LOGROCKET_APP_ID);

// Identify users for better tracking
export const identifyUser = (user) => {
  LogRocket.identify(user.userID, {
    name: user.displayName,
    email: user.email,
  });
};

export default LogRocket;
```

### 3. Analytics with Google Analytics 4

```bash
cd frontend
npm install react-ga4
```

Add to `frontend/src/utils/analytics.js`:
```javascript
import ReactGA from 'react-ga4';

const initGA = () => {
  ReactGA.initialize(process.env.REACT_APP_GA_MEASUREMENT_ID);
};

const trackPageView = (path) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

const trackEvent = (action, category = 'User', label = '', value = 0) => {
  ReactGA.event({
    action,
    category,
    label,
    value,
  });
};

export { initGA, trackPageView, trackEvent };
```

### 4. Uptime Monitoring with Uptime Robot

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free account
3. Add monitors for:
   - Frontend: `https://your-site.vercel.app`
   - Backend API: `https://your-api.railway.app/health`
   - Key endpoints: `/api/tournaments`, `/api/auth/profile`

## Environment Variables

Add these to your production environment:

### Frontend (.env)
```bash
# Error Tracking
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Performance Monitoring  
REACT_APP_LOGROCKET_APP_ID=your-logrocket-app-id

# Analytics
REACT_APP_GA_MEASUREMENT_ID=G-YOUR-GA-ID
```

### Backend (.env)
```bash
# Error Tracking
SENTRY_DSN=https://your-backend-sentry-dsn@sentry.io/project-id
```

## Dashboard Setup

### 1. Create Monitoring Dashboard

Create `frontend/src/admin/MonitoringDashboard.js`:
```javascript
import React, { useState, useEffect } from 'react';

const MonitoringDashboard = () => {
  const [metrics, setMetrics] = useState(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="monitoring-dashboard">
      <h2>System Monitoring</h2>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Active Users</h3>
          <div className="metric-value">{metrics?.activeUsers || 0}</div>
        </div>
        
        <div className="metric-card">
          <h3>Total Tournaments</h3>
          <div className="metric-value">{metrics?.totalTournaments || 0}</div>
        </div>
        
        <div className="metric-card">
          <h3>Error Rate</h3>
          <div className="metric-value">{metrics?.errorRate || '0%'}</div>
        </div>
        
        <div className="metric-card">
          <h3>Response Time</h3>
          <div className="metric-value">{metrics?.responseTime || '0ms'}</div>
        </div>
      </div>

      <div className="external-links">
        <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">
          View Sentry Dashboard
        </a>
        <a href="https://app.logrocket.com" target="_blank" rel="noopener noreferrer">
          View LogRocket Sessions
        </a>
        <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
          View Google Analytics
        </a>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
```

### 2. Backend Metrics Endpoint

Add to `backend/routes/admin.js`:
```javascript
// System metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const [users, tournaments, teams] = await Promise.all([
      airtableService.getUsersCount(),
      airtableService.getTournamentsCount(),
      airtableService.getTeamsCount()
    ]);

    const metrics = {
      activeUsers: users,
      totalTournaments: tournaments,
      totalTeams: teams,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});
```

## Alert Configuration

### 1. Sentry Alerts
- **Error Threshold**: > 10 errors in 5 minutes
- **Performance Issues**: Response time > 2 seconds
- **Integration**: Discord webhook or email

### 2. Uptime Robot Alerts
- **Downtime**: Site down for > 2 minutes
- **Response Time**: > 10 seconds response time
- **Integration**: Discord webhook, SMS, or email

### 3. Custom Alerts
Create custom alerts for:
- High tournament creation rate
- Failed login attempts
- Database connection issues

## Performance Optimization

### 1. Frontend Optimization
```javascript
// Code splitting
const LazyComponent = lazy(() => import('./Component'));

// Performance monitoring
const trackPerformance = () => {
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0];
    trackEvent('page_load_time', 'Performance', 'load', navigation.loadEventEnd);
  }
};
```

### 2. Backend Optimization
```javascript
// Response time middleware
const responseTime = require('response-time');
app.use(responseTime((req, res, time) => {
  if (time > 1000) { // Log slow requests
    logger.warn(`Slow request: ${req.method} ${req.url} - ${time}ms`);
  }
}));
```

## Monitoring Checklist

### Daily Checks
- [ ] Review error rate in Sentry
- [ ] Check uptime status
- [ ] Monitor active users
- [ ] Review performance metrics

### Weekly Checks  
- [ ] Analyze user behavior in GA4
- [ ] Review session replays in LogRocket
- [ ] Check for performance regressions
- [ ] Update monitoring thresholds

### Monthly Checks
- [ ] Review and optimize monitoring costs
- [ ] Update alert configurations
- [ ] Analyze long-term trends
- [ ] Plan performance improvements

## Cost Management

### Free Tier Limits
- **Sentry**: 5,000 errors/month
- **LogRocket**: 1,000 sessions/month  
- **Google Analytics**: Unlimited (free)
- **Uptime Robot**: 50 monitors

### Scaling Costs
- **Small Tournament**: All free tiers sufficient
- **Medium Tournament**: May need LogRocket paid plan ($99/month)
- **Large Tournament**: May need Sentry paid plan ($26/month)

## Troubleshooting

### Common Issues

1. **High Error Rate**
   - Check Sentry for error patterns
   - Review recent deployments
   - Check external service status

2. **Slow Performance**
   - Review LogRocket sessions
   - Check database query performance
   - Monitor server resources

3. **Low User Engagement**
   - Analyze GA4 user flows
   - Review session recordings
   - Check for UX issues

### Emergency Response

1. **Site Down**
   - Check Uptime Robot alerts
   - Verify hosting provider status
   - Review recent changes

2. **Database Issues**
   - Check Railway database metrics
   - Review connection pool status
   - Monitor query performance

3. **High Traffic**
   - Monitor resource usage
   - Enable additional monitoring
   - Prepare for scaling