# 🚨 CRITICAL: PRODUCTION DATABASE CONFIGURATION

## ACTUAL PRODUCTION SETUP (DO NOT CHANGE!)

### ✅ **REAL Production Database:**
- **Service**: Render PostgreSQL 
- **Host**: dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com
- **Database**: predecessor_tournament_db
- **User**: predecessor_tournament_db_user
- **Connection**: postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db

### 🔑 **Phoenix Production Secrets:**
- **SECRET_KEY_BASE**: `4350d403df7c38dc965fecdc9fbc2780`
- **Generated**: August 2025 for Phoenix draft server deployment

### ❌ **NOT USING:**
- ~~Supabase~~ (was a confusion - ignore this completely)
- ~~Local database for production~~ (local is only for development)

### 🏗️ **Architecture:**
```
LOCAL DEVELOPMENT:
- Frontend: localhost:3000 
- Backend: localhost:3001
- Database: PostgreSQL on local machine (accessible via NocoDB)

PRODUCTION:
- Frontend: Netlify (ocl-predecessor.netlify.app)
- Backend: Render (predecessor-tournament-api.onrender.com) 
- Database: Render PostgreSQL (the connection string above)
```

## 🔧 **Database Management:**

### **To copy local data to production:**
```bash
cd "H:\Project Folder\Predecessor website\backend"
node scripts/copy-to-render-postgresql.js
```

### **To check production database:**
Use the Render dashboard or connect directly with:
```
postgresql://predecessor_tournament_db_user:2WQIOj046lYHGuGnXFA5Ks5asy21xTcH@dpg-d24r7vfgi27c73bbmgh0-a.singapore-postgres.render.com/predecessor_tournament_db
```

## ⚠️ **NEVER AGAIN:**
1. Don't assume what database is being used
2. Always check Render environment variables first
3. Don't create new database services without confirming
4. The working production setup should NOT be changed

## 🚨 **If "no drafts found" appears again:**
1. Check if Render PostgreSQL is accessible
2. Check if migration scripts accidentally cleared data
3. Run copy-to-render-postgresql.js to restore from local
4. DO NOT try to switch to different databases

---
**Created: 2025-08-19 - After the Supabase confusion incident**