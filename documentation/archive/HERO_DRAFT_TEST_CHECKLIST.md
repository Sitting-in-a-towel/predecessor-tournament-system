# 🎮 Phoenix Hero Draft Testing Checklist

## Pre-Test Setup
- [ ] All services running (Phoenix:4000, React:3000, Backend:3001)
- [ ] Database schema fixed (metadata & settings columns added)
- [ ] Two browser windows open with draft URLs

## Phase 1: Connection & Waiting
- [ ] Both captains show as "Connected" (green indicators)
- [ ] Team names display correctly
- [ ] Presence tracking works (close one tab, see "Disconnected")
- [ ] Reconnect works (reopen closed tab)

## Phase 2: Coin Toss
- [ ] Coin toss options appear after 2 seconds
- [ ] Team 1 clicks "Heads" or "Tails"
- [ ] Team 2 automatically gets the other option
- [ ] Coin flip animation plays in both browsers
- [ ] Winner is announced
- [ ] Winner gets "Choose Pick Order" buttons
- [ ] Pick order choice updates in both browsers

## Phase 3: Hero Pick/Ban Interface

### Visual Elements
- [ ] "Ban Phase" or "Pick Phase" header shows correctly
- [ ] Current team's turn is highlighted
- [ ] Hero grid displays all heroes
- [ ] Role filters work (Carry, Support, Midlane, Offlane, Jungle)
- [ ] "All" filter shows all heroes

### Ban Phase (First 4 turns)
**Turn 1 - Team 1 Bans:**
- [ ] Only Team 1 can select a hero
- [ ] Click any hero to ban
- [ ] Hero shows "BANNED" overlay
- [ ] Ban appears in Team 1's ban list (red badge)
- [ ] Both browsers update instantly
- [ ] Turn switches to Team 2

**Turn 2 - Team 2 Bans:**
- [ ] Only Team 2 can select
- [ ] Previously banned hero is unclickable
- [ ] New ban updates in both browsers
- [ ] Turn switches to Team 1

**Turns 3-4:**
- [ ] Complete alternating bans
- [ ] All 4 bans show in respective team lists

### Pick Phase (Turns 5-6)
**Turn 5 - Team 1 Picks:**
- [ ] Header changes to "Pick Phase"
- [ ] Selected hero shows "PICKED" overlay
- [ ] Pick appears in Team 1's pick list (green badge)
- [ ] Banned heroes remain unavailable

**Turn 6 - Team 2 Picks:**
- [ ] Team 2 selects from remaining heroes
- [ ] Cannot pick already picked heroes

### Additional Bans (Turns 7-8)
- [ ] Returns to "Ban Phase"
- [ ] Two more bans (one per team)

### Final Picks (Turns 9-10)
- [ ] Final pick phase
- [ ] Each team completes their roster

## Phase 4: Real-Time Sync Testing

### Multi-Browser Tests
- [ ] Open a third browser as spectator
- [ ] All selections sync across all browsers
- [ ] No delay in updates
- [ ] Selections cannot be undone

### Error Handling
- [ ] Clicking when not your turn shows error message
- [ ] Trying to pick banned hero fails gracefully
- [ ] Trying to ban picked hero fails gracefully

## Phase 5: Draft Completion
- [ ] Draft automatically completes after all picks
- [ ] "Draft Complete" screen appears
- [ ] Shows final team compositions
- [ ] "Return to Tournament" button works
- [ ] Draft results saved to database

## Edge Cases to Test
- [ ] Rapid clicking doesn't cause issues
- [ ] Browser refresh maintains draft state
- [ ] Captain disconnect pauses draft
- [ ] Captain reconnect resumes draft
- [ ] Invalid captain URLs show error

## Performance Tests
- [ ] No lag during hero selection
- [ ] Animations are smooth
- [ ] Filter changes are instant
- [ ] Large hero grid renders quickly

## Integration Tests
- [ ] Check React tournament system for draft status
- [ ] Verify draft appears in tournament drafts list
- [ ] Status shows as "In Progress" then "Completed"
- [ ] Draft results accessible from React

---

## 🐛 Common Issues & Solutions

### "Column metadata does not exist"
**Fix:** Run the database fix SQL commands

### "It's not your turn to select"
**Expected:** This is correct behavior - only current team can select

### Heroes not showing
**Check:** 
- Browser console for errors
- Phoenix server logs
- Network tab for failed requests

### Changes not syncing
**Check:**
- Both browsers connected to same draft ID
- Phoenix PubSub is working
- No JavaScript errors in console

---

## ✅ Test Results

**Date:** _____________

**Tester:** _____________

**Overall Status:** 
- [ ] All tests passed
- [ ] Some issues found (list below)
- [ ] Blocking issues (list below)

**Notes:**
_____________________________________
_____________________________________
_____________________________________

**Issues Found:**
1. _____________________________________
2. _____________________________________
3. _____________________________________