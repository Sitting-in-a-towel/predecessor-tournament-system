# 🧪 Complete Testing Steps for Phoenix Draft Integration

## Prerequisites
1. ✅ All services running (React:3000, Backend:3001, Phoenix:4000)  
2. ❌ **DATABASE FIX NEEDED** - Run SQL fix first (see Step 1)
3. ✅ Tournament with teams and matches in React system

## Step 1: Fix Database Schema 🛠️
**REQUIRED:** Run this SQL in PostgreSQL before testing:

```sql
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
```

## Step 2: Test Phoenix API 🔧

Run the test script:
```bash
H:\Project Folder\Predecessor website\test_phoenix_api.bat
```

**Expected Result:** JSON responses showing draft creation and status

## Step 3: Test React Integration 🌐

### 3.1 Navigate to Tournament
1. Open browser: `http://localhost:3000`
2. Log in as admin or team captain
3. Go to a tournament with published brackets
4. Click "Drafts" tab

### 3.2 Create Draft via React
1. Select a match from dropdown  
2. Click "Create Draft Session"
3. **Expected:** Success message + draft appears in list
4. **Expected:** Draft buttons show Phoenix URLs (localhost:4000)

### 3.3 Test Phoenix Draft Room
1. Click "Enter as [Team Name]" button
2. **Expected:** Phoenix page opens at `http://localhost:4000/draft/{id}`
3. **Expected:** Waiting screen with team connection status
4. Open second browser tab/window
5. Click the other team's button
6. **Expected:** Both teams show "connected"

### 3.4 Test Coin Toss
1. After both teams connect
2. **Expected:** Coin choices appear after 2 second delay
3. First team clicks "Heads" or "Tails"  
4. **Expected:** Other team gets the remaining choice
5. **Expected:** Coin flip animation + winner announcement
6. **Expected:** "Choose pick order" for winning team

### 3.5 Test Real-time Sync
1. Keep both browser tabs open
2. Make changes in one tab
3. **Expected:** Changes appear instantly in other tab
4. Go back to React tournament page
5. **Expected:** Draft status updates automatically (polling)

## Step 4: Test Multi-Browser Sync 🔄

### 4.1 Open Multiple Browsers
1. Chrome: Captain 1 view
2. Firefox: Captain 2 view  
3. Edge: Spectator view
4. **Expected:** All show same draft state in real-time

### 4.2 Test Spectator Mode
1. Open: `http://localhost:4000/draft/{draft_id}/spectate`
2. **Expected:** Read-only view of draft progress
3. Make changes in captain views
4. **Expected:** Spectator sees updates instantly

## Step 5: Test Error Handling 🚨

### 5.1 Connection Loss
1. Close one captain's browser
2. **Expected:** Other captain sees "opponent disconnected"
3. **Expected:** Draft pauses/resets to waiting state

### 5.2 Invalid Data
1. Try accessing non-existent draft: `http://localhost:4000/draft/invalid-id`
2. **Expected:** Proper error message

## Step 6: Test React Backend Sync 📡

### 6.1 Complete Draft Process
1. Go through full coin toss process
2. **Expected:** React backend receives status updates
3. Check React drafts tab
4. **Expected:** Draft shows as "In Progress" → "Completed"

### 6.2 Polling Verification
1. Open browser dev tools → Network tab
2. **Expected:** XHR requests to Phoenix status endpoint every 10 seconds
3. **Expected:** React UI updates when Phoenix status changes

## 🐛 Common Issues & Solutions

### Database Errors
- **Error:** `column "metadata" does not exist`
- **Fix:** Run SQL fix in Step 1

### UUID Format Errors  
- **Error:** `does not match type :binary_id`
- **Fix:** Ensure all IDs are proper UUID format (8-4-4-4-12 chars)

### Port Conflicts
- **Error:** `eaddrinuse` 
- **Fix:** Run `H:\Project Folder\Predecessor website\launchers\Kill_Port_4000.bat`

### Services Not Running
- **Error:** Connection refused
- **Fix:** Run unified launcher or start services individually

## ✅ Success Criteria

**Integration is working correctly when:**

1. ✅ React can create drafts via Phoenix API
2. ✅ Phoenix draft page opens from React links  
3. ✅ Real-time sync works between browsers
4. ✅ Coin toss completes successfully
5. ✅ React receives status updates from Phoenix
6. ✅ Draft completion updates React tournament system
7. ✅ Spectator mode works for non-participants

## 📊 Test Results Template

Fill this out during testing:

- [ ] Database schema fixed
- [ ] Phoenix API responds correctly  
- [ ] React draft creation works
- [ ] Phoenix draft room loads
- [ ] Multi-browser sync working
- [ ] Coin toss functional
- [ ] Status polling working
- [ ] Error handling appropriate
- [ ] Spectator mode functional
- [ ] Full draft completion flow

**Notes:**
_Add any issues or observations here_

---

## 🎯 Next Steps After Successful Testing

1. **Phase 3:** Complete hero pick/ban interface
2. **Phase 4:** Advanced testing with real tournament data  
3. **Phase 5:** Production deployment setup
4. **Documentation:** Update all system docs with Phoenix integration details