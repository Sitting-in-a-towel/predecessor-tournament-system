# TROUBLESHOOTING GUIDE
*Last Updated: 2025-01-14*

## 🔴 Critical Issues & Solutions

### Phoenix Draft Layout Issues

#### Issue: Empty Space on Left Side of Draft Interface
**Symptoms**: Gap between left edge of browser and Golden Lions team panel
**Solution**: 
```css
/* MUST USE position: fixed (NOT absolute) */
position: fixed; top: 40px; left: 0; right: 0; bottom: 0;
```
**Location**: `/phoenix_draft/lib/predecessor_draft_web/live/draft_live.html.heex` line ~232

#### Issue: Draft Shows "TEST TEMPLATE" Only  
**Symptoms**: Blank page with just "TEST TEMPLATE" text
**Cause**: Template was simplified during debugging
**Solution**: Restore full template with all phases (coin toss, pick order, pick/ban)

#### Issue: Phoenix Template Compilation Error
**Error**: `end of do-block reached without closing tag for <div>`
**Common Causes**:
- Missing closing `</div>` tags
- Improperly nested conditional blocks (`<%= if %>` ... `<% end %>`)
- Unbalanced HTML structure
**Solution**: 
1. Check all div tags are properly closed
2. Verify all `<%= if %>` blocks have matching `<% end %>`
3. Use proper HTML validation

### Database Connection Issues

#### Issue: PostgreSQL Connection Failed
**Symptoms**: "Connection refused" or timeout errors
**Solutions**:
1. Check PostgreSQL is running: `pg_ctl status`
2. Verify port 5432 is available: `netstat -ano | findstr :5432`
3. Check password in config files matches: `Antigravity7@!89`
4. Restart PostgreSQL service

#### Issue: Foreign Key Constraint Violations
**Common Tables**: draft_sessions, brackets, tournament_registrations
**Solution**: Always create parent records first:
```sql
-- Example: Create tournament before draft_session
INSERT INTO tournaments (...) VALUES (...);
INSERT INTO draft_sessions (tournament_id, ...) VALUES (...);
```

### Authentication Problems

#### Issue: Discord OAuth Redirect Loop
**Symptoms**: Keeps redirecting to Discord, never completing login
**Solutions**:
1. Clear browser cookies
2. Check Discord app credentials in `.env`
3. Verify redirect URLs in Discord developer console
4. Check backend logs for OAuth token exchange errors

#### Issue: Phoenix Draft Token Invalid
**Error**: 403 Forbidden when accessing draft URLs
**Solutions**:
1. Ensure token is passed in URL: `?token=[auth_token]`
2. Check token hasn't expired
3. Verify user exists in database
4. Clear cookies and re-authenticate

### Service Startup Issues

#### Issue: Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3000`
**Solutions**:
```batch
# Kill all Node processes
taskkill /F /IM node.exe

# Kill Phoenix processes  
taskkill /F /IM beam.smp.exe

# Check specific ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :4000
```

#### Issue: Services Won't Start from Launcher
**Solutions**:
1. Check all `.env` files exist and are properly configured
2. Run `npm install` in frontend and backend folders
3. Run `mix deps.get` in phoenix_draft folder
4. Try starting services individually to isolate the issue

## 🟡 Common Warnings (Non-Critical)

### Phoenix Compilation Warnings
These warnings are normal and don't affect functionality:
- `function format_changeset_errors/1 is unused`
- `variable "bans" is unused`
- `defining a Gettext backend by calling use Gettext, otp_app`

### Frontend Console Warnings
Normal warnings that can be ignored:
- React warnings about key props
- DevTools extensions warnings
- Minor CSS property warnings

## 🔧 Diagnostic Commands

### Quick Health Check
```batch
# Check all services
netstat -ano | findstr ":3000 :3001 :4000 :5432"

# Test database connection
psql -U postgres -d tournament_system -c "SELECT NOW();"

# Check frontend is responding
curl http://localhost:3000

# Check backend API
curl http://localhost:3001/api/health

# Check Phoenix draft
curl http://localhost:4000
```

### Debug Database Issues
```sql
-- Check table exists and has data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM tournaments;
SELECT COUNT(*) FROM draft_sessions;

-- Check for orphaned records
SELECT * FROM draft_sessions WHERE tournament_id NOT IN (SELECT id FROM tournaments);

-- Check latest records
SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 5;
```

### Phoenix Debugging
```bash
# In phoenix_draft folder
mix compile                    # Force recompilation
mix ecto.reset                # Reset database
mix phx.routes               # Check available routes
iex -S mix phx.server        # Start with interactive shell
```

## 🎯 Step-by-Step Recovery

### If Everything Is Broken
1. **Kill all services**: `taskkill /F /IM node.exe && taskkill /F /IM beam.smp.exe`
2. **Check PostgreSQL**: Start PostgreSQL service if stopped
3. **Update dependencies**: Run `npm install` in frontend/backend, `mix deps.get` in phoenix_draft
4. **Reset database**: `cd phoenix_draft && mix ecto.reset`
5. **Start services**: Use `Unified_Development_Launcher.bat`
6. **Test each service**: Visit localhost:3000, :3001, :4000
7. **Check logs**: Look for errors in each terminal window

### If Only Phoenix Draft Is Broken
1. **Check compilation**: `cd phoenix_draft && mix compile`
2. **Check template syntax**: Verify `.heex` files have proper HTML structure
3. **Reset if needed**: `mix ecto.reset`
4. **Check positioning CSS**: Ensure pick/ban container uses `position: fixed`

### If Only Authentication Is Broken
1. **Clear browser data**: Cookies, localStorage, sessionStorage
2. **Check Discord app**: Verify client ID/secret in backend `.env`
3. **Check redirect URLs**: Must match Discord app configuration
4. **Restart backend**: Stop and restart backend service

## 📋 Verification Checklist

After fixing issues, verify these work:
- [ ] Can access frontend at localhost:3000
- [ ] Can authenticate with Discord
- [ ] Can create tournaments
- [ ] Can create drafts from matches
- [ ] Phoenix draft loads at localhost:4000
- [ ] Draft interface shows full-width layout
- [ ] Coin toss works
- [ ] Hero selection works
- [ ] Real-time updates work between multiple browser tabs

## 🆘 When All Else Fails

1. **Reference working state**: Check `/documentation/Troubleshooting reference images/3.png` for correct layout
2. **Check CLAUDE.md**: Review the "DO NOT CHANGE" sections
3. **Start fresh**: Create new tournament and draft to test
4. **Use Git**: If available, revert to last known working commit
5. **Ask for help**: Provide specific error messages and steps to reproduce

---
**Remember**: Always check the main `/documentation/CLAUDE.md` file first - it contains the most up-to-date information about what's working and what shouldn't be changed!