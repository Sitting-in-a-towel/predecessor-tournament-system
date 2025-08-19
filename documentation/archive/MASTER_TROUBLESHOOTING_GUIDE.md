# MASTER Troubleshooting Guide - Complete System Reference

**Version:** 2.0  
**Last Updated:** August 13, 2025  
**Status:** Consolidated from all troubleshooting documents  

## 🚨 CRITICAL: Schema Mismatch Prevention System

**⚠️ The #1 Cause of Recurring Issues: Database ↔ Ecto ↔ Application Schema Misalignment**

### The Three-Layer Synchronization Problem
The tournament system has **three layers** that must stay synchronized:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │  Ecto Schema    │    │  Application    │
│    Database     │◄──►│   Definitions   │◄──►│     Code        │
│                 │    │                 │    │                 │
│ jsonb columns   │    │ field types     │    │ data handling   │
│ store arrays[]  │    │ {:array,:string}│    │ Enum functions  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**When ONE layer changes, ALL must be updated or the system breaks.**

### Schema Mismatch Detection & Prevention

#### **CRITICAL: Phoenix Draft Schema Fields**
```elixir
# CORRECT Schema (lib/predecessor_draft/drafts/session.ex):
field :team1_picks, {:array, :string}, default: []    # ✅ Arrays for arrays
field :team2_picks, {:array, :string}, default: []    # ✅ Arrays for arrays  
field :team1_bans, {:array, :string}, default: []     # ✅ Arrays for arrays
field :team2_bans, {:array, :string}, default: []     # ✅ Arrays for arrays

# INCORRECT Schema (causes "cannot load `[]` as type :map"):
field :team1_picks, :map     # ❌ Map type for array data
field :team2_picks, :map     # ❌ Map type for array data
field :team1_bans, :map      # ❌ Map type for array data  
field :team2_bans, :map      # ❌ Map type for array data
```

#### **Schema Validation Automation**
Create automated checks to prevent mismatches:

1. **Database Schema Check** (`scripts/validate-schema.exs`):
```elixir
# Check what the database actually stores
query = """
  SELECT team1_picks, team2_picks, team1_bans, team2_bans 
  FROM draft_sessions 
  WHERE team1_picks IS NOT NULL 
  LIMIT 1
"""
# Verify data types: arrays [] vs objects {}
```

2. **Ecto Schema Validation** (compile-time check):
```elixir
defmodule SchemaValidator do
  def validate_draft_fields do
    schema = PredecessorDraft.Drafts.Session.__schema__(:type, :team1_picks)
    unless schema == {:array, :string} do
      raise "Schema mismatch: team1_picks should be {:array, :string}, got #{inspect(schema)}"
    end
  end
end
```

3. **Application Code Contract** (runtime validation):
```elixir
def validate_picks_data(picks) when is_list(picks), do: :ok
def validate_picks_data(_), do: {:error, "Picks must be an array, got: #{inspect(picks)}"}
```

## 🔧 EMERGENCY PROCEDURES

### Issue: "cannot load `[]` as type :map"

**Symptoms:**
- Draft creation fails with ArgumentError
- Error shows database returning `[]` but Ecto expecting map format
- System works until schema changes break synchronization

**IMMEDIATE FIX:**
```elixir
# In lib/predecessor_draft/drafts/session.ex - revert to arrays:
field :team1_picks, {:array, :string}, default: []
field :team2_picks, {:array, :string}, default: []  
field :team1_bans, {:array, :string}, default: []
field :team2_bans, {:array, :string}, default: []
```

**Root Cause Prevention:**
1. **Data Contract Documentation** - Document what each field stores
2. **Migration Validation** - Test schema changes against existing data  
3. **Type System Enforcement** - Add compile-time schema validation
4. **Automated Testing** - Include schema consistency in CI/CD

## 🚨 SYSTEMATIC ISSUE RESOLUTION FRAMEWORK

### STEP 1: Authentication Status Check (NEVER ASSUME)

**Critical Pattern Recognition:**
```
USER SAYS: "I'm logged in..." → BELIEVE THEM, debug the feature
USER SAYS: "I can see admin buttons..." → They have admin access  
USER SHOWS: Username in screenshot → They are authenticated
ONLY DEBUG AUTH IF: User reports login/permission issues specifically
```

**Quick Authentication Verification:**
```bash
# Check current auth status
curl http://localhost:3001/api/auth/me

# Use test authentication for debugging
curl -X POST http://localhost:3001/api/test-auth/login-test-admin
```

### STEP 2: Error Message Analysis (THE GOLDEN RULE)

**Follow Error Messages, Not Symptoms:**

