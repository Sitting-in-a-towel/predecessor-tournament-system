# Phoenix Draft Server Deployment Guide

## 🚀 Deploy to Render

### Step 1: Create New Render Service

1. Go to https://dashboard.render.com
2. Click **"New" → "Web Service"**
3. Connect your GitHub repository: `predecessor-tournament-system`
4. Configure the service:

   **Basic Settings:**
   - **Name**: `predecessor-draft-phoenix`
   - **Runtime**: `Docker`
   - **Branch**: `main`
   - **Root Directory**: `phoenix_draft`

   **Build & Deploy:**
   - **Dockerfile Path**: `Dockerfile` (should auto-detect)
   - **Build Command**: (leave empty - uses Dockerfile)
   - **Start Command**: (leave empty - uses Dockerfile)

### Step 2: Environment Variables

Add these environment variables in Render dashboard:

```env
MIX_ENV=prod
PHX_SERVER=true
PORT=4000
POOL_SIZE=10
```

**Database Connection:**
- **DATABASE_URL**: Link to your existing `predecessor-tournament-db`

**Security:**
- **SECRET_KEY_BASE**: Generate new value (auto-generate in Render)

**Host Configuration:**
- **PHX_HOST**: `predecessor-draft-phoenix.onrender.com`

### Step 3: Database Linking

1. In Render dashboard, go to Environment Variables
2. Add **DATABASE_URL** variable
3. Select **"From Database"**
4. Choose your existing database: `predecessor-tournament-db`
5. Property: `connectionString`

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Monitor the build logs for any issues

### Step 5: Verify Deployment

Once deployed, test these URLs:

- **Health Check**: `https://predecessor-draft-phoenix.onrender.com/`
- **Draft Interface**: `https://predecessor-draft-phoenix.onrender.com/draft/test`

### Step 6: Update Frontend (Already Done)

The frontend has been updated to automatically use the production Phoenix URL:
- **Local Development**: `http://localhost:4000`
- **Production**: `https://predecessor-draft-phoenix.onrender.com`

## 🔧 Troubleshooting

### Common Issues:

**1. Build Failures:**
- Check that Elixir/OTP versions are compatible
- Ensure all dependencies are properly specified

**2. Database Connection:**
- Verify DATABASE_URL environment variable
- Check that database exists and is accessible

**3. Secret Key Missing:**
- Ensure SECRET_KEY_BASE is set
- Use Render's auto-generate feature

**4. Assets Not Loading:**
- Check that assets.deploy ran successfully
- Verify static file serving configuration

### Build Logs Location:
Monitor deployment at: https://dashboard.render.com → your service → Logs

## ✅ Success Indicators

When deployment succeeds:
1. **No more localhost:4000 errors** in production
2. **Draft creation works** on live website
3. **"Enter as" buttons** redirect to working Phoenix URL

## 🎯 Next Steps After Deployment

1. Test draft creation on live website
2. Verify both captain and spectator views work
3. Test the complete draft workflow
4. Monitor for any production issues

The draft issue will be **completely fixed** once Phoenix is deployed to production! 🚀