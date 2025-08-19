# CLAUDE.md - Master Reference Document
*Last Updated: 2025-01-14*

## 🎯 CRITICAL - DO NOT CHANGE (Working Perfectly)

### Timer Reset Logic (CRITICAL - Fixed Jan 14, 2025)
- **Timer Reset Timing**: Timer ONLY resets when "Lock In" button is pressed, NOT when hero is selected
- **Two-Phase Selection**: 
  1. Select hero → `select_hero` event → stores in assigns, no database change
  2. Press "Lock In" → `confirm_hero_selection` → calls `confirm_hero_selection/4` → resets timer
- **Broadcasts**: 
  - "selection_made" when hero selection is committed to database
  - "timer_reset" when timer is reset for next turn
- **Function Split**:
  - `make_selection/4` - Makes pick/ban without timer reset
  - `confirm_hero_selection/4` - Makes pick/ban AND resets timer
- **Synchronization**: All timer updates broadcast to all clients via PubSub

### Timer Synchronization (CRITICAL - Fixed Jan 14, 2025)
- **Server-Side Timer Broadcast**: All broadcasts include calculated `remaining_time` from server
- **Timer Tick Process**: Spawned process broadcasts synchronized timer updates every second
- **Early Timer Start**: Timer tick process starts when pick order is chosen (before ban phase)
- **Template Sync**: Uses `@timer_remaining` from broadcasts, not local calculation
- **Broadcast Format**: All events now send `{event, session, remaining_time}` tuple
- **Handler Coverage**: All LiveView handlers support both old (2-param) and new (3-param) formats
- **Bonus Timer Fix**: Displays when `timer_strategy_enabled` is true, shows default 10s values

### Phoenix Draft Layout (FIXED - DO NOT MODIFY)
- **Pick/Ban Phase Container MUST BE**: `position: fixed; top: 40px; left: 0; right: 0; bottom: 0;`
  - This is the ONLY way to get true full-width layout without left-side empty space
  - Changed from `absolute` to `fixed` was the key fix
- **Team Panels**: 140px width each side (Golden Lions left, Crystal Guardians right)
- **Hero Grid**: Uses flex: 1 to fill remaining space between panels
- **Result**: FULL viewport width with no wasted space on sides
- **Reference**: Screenshots in `documentation\Troubleshooting reference images\3.png` shows desired layout

### 3-Second Countdown Modal (CRITICAL - DO NOT BREAK)
- **When**: Appears after captain chooses pick order ("Pick First" or "Pick Second")
- **Display**: Shows on BOTH captain screens simultaneously
- **Function**: Counts down 3 → 2 → 1 then transitions to Ban Phase
- **Critical Implementation**:
  ```elixir
  # 1. Broadcast countdown start to ALL clients
  Phoenix.PubSub.broadcast("draft:#{draft_id}", {"countdown_started", %{countdown_time: 3}})
  
  # 2. Broadcast each countdown tick to ALL clients  
  Phoenix.PubSub.broadcast("draft:#{draft_id}", {"countdown_tick", %{countdown_time: new_time}})
  
  # 3. Broadcast countdown finished to ALL clients
  Phoenix.PubSub.broadcast("draft:#{draft_id}", {"countdown_finished", %{}})
  ```
- **Handler Pattern**: `handle_info({:countdown_tick, draft_id}, socket)` - uses draft_id STRING, not integer
- **NEVER use**: `{:countdown_tick, count}` pattern - causes arithmetic errors
- **Modal HTML**: `z-[9999]` overlay with large countdown number, yellow border
- **Location**: `draft_live.html.heex` lines ~495-506

### Working Color Scheme (DO NOT CHANGE)
- Background Dark: `#36393f`
- Panel Dark: `#2f3136` 
- Ban Slots (empty): `#4a4a4a`
- Ban Slots (filled): `#5c1e1e`
- Pick Slots (empty): `#4a4a4a`
- Pick Slots (filled): `#1e5c1e`
- Timer: Yellow `#fbbf24` on black

## 📁 Project Structure

### Three Main Systems
1. **Frontend** (React) - Port 3000
   - Location: `/frontend`
   - Tournament management UI
   - Admin dashboard
   
2. **Backend** (Node.js/Express) - Port 3001
   - Location: `/backend`
   - API and database management
   - Discord OAuth handling
   
3. **Phoenix Draft** (Elixir/Phoenix LiveView) - Port 4000
   - Location: `/phoenix_draft`
   - Real-time draft system
   - WebSocket connections
   - Hero selection interface

### Database Configuration
- **Type**: PostgreSQL
- **Port**: 5432
- **Database Name**: `tournament_system`
- **Password**: `Antigravity7@!89`
- **Important**: NO AIRTABLE - fully migrated to PostgreSQL

## 🚀 Starting the System

### Quick Start (Recommended - All Services)
```batch
cd "H:\Project Folder\Predecessor website\launchers"
Unified_Development_Launcher.bat
```

