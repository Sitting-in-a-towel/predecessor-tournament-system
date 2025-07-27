const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Launcher UI running at http://localhost:${PORT}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Process management
let backendProcess = null;
let frontendProcess = null;
const clients = new Set();

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Parse log line to determine type
function getLogType(line) {
  const lowerLine = line.toLowerCase();
  if (lowerLine.includes('error') || lowerLine.includes('failed')) return 'error';
  if (lowerLine.includes('warn') || lowerLine.includes('warning')) return 'warning';
  if (lowerLine.includes('success') || lowerLine.includes('started') || lowerLine.includes('compiled successfully')) return 'success';
  if (lowerLine.includes('info:')) return 'info';
  return 'log';
}

// Extract meaningful events from logs
function extractEvent(line, source) {
  // User actions
  if (line.includes('User') && line.includes('logged in')) {
    const userMatch = line.match(/User (\S+) logged in/);
    if (userMatch) {
      return {
        type: 'user_action',
        action: 'login',
        user: userMatch[1],
        message: `User ${userMatch[1]} logged in`
      };
    }
  }
  
  if (line.includes('Team created:')) {
    const teamMatch = line.match(/Team created: (\S+) by user (\S+)/);
    if (teamMatch) {
      return {
        type: 'user_action',
        action: 'team_created',
        team: teamMatch[1],
        user: teamMatch[2],
        message: `Team "${teamMatch[1]}" created by ${teamMatch[2]}`
      };
    }
  }

  if (line.includes('Tournament created:')) {
    const tournamentMatch = line.match(/Tournament created: (\S+) by user (\S+)/);
    if (tournamentMatch) {
      return {
        type: 'user_action',
        action: 'tournament_created',
        tournament: tournamentMatch[1],
        user: tournamentMatch[2],
        message: `Tournament created by ${tournamentMatch[2]}`
      };
    }
  }

  // API calls
  if (line.includes('GET /api/') || line.includes('POST /api/')) {
    const apiMatch = line.match(/(GET|POST|PUT|DELETE) (\/api\/\S+) (\d+)/);
    if (apiMatch) {
      return {
        type: 'api_call',
        method: apiMatch[1],
        endpoint: apiMatch[2],
        status: apiMatch[3],
        message: `${apiMatch[1]} ${apiMatch[2]} - ${apiMatch[3]}`
      };
    }
  }

  return null;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  clients.add(ws);
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    backend: backendProcess !== null,
    frontend: frontendProcess !== null
  }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch (data.action) {
      case 'start':
        startServices();
        break;
      case 'stop':
        stopServices();
        break;
      case 'restart':
        restartServices();
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Start services
function startServices() {
  broadcast({ type: 'log', message: 'Starting services...', logType: 'info', source: 'system' });

  // Start backend
  if (!backendProcess) {
    const backendPath = path.join(__dirname, '..', 'backend');
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    backendProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          broadcast({
            type: 'log',
            message: line,
            logType: getLogType(line),
            source: 'backend'
          });

          // Check for events
          const event = extractEvent(line, 'backend');
          if (event) {
            broadcast({ type: 'event', ...event });
          }
        }
      });
    });

    backendProcess.stderr.on('data', (data) => {
      broadcast({
        type: 'log',
        message: data.toString(),
        logType: 'error',
        source: 'backend'
      });
    });

    backendProcess.on('close', () => {
      backendProcess = null;
      broadcast({ type: 'status', backend: false });
    });
  }

  // Start frontend after delay
  setTimeout(() => {
    if (!frontendProcess) {
      const frontendPath = path.join(__dirname, '..', 'frontend');
      frontendProcess = spawn('npm', ['start'], {
        cwd: frontendPath,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1', BROWSER: 'none' }
      });

      frontendProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            broadcast({
              type: 'log',
              message: line,
              logType: getLogType(line),
              source: 'frontend'
            });
          }
        });
      });

      frontendProcess.stderr.on('data', (data) => {
        broadcast({
          type: 'log',
          message: data.toString(),
          logType: 'error',
          source: 'frontend'
        });
      });

      frontendProcess.on('close', () => {
        frontendProcess = null;
        broadcast({ type: 'status', frontend: false });
      });
    }
  }, 3000);

  // Update status
  setTimeout(() => {
    broadcast({ type: 'status', backend: true, frontend: true });
  }, 5000);
}

// Stop services
function stopServices() {
  broadcast({ type: 'log', message: 'Stopping services...', logType: 'info', source: 'system' });
  
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }
}

// Restart services
function restartServices() {
  stopServices();
  setTimeout(startServices, 2000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  stopServices();
  process.exit();
});