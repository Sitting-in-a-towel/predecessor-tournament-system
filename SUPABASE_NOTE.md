# Important: Supabase Password Note

Your Supabase password contains special characters that might need URL encoding:
- Password: `Antigravity7@!89`
- The `@` and `!` characters might cause connection issues

## If Connection Fails:

1. **Try URL-encoded version:**
   Replace in your .env files:
   ```
   postgresql://postgres:Antigravity7%40%2189@db.gvcxbwwnbkpqllqcvlxl.supabase.co:5432/postgres
   ```
   
2. **Or change your Supabase password to something simpler:**
   - Go to Supabase dashboard
   - Settings → Database
   - Reset database password
   - Use only letters and numbers

3. **Test the connection:**
   ```bash
   node scripts/test-supabase.js
   ```

## Current Setup:
- Development: Uses memory (no database needed)
- Staging: Uses Supabase PostgreSQL
- Production: Uses Supabase PostgreSQL

You can work in development without any database connection!