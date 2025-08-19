const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Use unified log directory
const logDir = path.join(__dirname, '../../logs');
const localLogDir = 'logs';

// Create both log directories if they don't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(localLogDir)) {
  fs.mkdirSync(localLogDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'predecessor-tournament-backend'
  },
  transports: [
    // Local logs (existing functionality)
    new winston.transports.File({
      filename: path.join(localLogDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(localLogDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Unified logs for troubleshooting
    new winston.transports.File({
      filename: path.join(logDir, 'backend_api.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 3
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'system_errors.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 3
    })
  ]
});

// Always log to console (needed for Render logs)
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Add helper methods for specific logging types
logger.logRequest = function(req, res, duration) {
  const message = `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
  this.info(message, {
    component: 'API',
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
};

logger.logDatabase = function(operation, table, data = {}) {
  const message = `Database ${operation} on ${table}`;
  this.info(message, {
    component: 'DATABASE',
    operation,
    table,
    ...data
  });
};

logger.logDraft = function(draftId, event, data = {}) {
  const message = `Draft ${draftId}: ${event}`;
  this.info(message, {
    component: 'DRAFT',
    draftId,
    ...data
  });
};

logger.logAuth = function(event, userId, data = {}) {
  const message = `Auth ${event} for user ${userId}`;
  this.info(message, {
    component: 'AUTH',
    userId,
    ...data
  });
};

logger.logPerformance = function(operation, duration, data = {}) {
  const message = `Performance: ${operation} took ${duration}ms`;
  const level = duration > 1000 ? 'warn' : 'info';
  this.log(level, message, {
    component: 'PERFORMANCE',
    operation,
    duration,
    ...data
  });
};

// Initialize logging
logger.info('Backend API Logger initialized', { component: 'SYSTEM' });

module.exports = logger;