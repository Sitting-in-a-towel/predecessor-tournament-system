# Quick Deployment to Netlify + Render

## Step 1: Prepare Frontend for Netlify

### 1.1 Create Netlify Build Configuration
Create `netlify.toml` in project root:

```toml
[build]
  publish = "frontend/build"
  command = "cd frontend && npm install && npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 1.2 Update Frontend Environment Variables
Update `frontend/.env` for production:

```env
# Will be updated with actual Render URL after backend deployment
REACT_APP_API_URL=https://your-backend-name.onrender.com
```

## Step 2: Deploy Frontend to Netlify

1. Go to [netlify.com](https://app.netlify.com)
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Choose GitHub and authorize
5. Select your repository
6. Configure build settings:
   - Base directory: (leave empty)
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
7. Click "Deploy site"

**Your frontend URL will be:** `https://random-name-123.netlify.app`

## Step 3: Deploy Backend to Render

### 3.1 Create Render Build Script
Create `render-build.sh` in backend folder:

```bash
#!/usr/bin/env bash
cd backend
npm install
npm run build || echo "No build script found, skipping..."
```

### 3.2 Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - Name: `predecessor-tournament-api`
   - Environment: `Node`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Auto-Deploy: Yes

**Your backend URL will be:** `https://predecessor-tournament-api.onrender.com`

## Step 4: Update Environment Variables

### 4.1 Update Netlify Environment Variables
1. Go to your Netlify site dashboard
2. Go to Site settings → Environment variables
3. Add:
   ```
   REACT_APP_API_URL=https://your-actual-render-url.onrender.com
   ```
4. Redeploy site

### 4.2 Update Render Environment Variables
1. Go to your Render service dashboard
2. Go to Environment
3. Add all your current backend environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   FRONTEND_URL=https://your-actual-netlify-url.netlify.app
   SESSION_SECRET=your-production-secret
   AIRTABLE_PERSONAL_TOKEN=your-token
   AIRTABLE_BASE_ID=your-base-id
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_CLIENT_SECRET=your-client-secret
   DISCORD_REDIRECT_URI=https://your-render-url.onrender.com/api/auth/discord/callback
   ```

## Step 5: Test Deployed Application

1. Visit your Netlify URL
2. Test user registration
3. Test Discord login
4. Test tournament creation
5. Test team registration

## URLs You'll Get:

- **Frontend**: `https://predecessor-tournament-xyz.netlify.app`
- **Backend**: `https://predecessor-tournament-api.onrender.com`

## Next Steps After Deployment:

1. Update Discord OAuth redirect URI in Discord Developer Portal
2. Test all functionality on live URLs
3. Monitor usage in dashboards
4. Consider custom domain when ready

## Cost Breakdown:
- **Current**: $0/month (free tiers)
- **When you need to upgrade**: ~$14/month
- **Custom domain**: ~$12/year (optional)

This setup handles several thousand users comfortably on the free tier!