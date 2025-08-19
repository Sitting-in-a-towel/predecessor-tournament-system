const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const draftRoutes = require('./routes/draft');
const adminRoutes = require('./routes/admin');
const adminToolsRoutes = require('./routes/admin-tools');
const invitationRoutes = require('./routes/invitations');
const tournamentRegistrationRoutes = require('./routes/tournament-registration');
const profileRoutes = require('./routes/profile');
const bracketRoutes = require('./routes/brackets');
const heroesRoutes = require('./routes/heroes');
const testAuthRoutes = require('./routes/test-auth');
const logsRoutes = require('./routes/logs');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import services
const logger = require('./utils/logger');
const { connectDatabase } = require('./utils/database');
const DraftSocketService = require('./services/draftSocketService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Trust proxy (required for secure cookies behind Render)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session configuration
const { createSessionConfig, handleSessionErrors } = require('./config/session');
app.use(session(createSessionConfig()));
app.use(handleSessionErrors);

// Session debugging (production only)
if (process.env.NODE_ENV === 'production') {
  app.use(require('./middleware/session-debug'));
}

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize Discord OAuth strategy
require('./config/discord')(passport);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root API route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Predecessor Tournament Management API',
    status: 'running',
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api', tournamentRegistrationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-tools', adminToolsRoutes);
app.use('/api', bracketRoutes);
app.use('/api/heroes', heroesRoutes);
app.use('/api/test-auth', testAuthRoutes);
app.use('/api/logs', logsRoutes);

// Initialize enhanced draft socket service
const draftSocketService = new DraftSocketService(io);
draftSocketService.initialize();

// Make io and draft service available to routes
app.set('io', io);
app.set('draftSocketService', draftSocketService);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Run database migration in production
    if (process.env.NODE_ENV === 'production') {
      try {
        logger.info('Running production database migration...');
        const runMigration = require('./migrate');
        await runMigration();
        logger.info('✅ Production database migration completed');
      } catch (migrationError) {
        logger.error('❌ Migration failed, but continuing with server startup:', migrationError.message);
        // Don't fail the entire startup - let server start for debugging
      }
    }
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();