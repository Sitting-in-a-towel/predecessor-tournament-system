const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * Frontend logging endpoints
 * Receives logs from React frontend and writes them to unified log files
 */

// Single frontend log entry
router.post('/frontend', (req, res) => {
    try {
        const { timestamp, level, component, message, extraData, userAgent, url } = req.body;
        
        // Format the log entry for our system
        const logMessage = `Frontend ${component}: ${message}`;
        const logData = {
            component: `FRONTEND_${component}`,
            frontend_timestamp: timestamp,
            user_agent: userAgent,
            frontend_url: url,
            ...extraData
        };
        
        // Log at appropriate level
        switch (level.toLowerCase()) {
            case 'error':
                logger.error(logMessage, logData);
                break;
            case 'warn':
                logger.warn(logMessage, logData);
                break;
            case 'debug':
                logger.debug(logMessage, logData);
                break;
            default:
                logger.info(logMessage, logData);
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Failed to process frontend log', { error: error.message });
        res.status(500).json({ error: 'Failed to process log' });
    }
});

// Batch frontend log entries
router.post('/frontend-batch', (req, res) => {
    try {
        const { logs } = req.body;
        
        if (!Array.isArray(logs)) {
            return res.status(400).json({ error: 'Logs must be an array' });
        }
        
        logs.forEach(log => {
            const { timestamp, level, component, message, extraData, userAgent, url } = log;
            
            const logMessage = `Frontend ${component}: ${message}`;
            const logData = {
                component: `FRONTEND_${component}`,
                frontend_timestamp: timestamp,
                user_agent: userAgent,
                frontend_url: url,
                ...extraData
            };
            
            switch (level.toLowerCase()) {
                case 'error':
                    logger.error(logMessage, logData);
                    break;
                case 'warn':
                    logger.warn(logMessage, logData);
                    break;
                case 'debug':
                    logger.debug(logMessage, logData);
                    break;
                default:
                    logger.info(logMessage, logData);
            }
        });
        
        logger.info(`Processed ${logs.length} frontend logs`, { 
            component: 'LOG_BATCH',
            count: logs.length 
        });
        
        res.status(200).json({ success: true, processed: logs.length });
    } catch (error) {
        logger.error('Failed to process frontend log batch', { error: error.message });
        res.status(500).json({ error: 'Failed to process log batch' });
    }
});

// Get recent logs for debugging (admin only)
router.get('/recent', (req, res) => {
    // TODO: Add authentication check for admin users
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const logDir = path.join(__dirname, '../../logs');
        const files = {
            phoenix: path.join(logDir, 'phoenix_draft.log'),
            backend: path.join(logDir, 'backend_api.log'),
            pubsub: path.join(logDir, 'pubsub_events.log'),
            errors: path.join(logDir, 'system_errors.log')
        };
        
        const logs = {};
        
        Object.keys(files).forEach(key => {
            try {
                if (fs.existsSync(files[key])) {
                    const content = fs.readFileSync(files[key], 'utf8');
                    // Get last 100 lines
                    const lines = content.split('\n').slice(-100);
                    logs[key] = lines.join('\n');
                } else {
                    logs[key] = 'Log file not found';
                }
            } catch (err) {
                logs[key] = `Error reading log: ${err.message}`;
            }
        });
        
        res.json(logs);
    } catch (error) {
        logger.error('Failed to retrieve logs', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});

module.exports = router;