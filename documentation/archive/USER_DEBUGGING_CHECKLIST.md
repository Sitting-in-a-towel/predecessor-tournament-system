# User Debugging Checklist - Get Issues Resolved Faster

**When reporting issues, providing this information gets problems solved much quicker**

## 🚨 CRITICAL FIRST STEPS

### 1. Authentication Status (ALWAYS INCLUDE)
- [ ] **Are you currently logged in?** Look at top-right corner for your username
- [ ] **Do you have admin access?** Can you see admin-only buttons/features?
- [ ] **When did you last log in?** Sessions can expire after time
- [ ] **What user type are you?** Admin, team captain, or regular user?

### 2. What Exactly Happened (Be Specific)
- [ ] **What did you click/do?** Step-by-step actions you took
- [ ] **What did you expect to happen?** What should have worked?
- [ ] **What actually happened instead?** Exact result you got
- [ ] **Any error messages?** Word-for-word text of any error messages

### 3. Screenshots (EXTREMELY HELPFUL)
- [ ] **Screenshot of the error** - What you see when it's broken
- [ ] **Browser console errors** - Press F12 → Console tab, screenshot any red errors
- [ ] **Network tab errors** - Press F12 → Network tab, screenshot any red/failed requests
- [ ] **Current page state** - What the page looks like when broken

---

## 🔧 BASIC TROUBLESHOOTING (Try These First)

### Quick Fixes to Try:
- [ ] **Hard refresh** - Ctrl+F5 to clear browser cache
- [ ] **Different browser** - Try Chrome/Firefox/Edge to isolate browser issues
- [ ] **Incognito mode** - Test without extensions or cached data
- [ ] **Logout and login again** - Refresh your authentication status
- [ ] **Clear cookies** - Remove stale session data

### Environment Information:
- [ ] **Which browser?** Chrome, Firefox, Edge, etc. and version number
- [ ] **Operating system?** Windows 10/11, Mac, etc.
- [ ] **Time it happened?** Recent timestamp helps match with server logs
- [ ] **Does it happen consistently?** Every time or just sometimes?

---

## 📊 INFORMATION THAT SPEEDS UP DEBUGGING

### For Authentication Issues:
- [ ] **Can you see your username** in the top-right corner?
- [ ] **Can you see admin features** if you're an admin?
- [ ] **Did you get logged out** unexpectedly?
- [ ] **Are you using the right account** with proper permissions?

### For Tournament/Bracket Issues:
- [ ] **Which tournament?** Name of the specific tournament
- [ ] **What action failed?** Creating, editing, publishing, viewing?
- [ ] **What data was lost?** Bracket, teams, matches, etc.
- [ ] **Does it affect all tournaments** or just specific ones?

### For Team/Draft Issues:
- [ ] **Which teams involved?** Specific team names
- [ ] **Are you the team captain?** Or different role?
- [ ] **What stage of draft?** Coin toss, pick/ban phase, completed?
- [ ] **Do other team members** see the same issue?

### For General UI Issues:
- [ ] **Which page/tab?** Specific location where problem occurs
- [ ] **What should be displayed?** Expected content vs what you see
- [ ] **Any missing buttons/features?** Things that should be there but aren't
- [ ] **Any layout problems?** Broken styling, overlapping elements, etc.

---

## 🚨 RED FLAGS - CRITICAL ISSUES

### Report These IMMEDIATELY:
- [ ] **Site completely down** - Can't access at all
- [ ] **Can't login** - Authentication completely broken
- [ ] **Data disappeared** - Tournaments, teams, brackets lost
- [ ] **Security concerns** - Seeing other users' data, unauthorized access

### Include for Critical Issues:
- [ ] **When it started** - Exact time you first noticed
- [ ] **What you were doing** - Last actions before problem
- [ ] **How widespread** - Just you or other users too?
- [ ] **Workarounds tried** - What have you already attempted?

---

## 📱 HOW TO TAKE HELPFUL SCREENSHOTS

### Browser Console Errors:
1. Press `F12` to open browser dev tools
2. Click `Console` tab
3. Look for red error messages
4. Screenshot the entire console area

### Network Errors:  
1. Press `F12` to open browser dev tools
2. Click `Network` tab
3. Try the action that's failing
4. Look for red/failed requests in the list
5. Screenshot the network tab

### Page State:
- Take full-page screenshot showing the broken state
- Include URL in address bar
- Show your username if logged in
- Capture any error popups or messages

---

## 💬 EFFECTIVE COMMUNICATION PATTERNS

### ✅ GOOD Issue Reports:
```
"I'm logged in as admin (username: sitting_in_a_towel visible in top right). 
When I publish a bracket in 'test admin panel' tournament, I get two error messages:
1. 'Failed to save bracket data. Please try again.'  
2. 'Failed to publish bracket - please try again'
The bracket appears published but disappears after refreshing the page.
Screenshot attached showing both error messages."
```

### ❌ BAD Issue Reports:
```
"Brackets don't work. It's broken."
"Same error as before."
"Still not working after your fix."
```

### Communication Tips:
- **Be specific** - Exact text, exact actions, exact results
- **Include context** - Authentication status, user role, tournament name
- **Show don't tell** - Screenshots are worth thousands of words
- **Test before reporting** - Try basic troubleshooting first

---

## 🎯 FOLLOW-UP INFORMATION

### If Asked for More Details:
- [ ] **Backend logs** - I might ask you to help gather server logs
- [ ] **Try specific tests** - I might ask you to test specific scenarios
- [ ] **Verify fixes** - I'll ask you to confirm when issues are resolved
- [ ] **Additional screenshots** - More specific views of the problem

### Working Together Efficiently:
- **Respond with requested info** - Don't skip requested screenshots or details
- **Test immediately** when I provide fixes
- **Confirm when working** - Let me know when issues are resolved
- **Report side effects** - If my fix breaks something else

---

## 🏆 SUCCESS PATTERN

**The bracket persistence issue was resolved quickly because:**
1. User clearly stated authentication status ("I'm logged in")
2. User provided specific error messages (exact text of both errors)  
3. User provided screenshot showing both error messages simultaneously
4. User tested immediately after fix was applied
5. User confirmed when issue was resolved

**This pattern gets issues fixed fast and prevents back-and-forth confusion.**

---

**Remember: The more specific and complete your initial report, the faster we can identify and fix the root cause!**