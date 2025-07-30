# Post-Migration Steps

## 🔄 After Successful Migration

### 1. Update Application Configuration

#### Backend Changes (`backend/services/database.js`)
```javascript
// Replace Airtable service with PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'predecessor_tournaments',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

#### Environment Variables Update
```env
# Remove Airtable variables
# AIRTABLE_API_KEY=xxx
# AIRTABLE_BASE_ID=xxx

# Add PostgreSQL variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=predecessor_tournaments
DB_USER=postgres
DB_PASSWORD=your_password
```

### 2. NocoDB Integration

#### Access NocoDB Admin Panel
1. Start NocoDB: `C:\NocoDB\start_nocodb.bat`
2. Navigate to: http://localhost:8080
3. Login with admin credentials
4. You should see all migrated tables

#### Configure NocoDB Views
1. Create "Tournament Management" view
2. Set up "Team Roster" view with relationships
3. Configure "Match Schedule" calendar view
4. Add filters for active tournaments

#### API Token for Application
1. Go to Settings → API Tokens
2. Create new token: "predecessor_app"
3. Copy token for application use

### 3. Update Service Layer

Create new `backend/services/db.js`:
```javascript
const pool = require('./database');

class DatabaseService {
  // Users
  async getUserByID(userID) {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const result = await pool.query(query, [userID]);
    return result.rows[0];
  }

  async createUser(userData) {
    const query = `
      INSERT INTO users (user_id, discord_id, discord_username, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      userData.userID,
      userData.discordID,
      userData.discordUsername,
      userData.email
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Tournaments
  async getTournaments(filters = {}) {
    let query = 'SELECT * FROM tournaments WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    query += ' ORDER BY start_date DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Add more methods as needed...
}

module.exports = new DatabaseService();
```

### 4. Testing After Migration

#### Quick Verification Tests
```bash
# Test PostgreSQL connection
psql -U postgres -d predecessor_tournaments -c "SELECT COUNT(*) FROM users;"

# Test NocoDB API
curl http://localhost:8080/api/v1/db/data/noco/predecessor_tournaments/users \
  -H "xc-auth: YOUR_NOCODB_TOKEN"
```

#### Application Testing
1. Start application with new database
2. Test user login (existing users should work)
3. Verify tournament listing
4. Check team rosters
5. Test creating new tournament

### 5. Performance Optimization

#### Create Additional Indexes
```sql
-- Performance indexes for common queries
CREATE INDEX idx_teams_captain_tournament ON teams(captain_id, tournament_id);
CREATE INDEX idx_matches_date_status ON matches(scheduled_time, status);
CREATE INDEX idx_users_discord_active ON users(discord_username, last_active);
```

#### Connection Pooling
```javascript
// Optimize pool settings in database.js
const pool = new Pool({
  // ... existing config
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Add for better performance
  statement_timeout: 10000,
  query_timeout: 10000,
});
```

### 6. Backup Strategy

#### Automated Backup Script (`backup_database.bat`)
```batch
@echo off
set BACKUP_DIR=C:\PostgreSQL_Backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

pg_dump -U postgres -d predecessor_tournaments -f "%BACKUP_DIR%\backup_%TIMESTAMP%.sql"
echo Backup completed: backup_%TIMESTAMP%.sql
```

#### Schedule Daily Backups
1. Open Task Scheduler
2. Create Basic Task
3. Daily at 2:00 AM
4. Run `backup_database.bat`

### 7. Monitoring & Maintenance

#### Database Health Check
```sql
-- Check database size
SELECT pg_database_size('predecessor_tournaments') / 1024 / 1024 as size_mb;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity;
```

### 8. Rollback Plan

If issues arise, you can:
1. Keep Airtable as backup for 30 days
2. Use migration logs to identify issues
3. Restore from PostgreSQL backup
4. Switch back to Airtable temporarily

### 9. Future Enhancements

With PostgreSQL, you can now:
- Add full-text search for players
- Implement real-time leaderboards
- Create detailed analytics views
- Add tournament brackets with CTEs
- Implement proper caching layers

## 🎯 Next Development Tasks

1. **Update all service methods** to use PostgreSQL
2. **Test all endpoints** with new database
3. **Add database migrations** for schema changes
4. **Implement connection retry** logic
5. **Add query performance logging**

## 📞 Common Issues

### "relation does not exist"
- Check table was created
- Verify correct database name
- Check user permissions

### "connection refused"
- PostgreSQL service running?
- Firewall blocking port 5432?
- Correct host/port in config?

### "permission denied"
- Grant permissions to app user
- Check table ownership
- Verify role privileges