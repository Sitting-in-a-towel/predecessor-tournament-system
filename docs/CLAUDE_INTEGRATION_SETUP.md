# Claude Integration Setup Guide

## Overview
This guide will set up your development environment so Claude can access your GitHub repository, run launchers, troubleshoot issues, and manage your entire development workflow.

## Prerequisites
- Windows 10/11
- Git installed
- GitHub account
- Your Predecessor Tournament project

## Step 1: GitHub Repository Setup

### 1.1 Create GitHub Repository
1. Go to [github.com](https://github.com) and log in
2. Click "New repository" (green button)
3. Repository name: `predecessor-tournament-system`
4. Description: `Web-based tournament management system for Predecessor esports`
5. Choose **Public** (for free GitHub features)
6. ✅ Add README file
7. ✅ Add .gitignore (choose Node template)
8. Click "Create repository"

### 1.2 Clone and Setup Local Repository
```bash
# Navigate to your project folder
cd "H:\Project Folder"

# If you haven't initialized git yet:
cd "Predecessor website"
git init

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/predecessor-tournament-system.git

# Create and switch to main branch
git branch -M main

# Stage all files
git add .

# Make initial commit
git commit -m "Initial commit: Tournament management system

🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push -u origin main
```

## Step 2: Claude Code Integration

### 2.1 Install Claude Code CLI
```bash
# Install Claude Code CLI globally
npm install -g @anthropic/claude-code

# Verify installation
claude-code --version
```

### 2.2 Create CLAUDE.md File
Create `H:\Project Folder\Predecessor website\CLAUDE.md`:

```markdown
# Claude Development Assistant Configuration

## Project Overview
This is the Predecessor Tournament Management System - a web-based platform for managing esports tournaments with real-time features.

## Architecture
- **Frontend**: React 18 (Port 3000)
- **Backend**: Node.js/Express (Port 3001) 
- **Database**: Airtable (tournament data) + Supabase (sessions)
- **Auth**: Discord OAuth2
- **Real-time**: Socket.io

## Development Commands

### Start Development Environment
```bash
# Start UI Launcher (recommended)
./launchers/Start_UI_Launcher_Real.bat

# Or start services individually
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
npm run dev           # Both services
```

### Testing Commands
```bash
# Run all tests
npm test

# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Build verification
npm run build:frontend
```

### Deployment Commands
```bash
# Setup deployment
./scripts/deploy-setup.bat

# Professional setup
./scripts/setup-professional.bat
```

### Database Management
```bash
# Setup Airtable tables
./scripts/Setup_Database.bat

# Verify connection
node backend/scripts/test-connection.js
```

## Common Issues & Solutions

### Port Conflicts
```bash
# Kill processes on ports 3000/3001
npx kill-port 3000 3001
```

### Session Issues
- Check SESSION_SECRET in .env
- Verify DATABASE_URL for Supabase
- Restart backend service

### Airtable Connection
- Verify AIRTABLE_PERSONAL_TOKEN has write permissions
- Check AIRTABLE_BASE_ID is correct
- Ensure tables exist: Users, Tournaments, Teams, Heroes, DraftSessions

### Discord OAuth
- Verify DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
- Check redirect URI matches exactly
- Ensure application is not rate limited

## File Structure
```
H:\Project Folder\Predecessor website\
├── frontend/          # React application
├── backend/           # Node.js API
├── launcher-app/      # Development UI launcher
├── scripts/           # Setup and deployment scripts
├── docs/             # Documentation and guides
└── launchers/        # Batch file launchers
```

## Environment Files
- `.env` - Development environment variables
- `docs/env_free.txt` - Free hosting template
- `docs/env_production.txt` - Production template

## Key Endpoints
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- UI Launcher: http://localhost:4000
- Admin Dashboard: http://localhost:3000/admin/dashboard

## Monitoring & Logs
- Backend logs: `logs/` directory
- Frontend console: Browser DevTools
- UI Launcher: Real-time log monitoring

## Deployment Targets
- **Frontend**: Netlify (free)
- **Backend**: Render (free tier)
- **Database**: Supabase PostgreSQL (sessions) + Airtable (data)

## Notes for Claude
- Always run launchers from project root directory
- Use UI launcher for unified development experience
- Check logs directory for error debugging
- Verify environment variables before troubleshooting
- Run tests before making significant changes
```

### 2.3 Create Development Scripts

Create `H:\Project Folder\Predecessor website\package.json` (root level):
```json
{
  "name": "predecessor-tournament-system",
  "version": "1.0.0",
  "description": "Tournament management system for Predecessor esports",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm start",
    "build:frontend": "cd frontend && npm run build",
    "test": "concurrently \"npm run test:backend\" \"npm run test:frontend\"",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test -- --watchAll=false",
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "start:launcher": "./launchers/Start_UI_Launcher_Real.bat"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
```

## Step 3: Development Workflow Integration

### 3.1 Create Claude Helper Scripts

Create `H:\Project Folder\Predecessor website\scripts\claude-setup.bat`:
```batch
@echo off
title Claude Development Environment Setup
color 0B

echo ========================================
echo Claude Development Environment Setup
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website"

echo Setting up development environment for Claude integration...
echo.

echo 1. Installing root dependencies...
npm install

echo 2. Installing backend dependencies...
cd backend
npm install

echo 3. Installing frontend dependencies...
cd ../frontend
npm install

echo 4. Installing launcher dependencies...
cd ../launcher-app
npm install

cd ..

echo.
echo 5. Verifying environment files...
if not exist ".env" (
    echo ❌ .env file missing! Copy from docs/env_example.txt
) else (
    echo ✅ .env file exists
)

echo.
echo 6. Testing connections...
echo Testing backend...
cd backend
node scripts/test-connection.js
cd ..

echo.
echo ========================================
echo Claude Environment Ready!
echo ========================================
echo.
echo Available commands:
echo - npm run dev              # Start both services
echo - npm run start:launcher   # Start UI launcher
echo - npm test                 # Run all tests
echo.
echo Claude can now:
echo ✅ Access your GitHub repository
echo ✅ Run development commands
echo ✅ Launch services via scripts
echo ✅ Debug and troubleshoot issues
echo ✅ Monitor logs and performance
echo.

pause
```

### 3.2 Create Environment Verification Script

Create `H:\Project Folder\Predecessor website\scripts\verify-setup.js`:
```javascript
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Claude Development Environment...\n');

const checks = [
  {
    name: 'Root package.json',
    path: './package.json',
    required: true
  },
  {
    name: 'Environment file',
    path: './.env',
    required: true
  },
  {
    name: 'Claude configuration',
    path: './CLAUDE.md',
    required: true
  },
  {
    name: 'Backend directory',
    path: './backend',
    required: true
  },
  {
    name: 'Frontend directory', 
    path: './frontend',
    required: true
  },
  {
    name: 'Launcher app',
    path: './launcher-app',
    required: false
  },
  {
    name: 'Documentation',
    path: './docs',
    required: true
  }
];

let allPassed = true;

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const status = exists ? '✅' : (check.required ? '❌' : '⚠️');
  const message = exists ? 'EXISTS' : (check.required ? 'MISSING (REQUIRED)' : 'MISSING (OPTIONAL)');
  
  console.log(`${status} ${check.name}: ${message}`);
  
  if (check.required && !exists) {
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Claude can access your environment.');
  console.log('\n📝 Next steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Share repository URL with Claude');
  console.log('3. Start development with: npm run start:launcher');
} else {
  console.log('❌ Some required files are missing.');
  console.log('\n🔧 Run this to fix: npm run setup:claude');
}

console.log('\n💡 Tip: Use "npm run start:launcher" for unified development');
```

## Step 4: What "Deploy Later" Means

**"Deploy later"** means:
- Right now: Develop and test locally
- Later (when ready): Push to live hosting (Netlify + Render)

### Development vs Deployment:
- **Development**: Your computer (localhost)
- **Deployment**: Live website on the internet

You can develop for weeks/months before deploying!

## Step 5: Complete Integration Instructions

### 5.1 Run Setup Commands
```bash
# 1. Navigate to project
cd "H:\Project Folder\Predecessor website"

# 2. Run Claude setup
./scripts/claude-setup.bat

# 3. Verify everything
node scripts/verify-setup.js

# 4. Push to GitHub
git add .
git commit -m "Setup Claude integration environment"
git push
```

### 5.2 Share with Claude
When working with Claude, provide:
1. **GitHub repository URL**
2. **Project path**: `H:\Project Folder\Predecessor website`
3. **Any specific issues** you're experiencing

### 5.3 Claude Can Then:
- ✅ Access your entire codebase
- ✅ Run launchers and scripts
- ✅ Debug issues in real-time
- ✅ Make code changes and improvements
- ✅ Monitor logs and performance
- ✅ Help with deployment when ready

## Step 6: Daily Development Workflow

### Morning Startup:
```bash
cd "H:\Project Folder\Predecessor website"
npm run start:launcher
```

### Working with Claude:
1. Describe what you want to build/fix
2. Claude can access your GitHub repo
3. Claude runs commands and makes changes
4. You test the results locally
5. Push changes to GitHub when ready

### When Ready to Deploy:
```bash
./scripts/deploy-setup.bat
```

## Troubleshooting

### If Claude Can't Access Something:
1. Check file exists in GitHub
2. Verify path is correct
3. Ensure repository is public
4. Check if file was committed and pushed

### If Launchers Don't Work:
1. Check you're in correct directory
2. Verify all dependencies installed
3. Check environment variables in .env
4. Look at error logs in UI launcher

This setup gives Claude complete access to help you develop, debug, and eventually deploy your tournament system!