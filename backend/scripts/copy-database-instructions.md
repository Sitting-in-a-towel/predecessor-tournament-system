# 📋 How to Copy Your Local Database to Production (Supabase)

## Option 1: Direct SQL Copy (Recommended)

### Step 1: Export your local database
```bash
# In your terminal/command prompt:
cd "H:\Project Folder\Predecessor website\backend\scripts"
set PGPASSWORD=Antigravity7@!89
pg_dump -h localhost -p 5432 -U postgres -d predecessor_tournaments --data-only --no-owner --no-acl > local_data.sql
```

### Step 2: Get your Supabase connection info
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → Database
4. Copy the connection string (it looks like: postgresql://postgres.xxxxx:password@db.xxxxx.supabase.co:5432/postgres)

### Step 3: Import to Supabase
```bash
# Replace the connection string with yours from Supabase
psql "postgresql://postgres.hqoqbtmsmpzqqrklvkmz:[YOUR-PASSWORD]@db.hqoqbtmsmpzqqrklvkmz.supabase.co:5432/postgres" < local_data.sql
```

## Option 2: Using Supabase Dashboard

1. Export your local data:
```sql
-- Run this in your local database to get all tournaments
SELECT * FROM tournaments;
SELECT * FROM teams;
SELECT * FROM users;
SELECT * FROM draft_sessions;
-- Copy the results
```

2. Go to Supabase SQL Editor:
- https://app.supabase.com/project/YOUR_PROJECT/sql
- Paste and run INSERT statements

## Option 3: Using the Node.js Script

1. Add to your `.env` file:
```
SUPABASE_HOST=db.hqoqbtmsmpzqqrklvkmz.supabase.co
SUPABASE_PASSWORD=your-password-from-supabase
SUPABASE_USER=postgres.hqoqbtmsmpzqqrklvkmz
```

2. Run:
```bash
cd "H:\Project Folder\Predecessor website\backend"
node scripts/copy-local-to-production.js
```

## Quick Test to Create Draft Data

If you just want to quickly test, run this in your browser console while on the admin page:

```javascript
// Create a test draft session
fetch('https://predecessor-tournament-api.onrender.com/api/test/create-test-draft/YOUR-TOURNAMENT-ID', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
})
.then(r => r.json())
.then(data => console.log('Draft created:', data));
```

Replace `YOUR-TOURNAMENT-ID` with one of your tournament IDs from the admin panel.