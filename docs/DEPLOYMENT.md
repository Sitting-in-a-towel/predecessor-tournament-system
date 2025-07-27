# Deployment Guide

## Recommended Free Hosting Setup

### Frontend: Netlify
- **Cost**: Completely free
- **Limits**: 100GB bandwidth/month, 300 build minutes/month
- **Features**: Global CDN, automatic SSL, GitHub integration
- **Perfect for**: React applications

### Backend: Render (Free Tier)
- **Cost**: Free tier
- **Limits**: 750 hours/month, sleeps after 15min inactivity
- **Features**: Automatic SSL, GitHub integration
- **Note**: Takes 30-60 seconds to wake up from sleep

### Database: Supabase PostgreSQL
- **Cost**: Free tier
- **Limits**: 500MB storage, 2GB bandwidth/month
- **Features**: Real-time, automatic backups, dashboard
- **Benefit**: No sleep, persistent sessions

## Step-by-Step Deployment

### 1. Prepare for Deployment

```bash
# Make sure your project is ready
npm run build:frontend
npm run test:backend
```

### 2. Database Setup (Supabase)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for database to be provisioned
5. Go to Settings → Database → Connection string
6. Copy the connection string (you'll need this for backend)

### 3. Frontend Deployment (Netlify)

1. Go to [netlify.com](https://netlify.com) and sign up with GitHub
2. Click "New site from Git" → Choose GitHub
3. Select your repository
4. Configure build settings:
   - **Build Command**: `cd frontend && npm run build`
   - **Publish Directory**: `frontend/build`

5. Add environment variables in Site Settings → Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   ```

### 4. Backend Deployment (Render)

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure settings:
   - **Name**: your-tournament-api
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

5. Add environment variables:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-site-name.netlify.app
   
   # Airtable
   AIRTABLE_PERSONAL_TOKEN=your-token
   AIRTABLE_BASE_ID=your-base-id
   
   # Discord OAuth
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_CLIENT_SECRET=your-client-secret
   DISCORD_REDIRECT_URI=https://your-backend-url.onrender.com/api/auth/discord/callback
   
   # Session Storage (Supabase PostgreSQL)
   SESSION_STORE=postgres
   DATABASE_URL=your-supabase-connection-string
   SESSION_SECRET=your-super-secure-secret-key
   ```

### 4. Domain Configuration

#### Custom Domain (Optional)
1. **Vercel**: Project Settings → Domains → Add your domain
2. **Railway**: Service Settings → Networking → Add custom domain

#### Update Discord OAuth
1. Go to Discord Developer Portal
2. Update OAuth2 redirect URI to your production backend URL
3. Add your production domain to allowed origins

### 5. Environment-Specific Configuration

Create deployment configurations:

```bash
# Create production environment file
cp docs/env_production.txt .env.production
```

### 6. Health Checks and Monitoring

Both platforms provide:
- **Vercel**: Analytics dashboard, deployment logs
- **Railway**: Service metrics, database monitoring

## Alternative Hosting Options

### Budget Option: Netlify + Render
- **Frontend**: Netlify (free)
- **Backend**: Render (free tier with limitations)
- **Database**: Supabase (free PostgreSQL)

### Enterprise Option: AWS
- **Frontend**: AWS S3 + CloudFront
- **Backend**: AWS ECS or Lambda
- **Database**: AWS RDS PostgreSQL

### Self-Hosted Option: DigitalOcean
- **VPS**: $5/month droplet
- **Database**: PostgreSQL on same server
- **Requires**: Server management knowledge

## Security Checklist

- [ ] HTTPS enabled (automatic with Vercel/Railway)
- [ ] Environment variables properly set
- [ ] Session secret is cryptographically secure
- [ ] Database credentials are secure
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

## Monitoring Setup

### Error Tracking
```bash
# Add Sentry for error tracking
npm install @sentry/node @sentry/react
```

### Performance Monitoring
```bash
# Add LogRocket for session replay
npm install logrocket logrocket-react
```

### Analytics
```bash
# Add Google Analytics
npm install react-ga4
```

## Backup Strategy

### Database Backups
- Railway: Automatic daily backups
- Manual exports: Weekly Airtable exports

### Code Backups
- GitHub: Primary repository
- Private backup: Additional remote

## Scaling Considerations

### Traffic Growth
- **Vercel**: Handles scaling automatically
- **Railway**: Easy vertical/horizontal scaling
- **Database**: PostgreSQL handles moderate traffic well

### Feature Expansion
- **CDN**: Vercel provides global distribution
- **API Scaling**: Railway auto-scaling available
- **Database**: Can migrate to dedicated database if needed

## Cost Estimation

### Small Tournament (< 100 teams)
- **Netlify**: Free
- **Render**: Free
- **Supabase**: Free
- **Total**: $0/month

### Medium Tournament (100-500 teams)
- **Netlify**: Free (may hit bandwidth limits)
- **Render**: Free (may hit hour limits)
- **Supabase**: Free (may hit storage limits)
- **Total**: $0/month (with limitations)

### Large Tournament (500+ teams)
- **Netlify Pro**: $19/month
- **Render Starter**: $7/month
- **Supabase Pro**: $25/month
- **Total**: $51/month

## Rollback Strategy

### Quick Rollback
1. **Vercel**: Previous deployment in one click
2. **Railway**: Rollback to previous service version
3. **Database**: Railway backup restore

### Emergency Procedures
1. Disable user registration
2. Switch to maintenance mode
3. Restore from known-good backup
4. Investigate and fix issues

## Maintenance Windows

### Recommended Schedule
- **Updates**: Sundays 2-4 AM EST
- **Database Maintenance**: Monthly, low-traffic hours
- **Security Patches**: As needed, with notification

### Update Process
1. Deploy to staging environment
2. Run full test suite
3. Deploy to production during maintenance window
4. Monitor for 30 minutes post-deployment