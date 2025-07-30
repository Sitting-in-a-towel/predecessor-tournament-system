# Known Issues & Troubleshooting Log

## 🚨 Current Unresolved Issues

### Issue #1: pgAdmin 4 Startup Error
**Status**: Unresolved  
**Priority**: Medium  
**First Reported**: 2025-07-29  

**Problem**: 
When running `Start_Development_Environment.bat`, pgAdmin fails to launch with error:
```
'pdAdmin 4' make sure you've typed the name correctly, then try again
```

**Troubleshooting Steps Attempted**:
1. ✅ Verified PostgreSQL installation and service running
2. ✅ Confirmed pgAdmin 4 installed via PostgreSQL installer
3. ✅ PostgreSQL database accessible via command line (`psql`)
4. ❌ Auto-launch via `start "" "pgAdmin 4"` command fails

**Workarounds**:
- Manual launch: Open pgAdmin 4 from Windows Start Menu
- Alternative: Use command line `psql` for database management

**Next Steps to Try**:
- Check exact pgAdmin executable path in Program Files
- Try launching with full executable path instead of name
- Verify Windows PATH includes pgAdmin directory

---

### Issue #2: Duplicate Browser Window (localhost:3000)
**Status**: Unresolved  
**Priority**: Low  
**First Reported**: 2025-07-29  

**Problem**: 
Development launcher opens localhost:3000 twice - once early and once at the end.

**Troubleshooting Steps Attempted**:
1. ✅ Added `set BROWSER=none` to frontend startup script
2. ✅ Reordered browser opening sequence  
3. ❌ Still opens duplicate windows

**Root Cause Analysis**:
- React development server has built-in auto-open behavior
- Environment variable `BROWSER=none` not fully preventing auto-open
- Launcher script also opens browsers manually

**Impact**: Minor UX annoyance, no functional impact

**Workarounds**:
- User can close one of the duplicate tabs
- Does not affect functionality

**Next Steps to Try**:
- Investigate React's `BROWSER` environment variable timing
- Consider removing manual browser opening for localhost:3000
- Test with `BROWSER=false` instead of `BROWSER=none`

---

## 📋 Issue Tracking Template

### Issue #X: [Title]
**Status**: [Open/In Progress/Resolved]  
**Priority**: [High/Medium/Low]  
**First Reported**: [Date]  

**Problem**: 
[Description]

**Troubleshooting Steps Attempted**:
- [Step 1]
- [Step 2]

**Impact**: [Description]

**Workarounds**: [If any]

**Resolution**: [When resolved]