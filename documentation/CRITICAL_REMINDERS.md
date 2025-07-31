# ⚠️ CRITICAL REMINDERS - READ FIRST

## 🚫 NO AIRTABLE
**The project has been FULLY MIGRATED to PostgreSQL. Do NOT add any Airtable code.**
- Migration completed: July 29-30, 2025
- All Airtable references have been removed
- Use `backend/services/postgresql.js` for all database operations

## 🔑 Environment Files Location
**There are MULTIPLE .env files - check them all:**
1. `/` (root) - Main .env file
2. `/backend/.env` - Backend-specific (TAKES PRECEDENCE for backend)
3. `/frontend/.env` - Frontend local development
4. `/frontend/.env.production` - Frontend production

## 🌐 API Endpoints
**Frontend must ALWAYS use /api prefix:**
- ✅ Correct: `https://predecessor-tournament-api.onrender.com/api/auth/me`
- ❌ Wrong: `https://predecessor-tournament-api.onrender.com/auth/me`

## 🔐 Current Discord OAuth Credentials
- Client ID: `1398158696797700096`
- Client Secret: `76AdCNAl2UxVitiYpZO-mUUD03ekh6DU`
- These must be consistent across ALL .env files

## 📊 Current Database
- **Local**: PostgreSQL (localhost:5432)
- **Production**: PostgreSQL on Render (Singapore)
- **User**: postgres
- **Password**: Antigravity7@!89

## 🚀 Deployment
- **Frontend**: Netlify (ocl-predecessor.netlify.app)
- **Backend**: Render (predecessor-tournament-api.onrender.com)
- **Database**: PostgreSQL on Render

Last Updated: July 30, 2025