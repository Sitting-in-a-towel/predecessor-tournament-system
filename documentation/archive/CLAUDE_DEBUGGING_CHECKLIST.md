# Claude's Ultra-Deep Debugging Checklist
**MANDATORY for EVERY debugging session - This prevents ALL major mistakes I make**

## 🧠 META-ANALYSIS: WHY I FAIL AT DEBUGGING

### My Most Common Fatal Mistakes:
1. **ASSUMPTION DISEASE** - I assume user auth status instead of ASKING/CHECKING
2. **SOLUTION JUMPING** - I create complex solutions before understanding the problem
3. **TEST BLINDNESS** - I write tests that don't match real user experience  
4. **DOCUMENTATION SKIPPING** - I don't check existing docs/guides first
5. **ERROR MESSAGE IGNORING** - I focus on symptoms, not the actual error text
6. **CONTEXT FORGETTING** - I forget what we've already tried or established

### The "Admin User Confusion" - What Happened:
- User clearly stated they were logged in as admin
- I ignored this and created complex Discord OAuth testing
- I wasted time on authentication when the real issue was PostgreSQL type casting
- **LESSON**: When user says they're authenticated, BELIEVE THEM and debug the actual issue

---

## 🔍 BEFORE I START ANY DEBUGGING

### 1. STOP - Read Everything First (Critical Step)
- [ ] **Read user's COMPLETE message** - every single word, don't skim
- [ ] **Look for key phrases** like "I'm logged in", "I can see admin buttons", etc.
- [ ] **Check if they mentioned trying solutions** - don't repeat their attempts
- [ ] **Note what they say works vs doesn't work** - huge debugging clues
- [ ] **Check for emotional context** - "still broken", "same error" = I missed something

### 2. Check My Own Recent Work
- [ ] **What did I just change?** - could my recent edits cause this?
- [ ] **Did I restart services** after code changes?
- [ ] **Are there compilation errors** from my changes?
- [ ] **Did I test my fixes** or just assume they work?

### 3. Authentication Reality Check (STOP MAKING ASSUMPTIONS)
- [ ] **IF USER SAYS "I'm logged in"** → BELIEVE THEM, debug the actual feature
- [ ] **IF USER SHOWS screenshots with username** → They are authenticated, move on
- [ ] **IF USER SAYS "I can see admin buttons"** → They have admin access, trust this
- [ ] **ONLY debug auth if** user says "I can't log in" or shows login screens
- [ ] **Remember: Real users > my test scenarios** - trust their experience

### 4. Environment & System State  
- [ ] **Check recent logs FIRST** - `tail -50 backend/logs/combined.log`
- [ ] **Look for obvious errors** - PostgreSQL errors, 500 status codes
- [ ] **Check if services restarted** after my code changes
- [ ] **Verify basic functionality** - can I hit the API endpoints?

---

## 🐛 DURING DEBUGGING - SYSTEMATIC APPROACH

### 5. THE GOLDEN RULE: Follow the Error Messages
- [ ] **Read error messages WORD FOR WORD** - don't paraphrase or interpret
- [ ] **Copy exact error text** - especially PostgreSQL errors with error codes
- [ ] **Check HTTP status codes** - 401/403 = auth, 404 = not found, 500 = server error
- [ ] **Look at the ERROR LOCATION** - which file/line is failing?

### 6. The Three-Layer Debug Pattern
- [ ] **Layer 1: Frontend** - JavaScript errors, UI not updating, requests failing?
- [ ] **Layer 2: Backend** - API returning errors, authentication failing?
- [ ] **Layer 3: Database** - Query errors, constraint violations, type mismatches?
- [ ] **Follow the path** - trace a request from frontend → backend → database

### 5. Database Issues Checklist
- [ ] **Check PostgreSQL type casting** - UUID vs string comparisons
- [ ] **Verify table/column names** - typos in queries?
- [ ] **Check foreign key relationships** - do IDs match up?
- [ ] **Test queries manually** with simple test script

### 6. Authentication Issues Checklist  
- [ ] **User says they're logged in** - believe them, check WHY it's not working
- [ ] **Check session middleware** - is req.user populated?
- [ ] **Check admin status** - some features require admin privileges
- [ ] **Test with test auth** if needed for debugging

