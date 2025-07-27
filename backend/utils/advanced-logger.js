const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, stack, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    
    if (service) {
      log = `[${timestamp}] [${service}] ${level}: ${message}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// File format for structured logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'predecessor-tournament' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // API access logs
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Custom logging methods
logger.api = (method, url, statusCode, responseTime, userAgent = '', userId = '') => {
  logger.log('http', `${method} ${url} ${statusCode} ${responseTime}ms`, {
    method,
    url,
    statusCode,
    responseTime,
    userAgent,
    userId,
    timestamp: new Date().toISOString()
  });
};

logger.auth = (action, userId, success = true, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, `Auth ${action}: ${userId}`, {
    action,
    userId,
    success,
    ...details,
    timestamp: new Date().toISOString()
  });
};

logger.tournament = (action, tournamentId, userId, details = {}) => {
  logger.info(`Tournament ${action}: ${tournamentId}`, {
    action,
    tournamentId,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

logger.team = (action, teamId, userId, details = {}) => {
  logger.info(`Team ${action}: ${teamId}`, {
    action,
    teamId,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

logger.database = (operation, table, success = true, error = null) => {
  const level = success ? 'info' : 'error';
  const message = `Database ${operation} on ${table}`;
  
  if (error) {
    logger.log(level, message, {
      operation,
      table,
      success,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } else {
    logger.log(level, message, {
      operation,
      table,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

// Error handling for uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: fileFormat
  })
);

// Error handling for unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    format: fileFormat
  })
);

module.exports = logger;