# External Access Setup Guide

## Option 1: Ngrok (Recommended for Testing)

### Step 1: Install Ngrok
1. Go to https://ngrok.com/
2. Sign up for free account
3. Download ngrok for Windows
4. Extract to `H:\Project Folder\Predecessor website\tools\ngrok.exe`

### Step 2: Set Up Tunnels
```bash
# In one terminal (for backend)
ngrok http 3001

# In another terminal (for frontend) 
ngrok http 3000
```

### Step 3: Update Discord OAuth
1. Go to Discord Developer Portal
2. Add the ngrok URLs to your OAuth redirects:
   - `https://your-backend-url.ngrok.app/api/auth/discord/callback`

### Step 4: Update Environment Variables
Update your `.env` files with the ngrok URLs

---

## Option 2: Local Network Access

### Step 1: Allow Firewall Access
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" → "Allow another app"
4. Add Node.js applications for ports 3000 and 3001

### Step 2: Find Your Local IP
```cmd
ipconfig
```
Look for your IPv4 Address (usually 192.168.x.x)

### Step 3: Access from Other Devices
- Frontend: `http://YOUR_IP:3000`
- Backend: `http://YOUR_IP:3001`

---

## Option 3: Production Deployment

### Recommended Platforms:
1. **Vercel** (Frontend) + **Railway** (Backend)
2. **Netlify** (Frontend) + **Heroku** (Backend)
3. **DigitalOcean App Platform** (Full Stack)

### Environment Variables Needed:
- `AIRTABLE_PERSONAL_TOKEN`
- `AIRTABLE_BASE_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `SESSION_SECRET`
- `FRONTEND_URL`

### Database Considerations:
- Airtable works perfectly for production
- Consider upgrading to Airtable Pro for higher API limits
- Set up proper backup strategies

---

## Security Notes:
- Always use HTTPS in production
- Keep your Discord client secret secure
- Use strong session secrets
- Enable rate limiting in production
- Set up proper CORS policies