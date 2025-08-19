# Manual Draft Testing Instructions

## Option A: Test Through React Website (Recommended)

1. **Navigate to:** `http://localhost:3000/tournaments/67e81a0d-1165-4481-ad58-85da372f86d5`
2. **Click:** "Drafts" tab
3. **Select:** A match from the dropdown (shows your bracket matches)
4. **Click:** "Create Draft Session"
5. **Result:** Draft gets created and buttons appear to enter draft

### If you see "Enter as [Team Name]" buttons:
- Click one button → Opens Phoenix draft for Team 1 captain
- Open another browser/incognito → Click the other team's button
- Both captains are now in the draft room

## Option B: Direct Phoenix Test (If React Has Issues)

### Create a test draft directly in Phoenix:

1. **Open PowerShell or Command Prompt**

2. **Run this command to create a draft:**
```bash
curl -X POST http://localhost:4000/api/drafts -H "Content-Type: application/json" -d "{\"draft_id\":\"test-draft-123\",\"tournament_id\":\"67e81a0d-1165-4481-ad58-85da372f86d5\",\"team1_id\":\"11111111-1111-1111-1111-111111111111\",\"team2_id\":\"22222222-2222-2222-2222-222222222222\",\"team1_captain_id\":\"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"team2_captain_id\":\"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\"}"
```

3. **Open two browser tabs:**
   - Tab 1: `http://localhost:4000/draft/test-draft-123?captain=1`
   - Tab 2: `http://localhost:4000/draft/test-draft-123?captain=2`

## What You Should See:

### Phase 1: Waiting Room
- Both captains show as "Connected" ✅
- Team names displayed
- "Waiting for captains" message

### Phase 2: Coin Toss (after 2 seconds)
- Team 1: Sees "Heads" and "Tails" buttons
- Team 1: Click one option
- Team 2: Automatically gets the other option
- Coin animation plays
- Winner announced
- Winner chooses pick order

### Phase 3: Hero Pick/Ban
- Hero grid appears with all Predecessor heroes
- Current turn indicator at top
- **Turns 1-4:** BAN phase (select heroes to ban)
- **Turns 5-6:** PICK phase (select heroes for your team)
- **Turns 7-8:** More BANS
- **Turns 9-10:** Final PICKS
- Selected heroes show PICKED/BANNED overlay
- Both browsers sync in real-time

### Phase 4: Completion
- "Draft Complete" message
- Final team compositions shown
- Link to return to tournament

## Troubleshooting:

### "Failed to create draft" in React:
- Teams might not have proper captain IDs
- Check browser console (F12) for specific error

### "Column metadata does not exist":
- Database fix didn't apply
- Re-run: `psql -h localhost -p 5432 -U postgres -d predecessor_tournaments -c "ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';"`

### Draft page won't load:
- Phoenix not running on port 4000
- Check: `http://localhost:4000` should show Phoenix welcome page

### Changes not syncing between browsers:
- Make sure both browsers are using same draft ID
- Check Phoenix console for errors