---

## 🧪 TESTING APPROACH

### 7. Choose Right Testing Method
- [ ] **Manual testing** - if user is available and can test
- [ ] **Test authentication** - use `/api/test-auth/login-test-admin` for Playwright
- [ ] **Direct API testing** - use curl or test scripts for backend
- [ ] **Database queries** - test queries directly when needed

### 8. Playwright Testing Checklist
- [ ] **Use test authentication** - don't assume user will manually log in
- [ ] **Monitor console errors** - set up error listeners
- [ ] **Monitor network requests** - catch HTTP errors
- [ ] **Take screenshots** - especially on errors
- [ ] **Test persistence** - refresh pages to verify data persists

---

## ⚠️ COMMON MISTAKES I MAKE

### 9. Authentication Assumptions
- [ ] **NEVER assume user auth status** - always verify from their description
- [ ] **Don't create complex OAuth flows** - use test auth for testing
- [ ] **Check logs for "Auth: true, User: none"** - session vs user object issues
- [ ] **Remember admin vs regular user** - different permissions

### 10. Database Query Mistakes
- [ ] **Always cast types in PostgreSQL** - `id::text = $1 OR tournament_id::text = $1`
- [ ] **Test queries before using** - don't assume syntax is correct
- [ ] **Check for SQL injection risks** - use parameterized queries
- [ ] **Verify column names exist** - check actual database schema

### 11. Error Handling Mistakes
- [ ] **Don't create double error handling** - one layer only
- [ ] **Check if multiple functions show errors** - causes user confusion
- [ ] **Read error messages completely** - don't skip details
- [ ] **Look for root cause** - not just symptoms

---

## 🔧 SYSTEMATIC PROBLEM SOLVING

### 12. Follow the Chain
- [ ] **Frontend → Backend → Database** - trace the full request path
- [ ] **Check each layer** - where exactly does it fail?
- [ ] **Look at network requests** - what's actually being sent?
- [ ] **Check response codes** - what's actually being returned?

### 13. When Creating Fixes
- [ ] **Fix root cause** - not just symptoms
- [ ] **Test the fix immediately** - don't assume it works
- [ ] **Check for side effects** - did I break something else?
- [ ] **Update all similar code** - apply fixes consistently

---

## 📝 DOCUMENTATION REQUIREMENTS

### 14. After Resolving Issues
- [ ] **Document the exact problem** - what was actually broken?
- [ ] **Document the exact solution** - what specific changes fixed it?
- [ ] **Create prevention guide** - how to avoid this in future?
- [ ] **Update relevant checklists** - add new items based on lessons learned

### 15. Code Changes Documentation
- [ ] **List all files changed** - complete file list
- [ ] **Show before/after code** - exact changes made
- [ ] **Explain why each change** - technical reasoning
- [ ] **Provide test verification** - how to confirm it works

---

## 🚨 RED FLAGS - STOP AND REASSESS

### When I Should Pause
- [ ] **Making assumptions about user state** - stop, ask questions
- [ ] **Creating complex solutions** - probably missing something simple
- [ ] **Getting same error repeatedly** - step back, check basics
- [ ] **User says "it's the same error"** - I didn't find the real root cause

### When I'm Wrong
- [ ] **User corrects my assumptions** - listen and adjust immediately
- [ ] **My fix doesn't work** - admit it, try different approach
- [ ] **I'm overcomplicating** - simplify and focus on basics
- [ ] **Tests don't match user experience** - trust the user, fix the tests

---

## ✅ SUCCESS CRITERIA

### Issue is Resolved When:
- [ ] **User confirms it works** - they test it manually
- [ ] **Root cause identified** - I understand WHY it failed
- [ ] **Fix applied systematically** - all similar code updated
- [ ] **Tests verify functionality** - automated verification works
- [ ] **Documentation complete** - future prevention ensured

### My Job is Complete When:
- [ ] **User is satisfied** - problem actually solved
- [ ] **Issue won't recur** - proper prevention in place
- [ ] **Documentation updated** - others can avoid/fix this issue
- [ ] **Learning captured** - I won't make the same mistakes

---

**This checklist must be followed for EVERY debugging session. No shortcuts, no assumptions.**