| Error Message | Real Problem | Quick Fix |
|---------------|--------------|-----------|
| `operator does not exist: character varying = uuid` | PostgreSQL type casting | Add `::text` to both sides |
| `cannot load [] as type :map` | Ecto schema mismatch | Change field type to `{:array, :string}` |
| `constraint error: draft_sessions_current_phase_check` | Invalid phase name | Use exact constraint values |
| `clauses with the same name and arity must be grouped` | Function clause grouping | Move all same-name functions together |

### STEP 3: Three-Layer Debug Pattern

Debug systematically through each layer:

**Layer 1: Frontend Issues**
- JavaScript console errors (F12 → Console)
- Network request failures (F12 → Network)  
- UI not updating or behaving incorrectly
- Session/authentication state problems

**Layer 2: Backend/API Issues**  
- HTTP status codes (401/403 = auth, 404 = not found, 500 = server)
- Request/response data format mismatches
- Authentication middleware problems
- Route handling errors

**Layer 3: Database Issues**
- PostgreSQL type casting errors (`::text` casting)
- Schema/constraint violations  
- Foreign key relationship problems
- Query syntax or logic errors

## 🧪 TESTING METHODOLOGY

### Deep System Testing vs Surface Testing

**❌ Surface Testing (Inadequate):**
- Click buttons to see if they exist
- Check if pages load  
- Basic form submissions
- Simple visual verification

**✅ Deep System Testing (Required):**
- **Database State Verification** - Check data changes at each step
- **Multi-User Coordination** - Test simultaneous user actions  
- **Race Condition Testing** - Handle timing conflicts
- **Complete Flow Testing** - End-to-end multiplayer scenarios
- **Error Handling** - Test failure scenarios and recovery

### Playwright Testing with Authentication

```javascript
// ALWAYS use test authentication, never manual Discord OAuth
const loginResponse = await page.request.post(
  'http://localhost:3001/api/test-auth/login-test-admin'
);

if (loginResponse.ok()) {
  await page.reload({ waitUntil: 'networkidle' });
  // Now test the actual feature
}
```

### Multi-User Testing Template
```javascript
// Test with TWO browser contexts simultaneously
const context1 = await browser.newContext(); // Team 1 Captain
const context2 = await browser.newContext(); // Team 2 Captain
const page1 = await context1.newPage();
const page2 = await context2.newPage();

// Both login simultaneously
await Promise.all([
  loginAsCaptain(page1, 'team1_captain'),
  loginAsCaptain(page2, 'team2_captain')
]);
```

## 🗂️ DATABASE MANAGEMENT

### PostgreSQL Type Casting Reference

**Universal Safe Pattern:**
```sql
-- ✅ ALWAYS SAFE: Cast both sides to text
WHERE id::text = $1 OR tournament_id::text = $1

-- ❌ CAUSES ERRORS: Type mismatch
WHERE id = $1 OR tournament_id = $1
```

**Common Type Issues:**
- `UUID` vs `VARCHAR` comparisons → Cast both to `text`
- `INTEGER` vs `TEXT` comparisons → Cast to common type
- `JSONB` array vs object confusion → Verify actual stored data

### Database Health Monitoring

```bash
# Check draft system health
cd "H:\Project Folder\Predecessor website\backend"

# Verify active drafts by status
node -e "const pg = require('./services/postgresql'); pg.query('SELECT status, COUNT(*) as count FROM draft_sessions GROUP BY status').then(r => console.log('Draft status counts:', r.rows))"

# Check for orphaned data  
node -e "const pg = require('./services/postgresql'); pg.query('SELECT ds.draft_id FROM draft_sessions ds LEFT JOIN teams t1 ON ds.team1_captain_id = t1.captain_id WHERE t1.id IS NULL LIMIT 5').then(r => console.log('Orphaned drafts:', r.rows.length))"
```

## 🔍 DIAGNOSTIC COMMANDS

### System Health Check
```bash
# Check all services running
netstat -ano | findstr :3000  # Frontend (React)
netstat -ano | findstr :3001  # Backend (Node.js) 
netstat -ano | findstr :4000  # Phoenix Draft (Elixir)
netstat -ano | findstr :8080  # NocoDB (Database UI)
netstat -ano | findstr :5432  # PostgreSQL (Database)
```

### Database Schema Verification
```bash
# Get all table names
node -e "const pg = require('./services/postgresql'); pg.query(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\").then(r => console.log('Tables:', r.rows.map(row => row.table_name)))"

# Check specific table structure
node -e "const pg = require('./services/postgresql'); pg.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'draft_sessions'\").then(r => console.log('Draft columns:', r.rows))"
```

## 🚨 COMMON MISTAKE PREVENTION

### Claude's Anti-Mistake Patterns

1. **Authentication Assumption Mistake**
   - ❌ Wrong: Assume user needs auth help when they say "I'm logged in"
   - ✅ Right: Believe user auth status, debug the actual feature

2. **Complex Solution Jumping Mistake**  
   - ❌ Wrong: Create elaborate test frameworks before understanding problem
   - ✅ Right: Read error messages literally, try simple fixes first

