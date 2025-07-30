# Complete Professional Setup Guide

## Overview
This guide will set up a professional development environment with:
- Persistent sessions (Supabase PostgreSQL)
- Multiple environments (dev/staging/prod)
- Automated testing
- Professional workflow

## Step 1: Supabase Setup (Free PostgreSQL for Sessions)

### 1.1 Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub (easier integration)
3. Click "New project"
4. Name it: `predecessor-tournament-sessions`
5. Choose region closest to you
6. Generate a secure database password (save it!)
7. Wait for project to be created (2-3 minutes)

### 1.2 Get Connection Details
1. Go to Settings → Database
2. Copy the "Connection string" (URI format)
3. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 1.3 Update Your Local .env
Add to your `.env` file:
```
# Session Database (Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SESSION_STORE=postgres
```

## Step 2: Install PostgreSQL Session Support

```bash
cd "H:\Project Folder\Predecessor website\backend"
npm install connect-pg-simple
```

## Step 3: Set Up Multiple Environments

### 3.1 Create Environment Files
Create these files in your project root:

**.env.development** (for local development)
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Your existing Airtable and Discord settings
AIRTABLE_PERSONAL_TOKEN=your_token
AIRTABLE_BASE_ID=your_base_id
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_secret
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback

# Session
SESSION_SECRET=dev-secret-change-this
SESSION_STORE=memory
```

**.env.staging** (for testing)
```
NODE_ENV=staging
PORT=3001
FRONTEND_URL=https://your-app-staging.netlify.app

# Same Airtable but different Discord app
DISCORD_REDIRECT_URI=https://your-api-staging.onrender.com/api/auth/discord/callback

# Supabase for persistent sessions
DATABASE_URL=your_supabase_staging_url
SESSION_STORE=postgres
SESSION_SECRET=staging-secret-change-this
```

**.env.production** (for live site)
```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.netlify.app

# Production Discord app
DISCORD_REDIRECT_URI=https://your-api.onrender.com/api/auth/discord/callback

# Supabase for persistent sessions
DATABASE_URL=your_supabase_production_url
SESSION_STORE=postgres
SESSION_SECRET=production-super-secret-key
```

## Step 4: Environment Switcher Script

Create a batch file to switch environments easily:

**scripts/switch-env.bat**
```batch
@echo off
title Environment Switcher
color 0A

echo ========================================
echo Environment Switcher
echo ========================================
echo.
echo 1. Development (Local)
echo 2. Staging (Test)
echo 3. Production (Live)
echo.

set /p choice="Select environment (1-3): "

if "%choice%"=="1" (
    copy .env.development .env
    echo Switched to DEVELOPMENT environment
) else if "%choice%"=="2" (
    copy .env.staging .env
    echo Switched to STAGING environment
) else if "%choice%"=="3" (
    copy .env.production .env
    echo Switched to PRODUCTION environment
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

echo.
echo Environment switched successfully!
echo Restart your services for changes to take effect.
echo.
pause
```

## Step 5: GitHub Branch Protection

### 5.1 Create Branches
```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# Create development branch
git checkout -b development
git push -u origin development

# Go back to main
git checkout main
```

### 5.2 Set Up Branch Rules
1. Go to GitHub → Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Dismiss stale pull request approvals
   - ✅ Require status checks to pass
   - ✅ Include administrators

### 5.3 Workflow
- `development` branch: Active development
- `staging` branch: Testing
- `main` branch: Production-ready code

## Step 6: Automated Testing Setup

### 6.1 Install Testing Dependencies
```bash
cd "H:\Project Folder\Predecessor website\backend"
npm install --save-dev jest supertest @types/jest

cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### 6.2 Create Test Structure
```
tests/
├── backend/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── frontend/
    ├── unit/
    └── integration/
```

### 6.3 Add Test Scripts
Update root `package.json`:
```json
{
  "scripts": {
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "test:watch": "cd backend && npm run test:watch"
  }
}
```

## Step 7: GitHub Actions for CI/CD

Create `.github/workflows/test.yml`:
```yaml
name: Test

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [development]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        npm install
        cd backend && npm install
        cd ../frontend && npm install
    
    - name: Run tests
      run: npm test
    
    - name: Build check
      run: |
        cd frontend && npm run build
```

## Step 8: Local Test Database

For complete isolation, set up a local PostgreSQL for testing:

### Option A: PostgreSQL in Docker
```bash
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=testpass \
  -p 5432:5432 \
  postgres:15
```

### Option B: Use Supabase Local
```bash
npx supabase init
npx supabase start
```

## Step 9: Complete Development Workflow

### Daily Development:
1. Switch to development branch
2. Make changes
3. Test locally
4. Commit and push
5. Create pull request to staging

### Testing Workflow:
1. Merge to staging branch
2. Automated tests run
3. Deploy to staging environment
4. Manual testing
5. Create pull request to main

### Production Deployment:
1. Merge to main branch
2. Automated tests run
3. Deploy to production
4. Monitor for issues

## Step 10: Quick Setup Script

Run this to set everything up:

**scripts/professional-setup-complete.bat**
```batch
@echo off
title Complete Professional Setup
color 0B

echo ========================================
echo Complete Professional Setup
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website"

echo Step 1: Installing session dependencies...
cd backend
npm install connect-pg-simple
cd ..

echo.
echo Step 2: Creating environment files...
echo Please create .env.development, .env.staging, and .env.production
echo Templates are in docs/COMPLETE_PROFESSIONAL_SETUP.md
pause

echo.
echo Step 3: Setting up Git branches...
git checkout -b development
git checkout -b staging
git checkout main

echo.
echo Step 4: Installing test dependencies...
cd backend
npm install --save-dev jest supertest @types/jest
cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Set up Supabase account
echo 2. Create environment files
echo 3. Configure GitHub branch protection
echo 4. Start developing!
echo.
pause
```

## Benefits of This Setup

### For You:
- ✅ Sessions persist even after restart
- ✅ Safe testing environment
- ✅ Easy environment switching
- ✅ Professional workflow

### For Claude:
- ✅ Can make changes on development branch
- ✅ Automated testing catches issues
- ✅ Safe staging environment for testing
- ✅ No risk to production

### For Production:
- ✅ Protected main branch
- ✅ Tested code only
- ✅ Easy rollback if needed
- ✅ Professional deployment process

## Next Steps

1. **Today**: Set up Supabase (5 minutes)
2. **Today**: Create environment files (10 minutes)
3. **Today**: Run professional setup script
4. **Tomorrow**: Set up GitHub branch protection
5. **This Week**: Add your first tests

This gives you a truly professional setup where:
- I can make changes safely
- Everything is tested before production
- Sessions persist properly
- You have full control over what goes live