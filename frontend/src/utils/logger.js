/**
 * Frontend Logger for React Application
 * Captures client-side events and sends them to backend for unified logging
 */

class FrontendLogger {
    constructor() {
        this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        this.enabled = true;
        this.queue = [];
        this.isOnline = navigator.onLine;
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.flushQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
        
        // Capture unhandled errors
        this.setupErrorHandling();
        
        console.log('Frontend Logger initialized');
    }
    
    setupErrorHandling() {
        // Capture JavaScript errors
        window.addEventListener('error', (event) => {
            this.error('GLOBAL_ERROR', 'Unhandled JavaScript error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('PROMISE_REJECTION', 'Unhandled promise rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack
            });
        });
    }
    
    // Main logging methods
    info(component, message, extraData = {}) {
        this.log('INFO', component, message, extraData);
    }
    
    warn(component, message, extraData = {}) {
        this.log('WARN', component, message, extraData);
    }
    
    error(component, message, extraData = {}) {
        this.log('ERROR', component, message, extraData);
        console.error(`[${component}] ${message}`, extraData);
    }
    
    debug(component, message, extraData = {}) {
        if (process.env.NODE_ENV === 'development') {
            this.log('DEBUG', component, message, extraData);
        }
    }
    
    // Specific logging methods
    logUserAction(action, data = {}) {
        this.info('USER_ACTION', `User ${action}`, {
            action,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            ...data
        });
    }
    
    logApiCall(method, endpoint, duration, status, data = {}) {
        const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
        this.log(level.toUpperCase(), 'API_CALL', `${method} ${endpoint} - ${status} (${duration}ms)`, {
            method,
            endpoint,
            duration,
            status,
            ...data
        });
    }
    
    logNavigation(from, to) {
        this.info('NAVIGATION', `Navigated from ${from} to ${to}`, {
            from,
            to,
            timestamp: new Date().toISOString()
        });
    }
    
    logDraftEvent(draftId, event, data = {}) {
        this.info('DRAFT', `Draft ${draftId}: ${event}`, {
            draftId,
            event,
            ...data
        });
    }
    
    logPerformance(metric, value, data = {}) {
        const level = value > 3000 ? 'WARN' : 'INFO'; // 3 second threshold
        this.log(level, 'PERFORMANCE', `${metric}: ${value}ms`, {
            metric,
            value,
            ...data
        });
    }
    
    // Private methods
    log(level, component, message, extraData = {}) {
        if (!this.enabled) return;
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            component,
            message,
            extraData,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            const consoleMethod = level.toLowerCase() === 'error' ? 'error' : 
                                level.toLowerCase() === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[${component}] ${message}`, extraData);
        }
        
        // Send to backend
        this.sendToBackend(logEntry);
    }
    
    sendToBackend(logEntry) {
        if (this.isOnline) {
            // Try to send immediately
            fetch(`${this.apiUrl}/logs/frontend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            }).catch(() => {
                // If failed, add to queue
                this.queue.push(logEntry);
            });
        } else {
            // Add to queue if offline
            this.queue.push(logEntry);
        }
    }
    
    flushQueue() {
        if (this.queue.length === 0) return;
        
        const logs = [...this.queue];
        this.queue = [];
        
        fetch(`${this.apiUrl}/logs/frontend-batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ logs })
        }).catch(() => {
            // If still failed, put logs back in queue
            this.queue.unshift(...logs);
        });
    }
    
    // Performance monitoring
    measurePageLoad() {
        window.addEventListener('load', () => {
            if (window.performance && window.performance.timing) {
                const timing = window.performance.timing;
                const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
                const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
                
                this.logPerformance('page_load', pageLoadTime, {
                    dom_content_loaded: domContentLoaded,
                    page: window.location.pathname
                });
            }
        });
    }
    
    // API call wrapper for automatic logging
    wrapApiCall(originalFetch) {
        return async (...args) => {
            const startTime = performance.now();
            const [url, options = {}] = args;
            
            try {
                const response = await originalFetch(...args);
                const duration = Math.round(performance.now() - startTime);
                
                this.logApiCall(
                    options.method || 'GET',
                    url,
                    duration,
                    response.status,
                    { success: response.ok }
                );
                
                return response;
            } catch (error) {
                const duration = Math.round(performance.now() - startTime);
                
                this.logApiCall(
                    options.method || 'GET',
                    url,
                    duration,
                    0,
                    { error: error.message }
                );
                
                throw error;
            }
        };
    }
}

// Create singleton instance
const logger = new FrontendLogger();

// Start performance monitoring
logger.measurePageLoad();

export default logger;