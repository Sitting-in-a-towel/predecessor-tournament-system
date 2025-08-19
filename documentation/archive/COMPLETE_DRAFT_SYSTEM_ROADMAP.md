# Complete Draft System Implementation Roadmap
## Created: August 8, 2025 - Post Ultra-Analysis

### **CRITICAL REALIZATIONS FROM EXFANG ANALYSIS**

The current implementation is **SURFACE LEVEL ONLY**. Based on Exfang screenshots, we need to build a complete multiplayer draft coordination system, not just basic UI elements.

---

## **PHASE 1: INFRASTRUCTURE FOUNDATION**
*Priority: CRITICAL - Must complete before any draft features*

### **1.1 WebSocket/Socket.io Real-Time System**
**Status**: ❌ Missing  
**Requirements**:
- Real-time communication between captains
- Session management for draft rooms
- Event broadcasting (captain joins, coin toss, hero picks)
- Connection state management
- Automatic reconnection handling

**Deep Testing Required**:
- Two-browser WebSocket connection testing
- Message delivery verification
- Connection drop/reconnect scenarios
- Race condition handling for simultaneous events

### **1.2 Draft Session Database Schema**
**Status**: ❌ Incomplete  
**Requirements**:
```sql
-- Draft sessions table
CREATE TABLE draft_sessions (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  match_id UUID,
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  team1_captain_id UUID REFERENCES users(id),
  team2_captain_id UUID REFERENCES users(id),
  session_state JSONB, -- Current phase, timers, picks, bans
  coin_toss_result JSONB, -- Who chose what, who won
  draft_configuration JSONB, -- Timer settings, ban count, etc
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Captain presence tracking
CREATE TABLE draft_participants (
  session_id UUID REFERENCES draft_sessions(id),
  user_id UUID REFERENCES users(id),
  team_number INTEGER, -- 1 or 2
  joined_at TIMESTAMP,
  last_active TIMESTAMP,
  is_present BOOLEAN DEFAULT false
);

-- Draft actions log
CREATE TABLE draft_actions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES draft_sessions(id),
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50), -- 'join', 'coin_toss', 'pick', 'ban', 'timeout'
  action_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## **PHASE 2: MULTIPLAYER COORDINATION**
*Priority: HIGH - Core multiplayer logic*

### **2.1 Captain Waiting System**
**Status**: ❌ Missing  
**Requirements**:
- "Enter as..." button creates/joins draft session
- "Waiting for other captain" modal overlay
- Real-time detection when both captains present
- Modal disappears when both teams ready
- Database tracking of captain presence

**Implementation Steps**:
1. Create draft session on first captain entry
2. Show waiting modal with WebSocket listener
3. Second captain joins same session
4. Broadcast "both_captains_present" event
5. Remove waiting modal from both clients

**Deep Testing Required**:
- Two-browser simultaneous "Enter as" clicks
- Network delay scenarios (slow second captain)
- Captain disconnect during waiting
- Database state verification at each step

### **2.2 Coin Toss Race Logic**
**Status**: ❌ Missing  
**Requirements**:
- Modal overlay on hero draft interface (not separate page)
- First captain to click disables that option for other captain  
- Real-time updates via WebSocket
- Both teams advance to draft after both select
- Result determines pick order

**Implementation Steps**:
1. Show coin toss modal over grayed-out hero interface
2. First click broadcasts choice to other captain
3. Disable selected option for other captain immediately
4. Store both choices in database
5. Calculate result and advance to draft phase
6. Remove modal, enable hero interface

**Deep Testing Required**:
- Exact simultaneous clicks on same option
- Network lag between choice and update
- What happens if connection drops mid-selection
- Database consistency under race conditions

---

## **PHASE 3: HERO DRAFT INTERFACE**  
*Priority: HIGH - Core draft functionality*

### **3.1 Complete Hero Draft UI**
**Status**: ❌ Missing  
**Requirements Based on Exfang Screenshots**:
- **Team Panels**: Left (Team 1) and Right (Team 2) with pick/ban slots
- **Hero Grid**: Complete hero pool with portraits and role filtering
- **Role Filters**: Offlane, Jungle, Midlane, Carry, Support buttons
- **Timer Display**: Countdown for current phase
- **Phase Indicator**: Current action (Pick/Ban/Skip)
- **Visual States**: Red border for bans, highlighted for picks, grayed for disabled

### **3.2 Pick/Ban Logic System**
**Status**: ❌ Missing  
**Requirements**:
- Standard MOBA draft order (Ban-Ban-Pick-Pick-Ban-Ban-Pick-Pick-Pick-Pick)
- Turn-based progression with visual indicators
- Hero availability tracking (picked/banned heroes become unavailable)
- Automatic turn switching
- Skip functionality for bans

### **3.3 Timer System**
**Status**: ❌ Missing  
**Requirements**:
- Configurable timer per phase (30s default)
- Visual countdown display
- Auto-skip on timeout
- Bonus time system (optional)
- Timer sync between both captains

**Deep Testing Required**:
- Timer synchronization between browsers
- What happens when timer expires
- Network delay impact on timer accuracy
- Timer state persistence on reconnect

---

## **PHASE 4: DRAFT COMPLETION**
*Priority: MEDIUM - End-game functionality*

### **4.1 Draft Results System**
**Status**: ❌ Missing  
**Requirements**:
- "Draft finished!" completion screen
- Final team compositions display
- Custom match code generation for game import
- Draft results storage in database
- Transition back to tournament bracket

---

## **TESTING STRATEGY OVERHAUL**

### **Multi-Browser Testing Framework**
Create comprehensive Playwright tests that run with TWO browsers simultaneously:

```javascript
// Template for ALL draft testing
describe('Draft System Deep Testing', () => {
  let context1, context2, page1, page2;
  
  beforeEach(async () => {
    // Set up two separate browser contexts
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    // Login as different captains
    await loginAsCaptain(page1, 'team1_captain');
    await loginAsCaptain(page2, 'team2_captain');
  });
  
  test('Complete Draft Flow', async () => {
    // Phase 1: Entry and Waiting
    await testCaptainEntry(page1, page2);
    
    // Phase 2: Coin Toss
    await testCoinTossRaceLogic(page1, page2);
    
    // Phase 3: Hero Draft
    await testHeroDraftProgression(page1, page2);
    
    // Phase 4: Completion
    await testDraftCompletion(page1, page2);
    
    // Verify database state at each phase
    await verifyDatabaseConsistency();
  });
});
```

### **Database State Verification**
Every test MUST verify database changes:

```javascript
const verifyDraftState = async (expectedPhase) => {
  const response = await page.request.get('/api/draft/session/state');
  const state = await response.json();
  
  expect(state.current_phase).toBe(expectedPhase);
  expect(state.captains_present).toBe(2);
  // ... verify all expected state changes
};
```

---

## **IMPLEMENTATION PRIORITY ORDER**

### **WEEK 1: Foundation (Deadline Tomorrow)**
1. **WebSocket Infrastructure** - Real-time communication setup
2. **Database Schema** - Draft tables and relationships  
3. **Basic Captain Coordination** - Entry and waiting system
4. **Coin Toss Modal** - Race logic implementation

### **WEEK 2: Core Draft System**  
1. **Hero Draft Interface** - Complete UI implementation
2. **Pick/Ban Logic** - Turn-based progression
3. **Timer System** - Phase timing and auto-skip
4. **Draft Completion** - Results and match codes

### **WEEK 3: Testing and Polish**
1. **Comprehensive Multi-Browser Testing** 
2. **Error Handling and Edge Cases**
3. **Performance Optimization**  
4. **Documentation and Deployment**

---

## **SUCCESS CRITERIA**

The draft system is complete when:

1. ✅ Two captains can simultaneously click "Enter as..." 
2. ✅ "Waiting for other captain" modal works correctly
3. ✅ Coin toss modal appears over hero interface
4. ✅ Race logic prevents both captains selecting same option
5. ✅ Hero draft interface matches Exfang screenshots exactly
6. ✅ Pick/ban logic follows standard MOBA progression
7. ✅ Timer system works with real-time synchronization
8. ✅ Draft completion shows final results
9. ✅ All WebSocket events work under various network conditions
10. ✅ Database remains consistent under all race conditions
11. ✅ Comprehensive multi-browser Playwright tests pass
12. ✅ System handles disconnections and reconnections gracefully

---

## **CRITICAL LESSONS LEARNED**

1. **Never assume surface-level functionality equals complete implementation**
2. **Always analyze reference systems (like Exfang) before building**
3. **Multiplayer features require fundamentally different testing approaches**  
4. **WebSocket coordination is not optional for real-time features**
5. **Database state verification is mandatory for every test**
6. **Race conditions must be tested, not assumed to work**
7. **Two-browser testing is the MINIMUM for multiplayer features**

This roadmap ensures we build a complete, tested, production-ready draft system instead of surface-level demos.