### Individual Services (if needed)
```batch
# Frontend
cd frontend && npm start

# Backend  
cd backend && npm run dev

# Phoenix Draft
cd phoenix_draft && mix phx.server
```

## 🔧 Common Issues & Quick Solutions

### Phoenix Draft Issues

#### Issue: Template Compilation Error
**Error**: `end of do-block reached without closing tag`
**Solution**: Phoenix LiveView is very strict. Check all div tags are closed and conditional blocks are properly nested.

#### Issue: Layout Not Full Width / Empty Space on Left
**Error**: Empty space to the left of team panels
**Solution**: Container MUST use `position: fixed` with `left: 0; right: 0` (NOT `position: absolute`)

#### Issue: Hero Grid Compilation Error
**Error**: HTML parsing errors in hero_grid.ex
**Solution**: Recreate the template cleanly, avoid complex nested conditionals

### Database Issues

#### Foreign Key Violations
**Tables affected**: draft_sessions, brackets, teams, tournament_registrations
**Solution**: Always ensure parent records exist before creating child records

#### UUID Format Issues  
**Solution**: PostgreSQL requires proper UUID format, sometimes needs explicit casting with `::uuid`

### Authentication Issues
**Flow**:
1. User visits site → Redirected to Discord OAuth
2. Discord returns with code → Backend exchanges for token  
3. Token stored in cookie → Used for all API calls
4. Phoenix draft receives token via URL parameter

**Common Fix**: Clear cookies and re-authenticate

## 🎮 Game Data

### Predecessor Heroes (54 total)
**Roles**: Offlane, Midlane, Carry, Support, Jungle

**Hero List Location**: `phoenix_draft/lib/predecessor_draft_web/live/components/hero_grid.ex`

## 🚫 DO NOT MAKE THESE MISTAKES

1. **NEVER change** the Phoenix draft `position: fixed` layout (it's finally working!)
2. **NEVER modify** team panel widths from 140px
3. **DON'T change** database passwords without updating ALL config files
4. **DON'T commit** .env files or any credentials
5. **ALWAYS use** the Unified launcher to start services
6. **NEVER** try to use Airtable code (fully removed)

## 📝 Quick Testing

### Test Draft URL Format
```
http://localhost:4000/draft/[draft_id]?token=[auth_token]&captain=1
```

### Admin Panel
- Requires Discord account with `is_admin: true` in database
- Access at: http://localhost:3000/admin

## 🔍 Debugging Locations

| Issue Type | Where to Look |
|------------|---------------|
| Frontend errors | Browser Console (F12) |
| Backend API errors | Terminal running backend |
| Phoenix errors | Terminal running Phoenix |
| Database issues | `psql` or check `backend/scripts/` |
| Compilation errors | `_build/dev/lib/` in Phoenix |

## 💡 Quick Commands

```batch
# Kill all services
taskkill /F /IM node.exe
taskkill /F /IM beam.smp.exe

# Check port usage
netstat -ano | findstr :3000
netstat -ano | findstr :3001  
netstat -ano | findstr :4000
netstat -ano | findstr :5432

# Database quick check
psql -U postgres -d tournament_system -c "SELECT COUNT(*) FROM users;"

# Phoenix commands
mix deps.get        # Install dependencies
mix ecto.reset      # Reset database
mix compile        # Force recompile
mix phx.server     # Start server
```

## 📊 Current Working State (January 2025)

### ✅ Fully Working
- Phoenix draft with FULL-WIDTH layout (no side margins)
- Coin toss phase
- Pick order selection  
- Hero grid with 54 heroes
- Real-time WebSocket updates
- Discord OAuth authentication
- Tournament bracket creation
- Draft session creation from matches

### ⚠️ Known Minor Issues
- Timer countdown animation could be smoother
- Some compilation warnings (non-critical)
- Admin dashboard statistics may show zeros

### 🔮 Future Enhancements
- Flesh out ruleset within tournaments and have preselected drop downs as well as free text fields

## 🗂️ Important Files

### Configuration
- `/backend/.env` - Backend environment variables
- `/frontend/.env` - Frontend environment variables  
- `/phoenix_draft/config/` - Phoenix configuration

### Key Components
- `/phoenix_draft/lib/predecessor_draft_web/live/draft_live.html.heex` - Main draft template
- `/phoenix_draft/lib/predecessor_draft_web/live/components/hero_grid.ex` - Hero selection grid
- `/backend/routes/draft.js` - Draft API endpoints
- `/frontend/src/components/Tournament/TournamentDrafts.js` - Draft management UI

## 📸 Reference Screenshots
Always check `/documentation/Troubleshooting reference images/` for correct appearance:
- `1.png` - Reference layout from other system
- `2.png` - Previous broken state  
- `3.png` - CORRECT full-width layout
- `4.png` - Test template issue

---
**REMEMBER**: If the Phoenix draft layout is working with full width and no left margin, DO NOT CHANGE the positioning CSS!