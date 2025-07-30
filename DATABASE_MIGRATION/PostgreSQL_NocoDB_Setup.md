# PostgreSQL + NocoDB Setup Guide

## 📋 Prerequisites

### System Requirements
- Windows 10/11
- At least 4GB RAM available
- 2GB free disk space
- Administrator access

## 🐘 Step 1: Install PostgreSQL

### Option A: Using Installer (Recommended)
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer as Administrator
3. During installation:
   - **Port**: 5432 (default)
   - **Password**: Choose a strong password for 'postgres' user (SAVE THIS!)
   - **Locale**: Default
   - **Components**: PostgreSQL Server, pgAdmin 4, Command Line Tools

### Option B: Using Command Line
```powershell
# If you have Chocolatey installed
choco install postgresql

# Or using winget
winget install PostgreSQL.PostgreSQL
```

### Verify Installation
```bash
# Open Command Prompt as Administrator
psql --version
# Should show: psql (PostgreSQL) 15.x or higher
```

## 🗄️ Step 2: Create Tournament Database

### Using pgAdmin (GUI Method)
1. Open pgAdmin 4 from Start Menu
2. Connect to Local server (password from installation)
3. Right-click on "Databases" → Create → Database
4. Database name: `predecessor_tournaments`
5. Owner: postgres
6. Click "Save"

### Using Command Line
```bash
# Open Command Prompt as Administrator
psql -U postgres

# Enter password when prompted
CREATE DATABASE predecessor_tournaments;
\q
```

## 🔧 Step 3: Install NocoDB

### Download and Setup
1. Create directory: `H:\Project Folder\NocoDB`
2. Download NocoDB Windows executable from: https://github.com/nocodb/nocodb/releases
   - Look for `Noco-win-x64.exe`
3. Place in `H:\Project Folder\NocoDB` folder

### Configure NocoDB
Create `H:\Project Folder\NocoDB\config.json`:
```json
{
  "port": 8080,
  "db": {
    "client": "pg",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "user": "postgres",
      "password": "YOUR_POSTGRES_PASSWORD",
      "database": "predecessor_tournaments"
    }
  },
  "auth": {
    "jwt": {
      "secret": "your-secret-key-change-this"
    }
  }
}
```

### Create Batch Launcher
Create `H:\Project Folder\NocoDB\start_nocodb.bat`:
```batch
@echo off
echo Starting NocoDB...
cd /d "H:\Project Folder\NocoDB"
Noco-win-x64.exe
pause
```

## 🚀 Step 4: Start Services

### Start PostgreSQL (usually auto-starts)
```bash
# Check if running
pg_ctl status -D "H:\Project Folder\PostgreSQL\data"

# Or check if service is running
net start | findstr postgres

# Start if needed (service name may vary)
net start postgresql-x64-17
```

### Start NocoDB
1. Run `H:\Project Folder\NocoDB\start_nocodb.bat` as Administrator
2. Wait for "NocoDB started successfully"
3. Open browser to: http://localhost:8080
4. Create admin account on first run

## ✅ Step 5: Verify Setup

### Test PostgreSQL Connection
```bash
psql -U postgres -d predecessor_tournaments -c "SELECT version();"
```

### Test NocoDB
1. Login to NocoDB at http://localhost:8080
2. You should see empty database ready for tables
3. Test creating a sample table

## 🛠️ Troubleshooting

### PostgreSQL Won't Start
```bash
# Check Windows Services
services.msc
# Look for "postgresql-x64-17" and start manually

# Or check from H drive installation
pg_ctl status -D "H:\Project Folder\PostgreSQL\data"
```

### NocoDB Connection Error
- Verify PostgreSQL is running
- Check password in config.json
- Ensure firewall isn't blocking port 5432

### Port Conflicts
- PostgreSQL: Change in postgresql.conf
- NocoDB: Change in config.json

## 📝 Next Steps

1. Database schema creation
2. Data migration from Airtable
3. Update application connection strings
4. Test application with new database

## 🔐 Security Notes

- Change default passwords
- Limit PostgreSQL connections to localhost
- Backup `config.json` securely
- Consider Windows Firewall rules