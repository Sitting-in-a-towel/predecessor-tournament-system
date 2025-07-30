# Deployment URLs

## Frontend (Netlify)
- **Netlify Dashboard**: https://app.netlify.com/projects/ocl-predecessor/overview
- **Live Site URL**: https://ocl-predecessor.netlify.app

## Backend (Render)
- **Render Dashboard**: https://dashboard.render.com/web/srv-ctqhqelds78s73aeb6e0
- **API URL**: https://predecessor-tournament-api.onrender.com

## Environment Variables to Update

### Frontend (.env or Netlify Environment Variables)
```
REACT_APP_API_URL=[Your Render backend URL]
```

### Backend (Render Environment Variables)
```
FRONTEND_URL=https://earnest-lamington-8860a8.netlify.app
DISCORD_REDIRECT_URI=[Your Render URL]/api/auth/discord/callback
```

## Post-Deployment Checklist
- [ ] Update frontend environment variable with backend URL
- [ ] Update backend environment variables with frontend URL
- [ ] Update Discord OAuth redirect URI in Discord Developer Portal
- [ ] Test user registration
- [ ] Test Discord login
- [ ] Test tournament creation
- [ ] Test team registration