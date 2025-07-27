# Professional Development Setup Guide

## 🎯 Overview
This guide will help you set up a professional development environment for the Predecessor Tournament System, preparing it for real-world use by many users.

---

## 1️⃣ Version Control with GitHub (Essential)

### Why GitHub?
- **Free** for public and private repositories
- Industry standard for code collaboration
- Built-in issue tracking and project management
- Automatic backups of your code
- Easy collaboration with other developers

### Setup Steps:
1. **Create GitHub Account**: https://github.com/signup
2. **Install Git**: https://git-scm.com/download/win
3. **Create Repository**:
   - Name: `predecessor-tournament-system`
   - Make it private initially
   - Add README, .gitignore (Node), and MIT License

### Essential Git Commands:
```bash
# Initial setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/predecessor-tournament-system.git
git push -u origin main

# Daily workflow
git add .
git commit -m "Description of changes"
git push
```

---

## 2️⃣ Development Environment Setup

### Essential Free Tools:

#### **Visual Studio Code** (You probably have this)
- Extensions to install:
  - ESLint
  - Prettier
  - GitLens
  - Thunder Client (API testing)
  - Live Share (collaboration)

#### **Node.js Tools**:
```bash
npm install -g nodemon pm2 cross-env
```

#### **Database GUI for Airtable**:
- Use Airtable's web interface (free)
- Alternative: **TablePlus** (free version available)

---

## 3️⃣ Environment Management

### Development vs Production

Create these files:

**.env.development**
```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
# Development-specific settings
```

**.env.production**
```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
# Production-specific settings
```

**.env.example** (Share this on GitHub)
```env
# Copy this to .env and fill in your values
NODE_ENV=development
PORT=3001

# Airtable
AIRTABLE_PERSONAL_TOKEN=your_token_here
AIRTABLE_BASE_ID=your_base_id_here

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback

# Session
SESSION_SECRET=generate_random_string_here
```

---

## 4️⃣ Proper Session Management

### Current Issue:
Sessions are stored in memory and lost on restart.

### Production Solutions:

#### **Option 1: PostgreSQL + connect-pg-simple** (Free on Supabase)
```javascript
// Install
npm install connect-pg-simple pg

// Setup
const pgSession = require('connect-pg-simple')(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'user_sessions'
  }),
  // ... rest of config
}));
```

#### **Option 2: Redis** (Free tier on Upstash)
```javascript
// Install
npm install connect-redis redis

// Setup
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... rest of config
}));
```

#### **Option 3: File-based** (Simple, good for small scale)
```javascript
// Install
npm install session-file-store

// Setup
const FileStore = require('session-file-store')(session);

app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: 86400 * 20 // 20 days
  }),
  // ... rest of config
}));
```

---

## 5️⃣ Testing Framework

### Jest + React Testing Library (Frontend)
```bash
# Already included with Create React App
npm test
```

### Jest + Supertest (Backend)
```bash
npm install --save-dev jest supertest
```

**Example test file**: `backend/tests/tournaments.test.js`
```javascript
const request = require('supertest');
const app = require('../server');

describe('Tournament API', () => {
  test('GET /api/tournaments returns list', async () => {
    const response = await request(app)
      .get('/api/tournaments')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

---

## 6️⃣ Free Hosting Options

### **Frontend**: Vercel (Best for React)
- Automatic deployments from GitHub
- Free SSL certificate
- Global CDN
- Easy setup

### **Backend**: Railway or Render
- Free tier available
- Automatic deployments
- Environment variable management
- Database hosting included

### **Database**: 
- **Airtable**: Current solution (good for small-medium scale)
- **Supabase**: Free PostgreSQL (if you outgrow Airtable)
- **MongoDB Atlas**: Free 512MB cluster

---

## 7️⃣ Security Best Practices

### Environment Variables
```javascript
// Never commit .env files
// Add to .gitignore:
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### API Security
```javascript
// Rate limiting
npm install express-rate-limit

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Input Validation
```javascript
// Already using express-validator ✅
// Add sanitization
const { body, validationResult } = require('express-validator');
```

---

## 8️⃣ Monitoring & Analytics (Free)

### **LogRocket** (Free tier)
- Session replay
- Error tracking
- Performance monitoring

### **Sentry** (Free tier)
- Error tracking
- Performance monitoring
- Real-time alerts

### **Google Analytics**
- User behavior tracking
- Traffic analysis

---

## 9️⃣ CI/CD Pipeline (GitHub Actions - Free)

Create `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        npm install
        cd frontend && npm install
        cd ../backend && npm install
    
    - name: Run tests
      run: |
        cd frontend && npm test
        cd ../backend && npm test
```

---

## 🚀 Quick Start Checklist

1. ☐ Create GitHub repository
2. ☐ Set up Git locally
3. ☐ Create .env.example file
4. ☐ Add .gitignore file
5. ☐ Choose session storage solution
6. ☐ Set up basic tests
7. ☐ Configure VS Code extensions
8. ☐ Plan hosting strategy
9. ☐ Set up error tracking (Sentry)
10. ☐ Create README.md with setup instructions

---

## 📋 Recommended Project Structure

```
predecessor-tournament-system/
├── .github/
│   └── workflows/
│       └── test.yml
├── backend/
│   ├── tests/
│   ├── middleware/
│   ├── routes/
│   └── services/
├── frontend/
│   ├── public/
│   └── src/
├── docs/
│   ├── API.md
│   ├── SETUP.md
│   └── DEPLOYMENT.md
├── scripts/
│   └── setup.js
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

---

## 🎯 Next Steps

1. **Immediate**: Set up GitHub repository
2. **This Week**: Implement proper session storage
3. **Next Week**: Add basic tests
4. **Before Launch**: Set up monitoring and error tracking

Remember: Start simple, iterate often. You don't need everything perfect from day one!