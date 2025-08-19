# MASTER Troubleshooting Checklist for ANY Issue

## 🚨 WHEN YOU ENCOUNTER ANY PROBLEM - START HERE

### STEP 1: What YOU Should Provide Me
**To help me troubleshoot ANY issue effectively, please provide:**

#### 📸 Screenshots (Upload to troubleshooting folder - EXTREMELY HELPFUL!)
- [ ] **Screenshot of the error/issue** - What you see vs what you expected
- [ ] **Browser console** - F12 → Console tab (with any red errors visible)
- [ ] **Network tab** - F12 → Network tab (showing failed requests in red)
- [ ] **Current page state** - What the page looks like when broken
- [ ] **NocoDB data** - If database-related, show relevant table data
- [ ] **Terminal windows** - Screenshot of backend/frontend terminal errors

#### 📝 Text Information (Copy/Paste)
- [ ] **Exact error message** - Word for word, including error codes
- [ ] **Step-by-step what you did** - So I can reproduce the issue
- [ ] **Backend terminal output** - Full error stack traces
- [ ] **Frontend console errors** - Any red text from browser console
- [ ] **What you expected to happen** vs **what actually happened**

#### 🔧 System Information
- [ ] **Which browser** - Chrome/Firefox/Edge and version
- [ ] **What you were doing** - Creating tournament, logging in, etc.
- [ ] **Which environment** - Dev/local or production
- [ ] **Any recent changes** - Did anything work before?

---

## 🔍 STEP 2: Authentication Status Check (CRITICAL - CHECK FIRST)

### Before Debugging Any Feature Issue
- [ ] **Are you currently logged in?** - Check top-right corner for your username
- [ ] **Do you have admin access?** - Look for admin-only buttons/features
- [ ] **When did you last log in?** - Sessions can expire
- [ ] **Which authentication method?** - Discord OAuth or test account?

### If Authentication Issues Suspected
- [ ] **Try logging out and back in** - Refresh auth state
- [ ] **Clear browser cache/cookies** - Remove stale session data
- [ ] **Try incognito mode** - Test without cached data
- [ ] **Check backend logs** for auth errors

### Quick Authentication Test
```bash
# Check current auth status
curl http://localhost:3001/api/auth/me

# Should return user data if authenticated, or 401 if not
```

---

## 🔍 STEP 3: System Health Check (Run These Commands)

### Check All Services Are Running
```cmd
# Check if all required services are up
netstat -ano | findstr :3000  # Frontend (should show LISTENING)
netstat -ano | findstr :3001  # Backend (should show LISTENING)
netstat -ano | findstr :8080  # NocoDB (should show LISTENING)  
netstat -ano | findstr :5432  # PostgreSQL (should show LISTENING)

# If any service is missing, find and kill stuck processes:
taskkill //PID [number] //F
```

### Database Status Check
- [ ] **PostgreSQL Service** - Windows Services → "postgresql-x64-[version]" = Running?
- [ ] **NocoDB Access** - Can you open http://localhost:8080 and see tables?
- [ ] **Data Integrity** - Check if expected data exists in database

### Application Access Check
- [ ] **Frontend** - http://localhost:3000 loads without errors?
- [ ] **Backend** - Terminal shows "Server running on port 3001"?
- [ ] **Authentication** - Are you logged in? Admin access if needed?

---

## 🛠️ STEP 4: Issue-Specific Troubleshooting

### If UI/Frontend Issues:
- [ ] **Hard refresh** - Ctrl+F5 to clear cache
- [ ] **Check component files** - Am I editing the right component?
- [ ] **Browser console** - Any JavaScript errors?
- [ ] **Network requests** - Are API calls failing?

### If API/Backend Issues:
- [ ] **Backend terminal** - What error is shown?
- [ ] **Database schema** - Do table columns match what code expects?
- [ ] **Request data** - Is frontend sending correct data format?
- [ ] **Authentication** - Does user have required permissions?

### If Database Issues:
- [ ] **NocoDB access** - Can you see the data?
- [ ] **Schema verification** - Do tables/columns exist as expected?
- [ ] **Data validation** - Are there constraint violations?
- [ ] **Connection issues** - Is PostgreSQL service running?

### If Performance Issues:
- [ ] **Task Manager** - High CPU/memory usage?
- [ ] **Multiple processes** - Too many Node.js processes running?
- [ ] **Network speed** - Slow API responses?
- [ ] **Database size** - Large tables causing slowdowns?

---

## 📊 STEP 5: Information I Can Get vs What I Need From You

### What I CAN Access/Check:
- [ ] **Read/edit code files** - Any file in the project
- [ ] **Run database queries** - Check schemas, data structure
- [ ] **Execute system commands** - Check processes, ports, etc.
- [ ] **Analyze logs** - If you provide terminal output
- [ ] **Review configuration** - Environment files, settings

