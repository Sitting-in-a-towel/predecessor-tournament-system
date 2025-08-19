# Claude's Anti-Mistake Patterns
**These are the exact mistakes I keep making and how to prevent them**

## 🚨 THE "AUTHENTICATION ASSUMPTION" MISTAKE

### What I Do Wrong:
- User says: "I'm logged in and published the bracket but it's not staying"
- My brain hears: "Authentication problem needs complex Discord OAuth testing"
- I ignore: The user CLEARLY stated they're already logged in as admin
- Result: I waste time on auth instead of debugging the real issue (PostgreSQL type casting)

### The Correct Pattern:
```
USER SAYS: "I'm logged in..." or "I can see admin buttons..."
MY RESPONSE: ✅ Great, you're authenticated. Let's debug why [feature] isn't working
NOT: ❌ Let me create complex authentication testing
```

### Authentication Decision Tree:
```
Does user mention login issues? → Debug authentication
Does user show login screen? → Debug authentication
Does user say "I'm logged in"? → DON'T debug authentication, debug the feature
Does user show username in screenshot? → DON'T debug authentication, debug the feature
```

---

## 🔧 THE "COMPLEX SOLUTION JUMPING" MISTAKE

### What I Do Wrong:
- See error message
- Immediately create complex testing frameworks
- Build elaborate Playwright tests before understanding the problem
- Miss simple fixes like PostgreSQL type casting

### The Correct Pattern:
```
1. Read error message LITERALLY
2. Check logs for the EXACT error
3. Try simple fixes FIRST
4. Complex testing only AFTER simple fixes fail
```

### Problem-Solving Hierarchy:
1. **Simple fixes** - Type casting, syntax errors, restart services
2. **Medium fixes** - Code logic, API endpoints, database queries  
3. **Complex fixes** - Authentication systems, testing frameworks, major refactoring

---

## 📊 THE "TEST BLINDNESS" MISTAKE  

### What I Do Wrong:
- Create Playwright tests that can't authenticate
- Write tests that don't match user experience
- Assume tests work without verifying against user reports

### The Correct Pattern:
```
User Experience: Logged in admin can't publish bracket
My Test Must: Login as admin → Try to publish bracket → Verify it works
NOT: Create unauthenticated test that fails at login screen
```

### Test Reality Check:
- [ ] **Does my test reproduce the user's exact scenario?**
- [ ] **Am I testing as the same user type** (admin vs regular)?
- [ ] **Does my test fail the same way** the user experiences?
- [ ] **Can I confirm the fix works** for the user's specific case?

---

## 📖 THE "DOCUMENTATION SKIPPING" MISTAKE

### What I Do Wrong:
- Jump into debugging without checking existing guides
- Recreate solutions that already exist
- Miss documented patterns and best practices

### The Correct Pattern:
```
Before debugging:
1. Check TROUBLESHOOTING_CHECKLIST.md
2. Check POSTGRESQL_TYPE_CASTING_GUIDE.md  
3. Check CLAUDE.md for project-specific notes
4. Look for similar resolved issues in documentation
```

### Documentation First Checklist:
- [ ] **Is this a known issue?** Check resolved issues list
- [ ] **Is there a guide for this?** Check type casting, auth, etc.
- [ ] **Have I solved this before?** Check my own documentation
- [ ] **Are there patterns to follow?** Check established best practices

---

## 💬 THE "ERROR MESSAGE IGNORING" MISTAKE

### What I Do Wrong:
- Focus on symptoms ("bracket not persisting") 
- Ignore actual error messages ("operator does not exist: character varying = uuid")
- Create solutions for wrong problems

### The Correct Pattern:
```
SYMPTOM: Bracket not persisting
ERROR MESSAGE: "operator does not exist: character varying = uuid"
REAL PROBLEM: PostgreSQL type casting
SOLUTION: Fix query casting, NOT authentication or UI
```

### Error Message Priority:
1. **PostgreSQL errors** - Usually type casting or constraint issues
2. **HTTP status codes** - Authentication, authorization, or API issues
3. **JavaScript errors** - Frontend compilation or runtime issues
4. **User symptoms** - What they see, but not necessarily the root cause

---

## 🧠 THE "CONTEXT FORGETTING" MISTAKE

### What I Do Wrong:
- Forget what we've already established
- Re-ask questions the user already answered
- Repeat debugging approaches that already failed

### The Correct Pattern:
```
Before each response:
1. Review the conversation - what have we tried?
2. Check what the user has confirmed - are they logged in? Admin access?
3. Build on previous findings - don't start from scratch
4. Focus on remaining unknowns - not already answered questions
```

### Context Tracking Checklist:
- [ ] **What has the user confirmed?** (Authentication, admin access, etc.)
- [ ] **What have we already tried?** Don't repeat failed approaches
- [ ] **What worked partially?** Build on partial successes
- [ ] **What's the current state?** Where are we in the debugging process?

---

## 🎯 THE "SOLUTION VALIDATION" MISTAKE

### What I Do Wrong:
- Apply fixes without testing them
- Assume code changes work without verification
- Tell user "it should work now" without confirming

### The Correct Pattern:
```
1. Apply fix
2. Test fix immediately with simple test script
3. Confirm fix addresses the exact error message
4. Ask user to verify fix works in their environment
```

### Fix Verification Checklist:
- [ ] **Did I test my code change?** Run it locally first
- [ ] **Does it fix the exact error?** Not just similar issues
- [ ] **Can the user verify it works?** They should test it
- [ ] **Did I break anything else?** Check for side effects

---

## 🚀 THE SUCCESS PATTERN: How to Debug Correctly

### When User Reports Issue:
1. **LISTEN** - Read their exact words, believe their authentication status
2. **LOGS** - Check error messages for root cause  
3. **SIMPLE** - Try simple fixes first (type casting, syntax, restarts)
4. **TEST** - Verify fix works with simple test script
5. **CONFIRM** - User tests the fix in their environment
6. **DOCUMENT** - Record the issue and solution for future

### The Bracket Persistence Success Story:
- User: "I'm logged in, bracket publishes but disappears"
- Me: ✅ Check logs → Find PostgreSQL type casting error
- Me: ✅ Apply simple fix → Cast both sides to text  
- Me: ✅ Test fix → Verify query works
- User: ✅ Confirms fix works
- Me: ✅ Document issue and prevention

**This is the pattern that actually solves problems efficiently.**