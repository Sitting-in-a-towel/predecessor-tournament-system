# Free Cloud Hosting Deployment Guide

## Overview
This guide will help you deploy your Predecessor Tournament System to the cloud for free using:
- **Frontend**: Netlify (free tier)
- **Backend**: Render (free tier) 
- **Database**: Render PostgreSQL (free tier)

## Prerequisites
- GitHub account
- All code committed to a GitHub repository

## Step 1: Prepare Frontend for Deployment

### 1.1 Update Environment Variables
Create `frontend/.env.production`:
```env
REACT_APP_API_URL=https://your-backend-name.onrender.com/api
```

### 1.2 Update Build Script
In `frontend/package.json`, ensure you have:
```json
{
  "scripts": {
    "build": "react-scripts build"
  }
}
```

### 1.3 Add Netlify Redirects
Create `frontend/public/_redirects`:
```
/*    /index.html   200
```

## Step 2: Deploy Backend to Render

### 2.1 Create Account
1. Go to https://render.com
2. Sign up with GitHub
3. Connect your repository

### 2.2 Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Name: `predecessor-db`
3. Select Free tier
4. Click "Create Database"
5. **Save the connection details** (you'll need them)

### 2.3 Deploy Backend Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repo
3. Settings:
   - **Name**: `predecessor-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 2.4 Add Environment Variables
In your Render backend service settings, add:
```env
NODE_ENV=production
PORT=10000
POSTGRES_HOST=your-db-host-from-step-2.2
POSTGRES_PORT=5432
POSTGRES_DATABASE=your-db-name
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://your-frontend-url.netlify.app/auth/callback
SESSION_SECRET=your-super-secret-session-key
```

## Step 3: Deploy Frontend to Netlify

### 3.1 Create Account
1. Go to https://netlify.com
2. Sign up with GitHub

### 3.2 Deploy Site
1. Click "Add new site" → "Import an existing project"
2. Choose GitHub and select your repo
3. Settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
4. Click "Deploy site"

### 3.3 Configure Environment Variables
In Netlify site settings → Environment variables:
```env
REACT_APP_API_URL=https://your-backend-name.onrender.com/api
```

### 3.4 Custom Domain (Optional)
1. Go to Site settings → Domain management
2. Add custom domain (if you have one)
3. Or use the provided `.netlify.app` domain

## Step 4: Initialize Database

### 4.1 Connect to Database
Use the connection details from Step 2.2 to connect with a PostgreSQL client

### 4.2 Run Schema
Execute your `postgresql_schema.sql` file to create tables

### 4.3 Add Sample Data (Optional)
Add any initial data your app needs

## Step 5: Configure Discord OAuth

### 5.1 Update Discord App Settings
1. Go to https://discord.com/developers/applications
2. Select your application
3. OAuth2 → Redirects → Add:
   - `https://your-frontend-url.netlify.app/auth/callback`

## Step 6: Test Deployment

1. Visit your Netlify frontend URL
2. Test login functionality
3. Create tournaments and teams
4. Verify all features work

## Troubleshooting

### Common Issues:
1. **Build fails**: Check build logs in Netlify/Render
2. **API not connecting**: Verify CORS settings and API URL
3. **Database connection fails**: Check connection string format
4. **Discord auth fails**: Verify redirect URI exactly matches

### Logs:
- **Frontend**: Netlify dashboard → Site → Functions
- **Backend**: Render dashboard → Service → Logs
- **Database**: Render dashboard → Database → Logs

## Cost Breakdown (All Free!)
- **Netlify**: 100GB bandwidth, 300 build minutes/month
- **Render**: 750 hours/month (enough for 24/7), 500MB RAM
- **PostgreSQL**: 1GB storage, 100 connections

## Next Steps
Once deployed, share your Netlify URL with users!
Example: `https://predecessor-tournaments.netlify.app`

## Production Upgrades (Optional, Paid)
- Custom domain ($10-15/year)
- Render paid plans ($7/month) for better performance
- More database storage as needed