### What I CANNOT Access (Need Your Help):
- [ ] **Your browser** - Can't see what you see
- [ ] **Real-time visual issues** - Need screenshots
- [ ] **Click/interaction issues** - Need step-by-step description
- [ ] **Your specific data** - Need NocoDB screenshots
- [ ] **Live debugging** - Can't see browser dev tools
- [ ] **System-specific issues** - Windows services, installed software

---

## 🎯 STEP 6: Quick Fixes to Try First

### Universal Fixes (Try These First):
- [ ] **Restart everything** - Close all terminals, run launcher again
- [ ] **Hard refresh browser** - Ctrl+F5
- [ ] **Clear browser cache** - Or try incognito mode
- [ ] **Check all services running** - Use netstat commands above
- [ ] **Logout/login again** - Authentication issues

### Environment Issues:
- [ ] **Wrong port** - Make sure using correct ports (3000/3001/8080)
- [ ] **File not saved** - Ensure all code changes are saved
- [ ] **Wrong environment** - Dev vs production confusion
- [ ] **Outdated cache** - Browser showing old version

---

## 🆘 STEP 7: Emergency Debug Commands

### Get Database Schema:
```bash
cd "H:\Project Folder\Predecessor website\backend"
node -e "const pg = require('./services/postgresql'); pg.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\").then(r => console.log(r.rows))"
```

### Check Specific Table:
```bash
node -e "const pg = require('./services/postgresql'); pg.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TABLE_NAME'\").then(r => console.log(r.rows))"
```

### Find Component Usage:
```bash
grep -r "ComponentName" src/
```

### Kill All Node Processes:
```cmd
taskkill /f /im node.exe
```

---

## 🧠 STEP 8: Critical Database Issues (PostgreSQL)

### PostgreSQL Type Casting Errors
**Symptoms:** `operator does not exist: character varying = uuid`
**Quick Fix:** Cast both sides to text in WHERE clauses
```sql
-- ❌ BROKEN: WHERE id = $1 OR tournament_id = $1
-- ✅ FIXED:  WHERE id::text = $1 OR tournament_id::text = $1
```

### Test Database Queries Manually
```bash
cd "H:\Project Folder\Predecessor website\backend"
node -e "const pg = require('./services/postgresql'); pg.query('SELECT * FROM tournaments WHERE id::text = \$1 OR tournament_id::text = \$1', ['your-id-here']).then(r => console.log('Found:', r.rows.length)).catch(e => console.log('Error:', e.message))"
```

### Common Database Problems
- [ ] **Type mismatches** - UUID vs string comparisons
- [ ] **Missing tables** - Check if migrations ran
- [ ] **Foreign key violations** - IDs don't match between tables
- [ ] **Connection issues** - PostgreSQL service not running

---

## 📋 STEP 9: Issue Priority Framework

### 🔥 CRITICAL (Fix Immediately):
- Site completely down
- Can't login at all
- Database corruption
- Security vulnerabilities

### ⚠️ HIGH (Fix Soon):
- Core features broken
- Admin functions not working
- Data loss potential
- User experience severely impacted

### 📋 MEDIUM (Fix When Possible):
- Minor UI issues
- Non-critical features broken
- Performance problems
- Cosmetic issues

### 📝 LOW (Enhancement):
- Feature requests
- Nice-to-have improvements
- Code cleanup
- Documentation updates

---

## 🎭 STEP 10: Browser Connection Possibilities

**Unfortunately, I cannot directly connect to your browser**, but you can help me "see" what you see:

### Screenshots Are My Eyes:
- Upload error screenshots to troubleshooting folder
- Show me browser console with errors
- Capture network tab with failed requests
- Screenshot the page state when broken

### Browser Extension Logs:
- Right-click → Inspect Element on problem areas
- Copy any error messages from console
- Export HAR files from Network tab if needed

### Video Recording:
- You could record a short video showing the issue
- Loom, OBS, or Windows Game Bar work well
- Show step-by-step what happens

---

## 🏆 RESOLVED ISSUE REFERENCE: Bracket Persistence

**Issue:** Bracket publish showed success but bracket disappeared after refresh  
**Date Resolved:** August 8, 2025  
**Root Causes Found:**
1. **PostgreSQL Type Casting Error** - `operator does not exist: character varying = uuid`
2. **Double Error Messages** - Both frontend and backend showing error toasts
3. **JavaScript Compilation Error** - Using `await` in non-async function

**Complete Resolution:** See `documentation/BRACKET_PERSISTENCE_ISSUE_RESOLUTION.md`

**Key Lesson:** PostgreSQL type casting issues can cause complete feature failure while showing confusing error messages. Always cast to common type: `WHERE id::text = $1 OR tournament_id::text = $1`

---

**Remember: The more information you provide upfront, the faster I can identify and fix the issue!**