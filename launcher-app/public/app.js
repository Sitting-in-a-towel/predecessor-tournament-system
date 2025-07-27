let ws = null;
let logs = [];
let events = [];
let currentFilter = 'all';
let backendRunning = false;
let frontendRunning = false;

// Connect to WebSocket
function connect() {
    ws = new WebSocket('ws://localhost:4000');
    
    ws.onopen = () => {
        console.log('Connected to launcher server');
        addLog('Connected to launcher server', 'success', 'system');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from launcher server');
        addLog('Disconnected from launcher server', 'error', 'system');
        setTimeout(connect, 2000); // Reconnect after 2 seconds
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Handle incoming messages
function handleMessage(data) {
    switch (data.type) {
        case 'log':
            addLog(data.message, data.logType, data.source);
            break;
        case 'status':
            updateStatus(data.backend, data.frontend);
            break;
        case 'event':
            addEvent(data);
            break;
    }
}

// Add log entry
function addLog(message, type = 'log', source = 'system') {
    const timestamp = new Date().toLocaleTimeString();
    logs.push({ timestamp, message, type, source });
    
    // Keep only last 500 logs
    if (logs.length > 500) {
        logs.shift();
    }
    
    updateLogDisplay();
    updateStats();
}

// Add event
function addEvent(event) {
    const timestamp = new Date().toLocaleTimeString();
    events.unshift({ ...event, timestamp });
    
    // Keep only last 20 events
    if (events.length > 20) {
        events.pop();
    }
    
    updateEventDisplay();
    updateStats();
}

// Update status indicators
function updateStatus(backend, frontend) {
    backendRunning = backend;
    frontendRunning = frontend;
    
    const backendDot = document.getElementById('backend-status');
    const frontendDot = document.getElementById('frontend-status');
    
    if (backend) {
        backendDot.classList.add('running');
    } else {
        backendDot.classList.remove('running');
    }
    
    if (frontend) {
        frontendDot.classList.add('running');
    } else {
        frontendDot.classList.remove('running');
    }
}

// Update log display
function updateLogDisplay() {
    const container = document.getElementById('log-container');
    let filteredLogs = logs;
    
    switch (currentFilter) {
        case 'backend':
            filteredLogs = logs.filter(log => log.source === 'backend');
            break;
        case 'frontend':
            filteredLogs = logs.filter(log => log.source === 'frontend');
            break;
        case 'errors':
            filteredLogs = logs.filter(log => log.type === 'error');
            break;
        case 'events':
            // Show only event-related logs
            filteredLogs = logs.filter(log => 
                log.message.includes('User') || 
                log.message.includes('Team') || 
                log.message.includes('Tournament')
            );
            break;
    }
    
    const html = filteredLogs
        .slice(-200) // Show last 200 logs
        .map(log => {
            const sourceClass = log.source.toLowerCase();
            return `<div class="log-line ${log.type}">
                <span class="log-time">${log.timestamp}</span>
                <span class="log-source ${sourceClass}">${log.source}</span>
                <span class="log-message">${escapeHtml(log.message)}</span>
            </div>`;
        })
        .join('');
    
    container.innerHTML = html || '<div class="welcome-message">No logs to display</div>';
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Update event display
function updateEventDisplay() {
    const container = document.getElementById('event-list');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="event-empty">No events yet...</div>';
        return;
    }
    
    const html = events
        .slice(0, 10) // Show last 10 events
        .map(event => {
            return `<div class="event-item">
                <div>${event.message}</div>
                <div class="event-time">${event.timestamp}</div>
            </div>`;
        })
        .join('');
    
    container.innerHTML = html;
}

// Update statistics
function updateStats() {
    document.getElementById('log-count').textContent = `${logs.length} logs`;
    document.getElementById('event-count').textContent = `${events.length} events`;
}

// Set filter
function setFilter(filter) {
    currentFilter = filter;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update title
    const titles = {
        'all': 'All Logs',
        'backend': 'Backend Logs',
        'frontend': 'Frontend Logs',
        'errors': 'Error Logs',
        'events': 'User Events'
    };
    document.getElementById('log-title').textContent = titles[filter];
    
    updateLogDisplay();
}

// Send command to server
function sendCommand(action) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action }));
    }
}

// Clear logs
function clearLogs() {
    logs = [];
    updateLogDisplay();
    updateStats();
    addLog('Logs cleared', 'info', 'system');
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize
connect();