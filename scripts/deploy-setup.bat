@echo off
title Predecessor Tournament System - Deployment Setup
color 0B

echo ========================================
echo Deployment Setup Assistant
echo ========================================
echo.

cd /d "H:\Project Folder\Predecessor website"

echo This script will help you set up deployment to Vercel + Railway.
echo.

echo Step 1: Install deployment tools
echo.
echo Installing Vercel CLI...
npm install -g vercel

echo Installing Railway CLI...
npm install -g @railway/cli

echo.
echo Step 2: Build verification
echo.
echo Building frontend...
cd frontend
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)
echo ✓ Frontend build successful

cd ..
echo.
echo Testing backend...
cd backend
npm test
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend tests failed!
    pause
    exit /b 1
)
echo ✓ Backend tests passed

cd ..
echo.
echo ========================================
echo Deployment Checklist
echo ========================================
echo.
echo ☐ 1. GitHub repository created and code pushed
echo ☐ 2. Vercel account created (vercel.com)
echo ☐ 3. Railway account created (railway.app)
echo ☐ 4. Production environment variables ready
echo ☐ 5. Discord OAuth configured for production URLs
echo.

set /p ready="Are you ready to proceed with deployment? (y/n): "
if /i "%ready%" NEQ "y" goto end

echo.
echo ========================================
echo Database Setup (Supabase) - Do This First!
echo ========================================
echo.
echo 1. Go to https://supabase.com
echo 2. Sign up for free account
echo 3. Click "New Project"
echo 4. Wait for database to be created
echo 5. Go to Settings → Database → Connection string
echo 6. Copy the connection string (save this!)
echo.

pause

echo.
echo ========================================
echo Frontend Deployment (Netlify)
echo ========================================
echo.
echo 1. Go to https://netlify.com
echo 2. Sign up/login with GitHub
echo 3. Click "New site from Git" → Choose GitHub
echo 4. Select your repository
echo 5. Configure build settings:
echo    - Build Command: cd frontend ^&^& npm run build
echo    - Publish Directory: frontend/build
echo.

echo 6. Add environment variable in Site Settings:
echo    REACT_APP_API_URL = https://your-backend-url.onrender.com/api
echo.

pause

echo.
echo ========================================
echo Backend Deployment (Render - Free Tier)
echo ========================================
echo.
echo 1. Go to https://render.com
echo 2. Sign up/login with GitHub
echo 3. Click "New" → "Web Service"
echo 4. Connect your GitHub repository
echo 5. Configure settings:
echo    - Name: your-tournament-api
echo    - Root Directory: backend
echo    - Build Command: npm install
echo    - Start Command: npm start
echo.

echo 6. Add environment variables from docs/env_free.txt
echo    (Use the Supabase connection string for DATABASE_URL)
echo.

echo ⚠️  Note: Render free tier sleeps after 15 minutes of inactivity
echo    It takes 30-60 seconds to wake up when accessed
echo.

pause

echo.
echo ========================================
echo Post-Deployment Steps
echo ========================================
echo.
echo 1. Update Discord OAuth redirect URI
echo 2. Test the live application
echo 3. Set up monitoring (optional)
echo 4. Configure custom domain (optional)
echo.

echo Deployment URLs will be:
echo Frontend: https://your-project.vercel.app
echo Backend:  https://your-project.railway.app
echo.

echo ========================================
echo Monitoring Setup (Optional)
echo ========================================
echo.

set /p monitoring="Set up monitoring tools? (y/n): "
if /i "%monitoring%" NEQ "y" goto complete

echo.
echo Installing monitoring packages...
cd frontend
npm install @sentry/react react-ga4 logrocket logrocket-react

cd ../backend  
npm install @sentry/node

echo.
echo ✓ Monitoring packages installed
echo Configure these in your production environment:
echo - Sentry: Error tracking
echo - Google Analytics: User analytics  
echo - LogRocket: Session replay
echo.

:complete
echo.
echo ========================================
echo Deployment Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Push your code to GitHub
echo 2. Deploy frontend to Vercel
echo 3. Deploy backend to Railway
echo 4. Test everything works
echo.
echo For detailed instructions, see: docs/DEPLOYMENT.md
echo.

:end
pause