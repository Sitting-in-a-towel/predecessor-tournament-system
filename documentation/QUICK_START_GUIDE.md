# Quick Start Guide - Predecessor Tournament Management

**Get up and running in 10 minutes!**

## Prerequisites ✅

Before starting, ensure you have:
- **Node.js 16+** installed (verify with `node --version`)
- **npm** package manager (verify with `npm --version`) 
- **Airtable account** with personal access token
- **Discord account** for OAuth setup
- **Modern web browser** (Chrome, Firefox, Edge)

## Step 1: Initial Setup 🚀

1. **Navigate to project folder**:
   ```
   cd "H:\Project Folder\Predecessor website"
   ```

2. **Run complete setup**:
   ```
   Double-click: launchers\setup_project.bat
   ```
   
   This will:
   - Install all frontend and backend dependencies
   - Create environment files from templates
   - Set up required directories

## Step 2: Configure Environment 🔧

### Get Airtable Token
1. Go to [Airtable Developer Hub](https://airtable.com/developers/web/api/introduction)
2. Create a personal access token with full permissions
3. Copy the token (starts with `pat...`)

### Configure Backend (.env)
Edit `backend\.env` and add:
```env
AIRTABLE_PERSONAL_TOKEN=your-airtable-token-here
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
SESSION_SECRET=change-this-to-random-string
JWT_SECRET=change-this-to-random-string
```

### Configure Frontend (.env)
Edit `frontend\.env` if needed (defaults usually work):
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Step 3: Create Database 🗄️

1. **Run database setup**:
   ```
   Double-click: launchers\setup_airtable_database.bat
   ```

2. **Wait for completion** - the script will:
   - Create your Airtable base
   - Set up all 8 required tables
   - Add sample heroes and users
   - Update your .env files with the Base ID

## Step 4: Discord OAuth Setup 🔐

1. **Go to Discord Developer Portal**:
   - Visit: https://discord.com/developers/applications
   - Click "New Application"
   - Name it "Predecessor Tournaments"

2. **Configure OAuth2**:
   - Go to OAuth2 → General
   - Add redirect URL: `http://localhost:3001/api/auth/discord/callback`
   - Copy Client ID and Client Secret to your `backend\.env`

3. **Set OAuth2 Scopes**:
   - Select: `identify` and `email`

## Step 5: Start Development Server 🏃‍♂️

1. **Launch development environment**:
   ```
   Double-click: launchers\start_development.bat
   ```

2. **Wait for servers to start**:
   - Backend API: http://localhost:3001
   - Frontend App: http://localhost:3000
   - Browser will open automatically

## Step 6: Test the Application 🧪

### Basic Functionality Test
1. **Visit** http://localhost:3000
2. **Click "Login with Discord"** - should redirect to Discord
3. **Authorize the application** - should redirect back
4. **Navigate** through the main sections:
   - Home page ✅
   - Tournaments page ✅
   - Profile page ✅ (after login)
   - Admin page ✅ (if admin)

### API Health Check
- Visit: http://localhost:3001/health
- Should return: `{"status":"healthy",...}`

## Step 7: Add Sample Data (Optional) 📊

For testing with realistic data:

1. **Run sample data script**:
   ```
   Double-click: launchers\populate_sample_data.bat
   ```

2. **Sample data includes**:
   - 4 tournaments (different statuses)
   - 5 teams
   - 20 heroes for drafts
   - Player signups and notifications

## Troubleshooting 🔧

### Common Issues

**❌ "Dependencies not found"**
- Run: `launchers\install_dependencies.bat`

**❌ "Discord OAuth fails"**
- Verify redirect URL exactly matches: `http://localhost:3001/api/auth/discord/callback`
- Check Client ID and Secret in `.env`

**❌ "Airtable connection error"**
- Verify your personal token is valid
- Check Base ID was added to `.env` files

**❌ "Port already in use"**
- Close other applications using ports 3000/3001
- Or change ports in environment files

### Debug Mode
Add to `backend\.env`:
```env
LOG_LEVEL=debug
```

### Reset Everything
If you need to start over:
1. Delete `node_modules` folders
2. Delete `.env` files  
3. Run `setup_project.bat` again

## Next Steps 🎯

### For Users
- Configure your Discord server
- Set up tournament administrators
- Create your first tournament
- Invite teams to participate

### For Developers
- Review Phase 2 roadmap in `roadmap\phases\phase2_core.md`
- Check current progress in `roadmap\current_progress.md`
- Start implementing tournament creation features

## Need Help? 🆘

### Check Documentation
- `documentation\README.md` - Full documentation
- `roadmap\current_progress.md` - Current project status
- Backend logs in `backend\logs\` folder

### Verify Installation
- ✅ Node.js and npm versions compatible
- ✅ Airtable token has proper permissions
- ✅ Discord OAuth redirect URL exact match
- ✅ Environment variables properly set
- ✅ Firewalls allow ports 3000/3001

### Test Checklist
- [ ] Project setup completed without errors
- [ ] Environment files configured
- [ ] Airtable database created successfully
- [ ] Discord OAuth configured
- [ ] Development servers start without errors
- [ ] Can access frontend at localhost:3000
- [ ] API health check returns success
- [ ] Discord login works end-to-end

---

**🎉 Congratulations!** You now have a fully functional Predecessor Tournament Management system running locally. You're ready to start developing Phase 2 features or customizing the system for your needs.