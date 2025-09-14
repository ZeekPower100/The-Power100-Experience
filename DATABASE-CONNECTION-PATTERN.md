# 🔴 CLAUDE: YOU MUST READ THIS BEFORE ANY DATABASE OPERATION! 🔴
# Local Database Connection Pattern - ALWAYS USE THIS

## 🚨 ATTENTION CLAUDE: This file exists because you keep forgetting!
**You created this documentation. USE IT!**
- **NEVER** attempt database operations without checking this file
- **ALWAYS** use the batch file pattern below
- **STOP** trying to reinvent the connection method

## ⚡ QUICK REFERENCE - PostgreSQL Local Connection

### Connection Details
- **Host**: localhost  
- **Port**: 5432
- **Database**: tpedb
- **Username**: postgres
- **Password**: TPXP0stgres!!
- **PostgreSQL Version**: 16
- **Installation Path**: `C:\Program Files\PostgreSQL\16\bin\`

## 🔧 CONNECTION METHOD - ALWAYS USE BATCH FILES

### Standard Pattern for ANY Database Operation:

```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "YOUR SQL COMMAND HERE"
```

### Step-by-Step Process:

1. **Create a .bat file** in project root:
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SQL COMMAND"
```

2. **Execute the .bat file (MUST USE POWERSHELL)**:
```bash
# ONLY METHOD THAT WORKS - USE POWERSHELL:
powershell -Command "& './your_file.bat'"

# DO NOT USE THESE (THEY DON'T WORK):
# ❌ ./your_file.bat - fails with "command not found"
# ❌ cmd /c your_file.bat - returns no output
# ❌ your_file.bat - command not found
```

## 📝 COMMON OPERATIONS

### Check if Column Exists
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name' AND column_name = 'column_name';"
```

### Add Column to Table
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name DATA_TYPE;"
```

### View Table Structure
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d table_name"
```

### Run SQL File
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -f "path\to\file.sql"
```

## 🚫 NEVER DO THIS
- ❌ Don't use `psql` without the full path
- ❌ Don't try to connect without setting PGPASSWORD
- ❌ Don't use forward slashes in Windows paths
- ❌ Don't forget the `.exe` extension on Windows
- ❌ Don't use Linux/Mac commands on Windows

## ✅ ALWAYS DO THIS
- ✅ Use batch files (.bat) for all database operations
- ✅ Set PGPASSWORD environment variable first
- ✅ Use full path to psql.exe: `"C:\Program Files\PostgreSQL\16\bin\psql.exe"`
- ✅ Quote the path because it contains spaces
- ✅ Use `-U postgres -d tpedb` for connection parameters

## 📋 EXISTING BATCH FILES IN PROJECT
- `check_admin.bat` - Check admin users
- `create_admin.bat` - Create/update admin user
- `import_db.bat` - Import database backup
- `add_event_columns.bat` - Add columns to events table
- `check_all_columns.bat` - Check for missing columns
- `add_remaining_columns.bat` - Add missing columns to all tables

## 🔍 WHEN CLAUDE NEEDS TO CONNECT TO LOCAL DATABASE

**ALWAYS check this file first**: `DATABASE-CONNECTION-PATTERN.md`

Then follow these steps:
1. Create a .bat file with the pattern above
2. Use Write tool to create the file
3. Execute with Bash tool using PowerShell: `powershell -Command "& './filename.bat'"`
   **CRITICAL: You MUST use PowerShell - no other method works!**

## 💡 ENVIRONMENT VARIABLES IN .env
For Node.js applications, the connection is configured in:
- `tpe-backend/.env` or `tpe-backend/.env.local`

```env
DATABASE_URL=postgresql://postgres:TPXP0stgres!!@localhost:5432/tpedb
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tpedb
DB_USER=postgres
DB_PASSWORD=TPXP0stgres!!
```

## 🚀 NEW: QUICK-DB WRAPPER (RECOMMENDED!)
**We now have a wrapper function that handles everything automatically!**

### Usage:
```bash
powershell -Command ".\quick-db.bat \"YOUR SQL QUERY HERE\""
```

### Examples:
```bash
# Count contractors
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM contractors;\""

# Check AI tables
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ai_%';\""

# View table structure (use \d command)
powershell -Command ".\quick-db.bat \"\d contractors\""
```

**This wrapper automatically:**
- Sets PGPASSWORD correctly
- Uses full path to psql.exe
- Handles the connection parameters
- Provides clean output formatting

## 🎯 QUICK TEST CONNECTION
To test if database is accessible:
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT 1;"
```

---

**REMEMBER**: This is a Windows environment. Always use Windows paths, batch files, and the full path to psql.exe!