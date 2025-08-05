# Adding Test Teams to Production Database

## Option 1: Using Local psql Command (Recommended)

1. Open Command Prompt
2. Navigate to the scripts folder:
   ```
   cd "H:\Project Folder\Predecessor website\backend\scripts"
   ```

3. Run psql with your production DATABASE_URL:
   ```
   psql "YOUR_PRODUCTION_DATABASE_URL" -f test-teams-sql.sql
   ```
   
   Replace `YOUR_PRODUCTION_DATABASE_URL` with the actual URL from Render Dashboard.

## Option 2: Using the Batch File

1. Double-click: `backend\scripts\add-test-teams-to-production.bat`
2. Paste your production DATABASE_URL when prompted
3. Press Enter

## Option 3: Manual Steps

1. Get your production DATABASE_URL from Render:
   - Go to Render Dashboard
   - Click on your PostgreSQL database
   - Go to "Connect" tab
   - Copy the "External Database URL"

2. Connect using pgAdmin or psql:
   ```
   psql "postgresql://username:password@host:port/database"
   ```

3. Run the SQL from `backend\scripts\test-teams-sql.sql`

## Finding Your Production DATABASE_URL

1. Log into https://dashboard.render.com
2. Find your PostgreSQL database service
3. Click on it
4. Go to "Connect" section
5. Copy the "External Database URL"

The URL will look something like:
```
postgresql://predecessor_user:XXXXXXX@dpg-XXXXXXX.render.com/predecessor_db
```

## What Gets Created

10 test teams with captains:
- Alpha Wolves (AlphaLeader)
- Beta Brigade (BetaCommander)
- Gamma Guardians (GammaGuard)
- Delta Dragons (DeltaDrake)
- Echo Eagles (EchoEagle)
- Foxtrot Phoenixes (FoxtrotFlame)
- Golf Gladiators (GolfGladiator)
- Hotel Hurricanes (HotelHurricane)
- India Invaders (IndiaInvader)
- Juliet Juggernauts (JulietJuggernaut)

## Verify Teams Were Created

After running the script, you can verify in your app:
1. Go to https://ocl-predecessor.netlify.app
2. Create a new tournament
3. The test teams should appear in the team selection dropdown