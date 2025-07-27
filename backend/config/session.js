const session = require('express-session');

/**
 * Session configuration factory
 * Supports multiple session stores based on environment configuration
 */
function createSessionConfig() {
  const config = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 20 * 24 * 60 * 60 * 1000, // 20 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
  };

  // Configure session store based on environment
  const storeType = process.env.SESSION_STORE || 'memory';

  switch (storeType) {
    case 'file':
      config.store = createFileStore();
      break;
    case 'redis':
      config.store = createRedisStore();
      break;
    case 'postgres':
      config.store = createPostgresStore();
      break;
    default:
      // Use default memory store (not recommended for production)
      console.warn('Using memory store for sessions. Not recommended for production.');
  }

  return config;
}

/**
 * File-based session store
 * Good for development and small-scale deployments
 */
function createFileStore() {
  try {
    const FileStore = require('session-file-store')(session);
    const path = require('path');
    const fs = require('fs');

    const sessionDir = path.join(__dirname, '../../sessions');
    
    // Ensure sessions directory exists
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    return new FileStore({
      path: sessionDir,
      ttl: 20 * 24 * 60 * 60, // 20 days in seconds
      reapInterval: 60 * 60,   // Clean up expired sessions every hour
      retries: 3,
      factor: 2,
      minTimeout: 50,
      maxTimeout: 500
    });
  } catch (error) {
    console.error('Failed to create file store:', error.message);
    console.error('Install with: npm install session-file-store');
    return null;
  }
}

/**
 * Redis session store
 * Recommended for production deployments
 */
function createRedisStore() {
  try {
    const RedisStore = require('connect-redis')(session);
    const redis = require('redis');

    const redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis connection refused');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          console.error('Redis max attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis for session storage');
    });

    // Connect to Redis
    redisClient.connect().catch(console.error);

    return new RedisStore({ 
      client: redisClient,
      prefix: 'sess:',
      ttl: 20 * 24 * 60 * 60 // 20 days
    });
  } catch (error) {
    console.error('Failed to create Redis store:', error.message);
    console.error('Install with: npm install connect-redis redis');
    return null;
  }
}

/**
 * PostgreSQL session store
 * Best for enterprise-scale deployments
 */
function createPostgresStore() {
  try {
    const pgSession = require('connect-pg-simple')(session);
    const pg = require('pg');

    const pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    pgPool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('PostgreSQL connection error:', err);
      } else {
        console.log('Connected to PostgreSQL for session storage');
      }
    });

    return new pgSession({
      pool: pgPool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      ttl: 20 * 24 * 60 * 60 // 20 days
    });
  } catch (error) {
    console.error('Failed to create PostgreSQL store:', error.message);
    console.error('Install with: npm install connect-pg-simple pg');
    return null;
  }
}

/**
 * Middleware to handle session errors gracefully
 */
function handleSessionErrors(err, req, res, next) {
  if (err) {
    console.error('Session error:', err);
    // Don't crash the app, just log the error
    // The user will get a new session
  }
  next();
}

module.exports = {
  createSessionConfig,
  handleSessionErrors
};