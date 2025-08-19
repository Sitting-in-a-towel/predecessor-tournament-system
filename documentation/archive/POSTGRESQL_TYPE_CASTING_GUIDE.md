# PostgreSQL Type Casting Guide - Preventing Database Query Errors

**Critical Reference for All Database Operations**

## 🚨 The Problem

PostgreSQL is **extremely strict** about type matching in WHERE clauses. Unlike some databases, PostgreSQL will NOT automatically cast types, leading to errors like:

```
operator does not exist: character varying = uuid
operator does not exist: text = uuid
operator does not exist: uuid = text
```

## 🎯 The Universal Solution

**ALWAYS cast both sides to the same type when comparing different column types.**

### Safe Pattern for UUID/String Comparisons
```sql
-- ✅ CORRECT: Cast both sides to text
WHERE id::text = $1 OR tournament_id::text = $1

-- ❌ WRONG: Type mismatch
WHERE id = $1 OR tournament_id = $1

-- ❌ WRONG: Mixed casting
WHERE id = $1::uuid OR tournament_id::text = $1
```

## 📊 Common Column Type Combinations

### Tournament Table Pattern
```sql
-- Table structure:
tournaments:
├── id (UUID PRIMARY KEY)          -- Internal database ID
└── tournament_id (UUID)           -- Public identifier

-- Frontend sends: tournament_id (string representation of UUID)
-- Backend needs to query: both id and tournament_id columns
```

**Solution:**
```sql
SELECT * FROM tournaments 
WHERE id::text = $1 OR tournament_id::text = $1
```

### User Table Pattern
```sql
-- Table structure:
users:
├── id (UUID PRIMARY KEY)          -- Internal database ID
├── user_id (VARCHAR)              -- Legacy string identifier
└── discord_id (VARCHAR)           -- Discord's string ID

-- Query pattern:
SELECT * FROM users 
WHERE id::text = $1 OR user_id = $1 OR discord_id = $1
```

### Team Table Pattern
```sql
-- Table structure:
teams:
├── id (UUID PRIMARY KEY)          -- Internal database ID
├── team_id (VARCHAR)              -- Legacy string identifier
└── captain_id (UUID)              -- Foreign key to users.id

-- Query pattern:
SELECT * FROM teams 
WHERE id::text = $1 OR team_id = $1
```

## 🔧 Type Casting Reference

### Text Conversions
```sql
uuid_column::text        -- UUID to text
varchar_column::text     -- VARCHAR to text (safe)
int_column::text         -- Integer to text
```

### UUID Conversions
```sql
text_column::uuid        -- Text to UUID (must be valid UUID format)
$1::uuid                 -- Parameter to UUID
```

### Safe Comparison Patterns
```sql
-- Pattern 1: Cast columns to text
WHERE uuid_col::text = $1 OR varchar_col = $1

-- Pattern 2: Cast parameter (only if input is guaranteed valid UUID)
WHERE uuid_col = $1::uuid OR varchar_col = $1

-- Pattern 3: Mixed types - cast all to text (SAFEST)
WHERE col1::text = $1 OR col2::text = $1 OR col3::text = $1
```

## 🚨 Error Prevention Checklist

### Before Writing Any Query
- [ ] **Identify column types** - Check database schema
- [ ] **Plan type casting** - Decide on common type (usually text)
- [ ] **Cast consistently** - Don't mix casting approaches
- [ ] **Test manually** - Run query in test script before deploying

### When You See Type Errors
1. **Identify the conflicting types** from error message
2. **Cast to common type** (text is safest)
3. **Update ALL similar queries** in the file
4. **Test with representative data**

## 🧪 Testing Pattern

### Create Test Scripts
```javascript
// test-query.js
const postgres = require('./services/postgresql');

async function testQuery() {
  try {
    const testId = 'your-test-id-here';
    const query = `SELECT * FROM table WHERE col1::text = $1 OR col2::text = $1`;
    const result = await postgres.query(query, [testId]);
    console.log('✅ Query successful, results:', result.rows.length);
  } catch (error) {
    console.log('❌ Query failed:', error.message, 'Code:', error.code);
  }
}
testQuery();
```

## 📁 Files to Check for Type Casting Issues

### Primary Locations
```
backend/routes/brackets.js    - Tournament queries
backend/routes/teams.js       - Team queries  
backend/routes/users.js       - User queries
backend/routes/draft.js       - Draft queries
backend/routes/tournaments.js - Tournament queries
```

### Query Patterns to Update
```javascript
// Look for these patterns and add ::text casting:
postgresService.query('WHERE id = $1 OR other_id = $1')
postgresService.query('WHERE uuid_col = $1')
postgresService.query('JOIN table ON col1 = col2') // Different types
```

## 🎯 The "Cast Everything to Text" Strategy

**When in doubt, cast everything to text.** This is the safest approach:

```sql
-- Safe pattern for any mixed-type query:
SELECT * FROM table 
WHERE col1::text = $1 
   OR col2::text = $1 
   OR col3::text = $1
```

**Why text is safe:**
- All PostgreSQL types can convert to text
- Text comparison is consistent and predictable
- No risk of invalid UUID format errors
- Works with both UUIDs and legacy string IDs

## 🚨 Emergency Fix Pattern

If you encounter a type casting error in production:

1. **Identify the failing query** from error logs
2. **Add ::text to all columns being compared**:
   ```sql
   -- Before: WHERE id = $1 OR tournament_id = $1
   -- After:  WHERE id::text = $1 OR tournament_id::text = $1
   ```
3. **Test immediately** with a test script
4. **Deploy fix** - this is a safe, non-breaking change
5. **Update ALL similar patterns** in the same file

---

**Remember: PostgreSQL type strictness is a feature, not a bug. It prevents data corruption and ensures query predictability. Always cast explicitly rather than hoping for automatic conversion.**