3. **Test Blindness Mistake**
   - ❌ Wrong: Write tests that don't match user experience  
   - ✅ Right: Test exactly what user reports, in same environment

4. **Documentation Skipping Mistake**
   - ❌ Wrong: Jump into debugging without checking existing guides
   - ✅ Right: Check troubleshooting docs first for known solutions

## 📋 USER REPORTING FRAMEWORK

### What Users Should Provide

**Critical Information (ALWAYS NEEDED):**
- [ ] **Authentication Status** - "I'm logged in as [username]"
- [ ] **Exact Error Messages** - Word-for-word text of any errors  
- [ ] **Step-by-Step Actions** - What you clicked/did before the issue
- [ ] **Screenshots** - Browser console errors, network tab failures, page state

**Screenshots That Speed Up Resolution:**
- [ ] **Browser Console** - F12 → Console tab showing red errors
- [ ] **Network Tab** - F12 → Network tab showing failed requests  
- [ ] **Page State** - What you see when it's broken
- [ ] **Error Messages** - Any popup/toast notifications

### Effective Issue Report Template
```
I'm logged in as admin (username visible in top-right).
When I [specific action], I expect [expected result] but get [actual result].
Error message: "[exact text]"
Screenshots attached: [console errors + page state]
```

## 🔧 ENVIRONMENT MANAGEMENT

### Development Environment Setup
```bash
# Simplified launcher (recommended)
.\launchers\Start_Development_Simple.bat

# Manual service startup:
# 1. PostgreSQL Service (Windows Services)
# 2. Backend: cd backend && npm run dev
# 3. Frontend: cd frontend && npm start  
# 4. Phoenix: cd phoenix_draft && mix phx.server
```

### Service Port Reference
- **Frontend (React):** http://localhost:3000
- **Backend (Node.js):** http://localhost:3001  
- **Phoenix Draft:** http://localhost:4000
- **NocoDB:** http://localhost:8080
- **PostgreSQL:** localhost:5432

## 🚀 RESOLVED ISSUES REFERENCE

### Major Issue Resolutions

**1. Bracket Persistence Issue (August 8, 2025)**
- **Problem:** "operator does not exist: character varying = uuid"  
- **Solution:** PostgreSQL type casting - `WHERE id::text = $1 OR tournament_id::text = $1`
- **Prevention:** Always cast both sides to common type in queries

**2. Schema Mismatch Issue (August 13, 2025)**  
- **Problem:** "cannot load `[]` as type :map for field :team1_picks"
- **Solution:** Revert Ecto schema fields from `:map` to `{:array, :string}`
- **Prevention:** Three-layer schema synchronization validation

**3. Phoenix Draft System (August 2025)**
- **Achievement:** Complete Phoenix LiveView migration from React/Socket.io
- **Status:** Core implementation complete, 8 major issues resolved
- **Documentation:** PHOENIX_DRAFT_TROUBLESHOOTING.md

## 📚 DOCUMENTATION HIERARCHY

**This Master Guide** replaces and consolidates:
- `TROUBLESHOOTING_CHECKLIST.md` → Merged into STEP 1-2 above  
- `CLAUDE_ANTI_MISTAKE_PATTERNS.md` → Merged into Common Mistake Prevention
- `POSTGRESQL_TYPE_CASTING_GUIDE.md` → Merged into Database Management
- `TESTING_AUTHENTICATION_GUIDE.md` → Merged into Testing Methodology
- `CLAUDE_DEBUGGING_CHECKLIST.md` → Merged into Systematic Framework
- `USER_DEBUGGING_CHECKLIST.md` → Merged into User Reporting Framework
- `SYSTEMATIC_TROUBLESHOOTING_GUIDE.md` → Merged into overall structure

**Specialized Guides (Keep Separate):**
- `PHOENIX_DRAFT_TROUBLESHOOTING.md` - Phoenix-specific issues
- `COMPREHENSIVE_TESTING_GUIDE.md` - Detailed testing procedures  
- `DEPLOYMENT_GUIDE.md` - Production deployment specifics

## ⚡ QUICK REFERENCE

### Universal Fixes (Try First)
- [ ] Hard refresh browser (Ctrl+F5)
- [ ] Restart all services
- [ ] Check authentication status  
- [ ] Cast PostgreSQL types to text
- [ ] Verify Ecto schema matches database

### Emergency Recovery
```bash
# Stop everything
taskkill /f /im node.exe

# Check database integrity
node -e "const pg = require('./services/postgresql'); pg.query('SELECT NOW()').then(r => console.log('DB OK:', r.rows[0].now)).catch(e => console.error('DB ERROR:', e.message))"

# Restart services
.\launchers\Start_Development_Simple.bat
```

---

**This consolidated guide provides the complete troubleshooting framework for the tournament management system. Use this as the primary reference for all issues.**