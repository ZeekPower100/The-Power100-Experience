# 🚨 CRITICAL: PowerShell Commands Guide for Windows Development
# THIS IS THE ONLY WAY TO RUN COMMANDS - READ EVERY SECTION

## ⚡ QUICK REFERENCE - THE ONLY COMMANDS THAT WORK

### ✅ CORRECT PowerShell Commands (USE THESE)
```bash
# Running batch files - THIS IS THE ONLY WAY THAT WORKS:
powershell -Command "& './filename.bat'"

# Running Node.js scripts:
powershell -Command "node script.js"

# Running npm commands:
powershell -Command "npm run command"

# Changing directory and running commands:
powershell -Command "cd 'C:\Users\broac\CascadeProjects\The-Power100-Experience'; & './check_all_event_columns.bat'"
```

### ❌ NEVER USE THESE (THEY DON'T WORK)
```bash
# These will ALL FAIL - DO NOT USE:
./filename.bat                    # ❌ FAILS - bash doesn't understand Windows batch files
cmd /c filename.bat               # ❌ FAILS - returns no output in our environment
cmd.exe /c filename.bat           # ❌ FAILS - returns only Windows version info
filename.bat                      # ❌ FAILS - command not found
.\filename.bat                    # ❌ FAILS - bash syntax error
bash filename.bat                 # ❌ FAILS - bash can't run batch files
sh filename.bat                   # ❌ FAILS - sh can't run batch files
```

## 📋 MANDATORY PATTERN FOR BATCH FILES

### The ONLY Working Pattern
When you need to run ANY batch file (.bat), you MUST use this exact pattern:

```bash
powershell -Command "& './batch_file_name.bat'"
```

### Examples That ACTUALLY WORK:
```bash
# Database operations:
powershell -Command "& './check_all_event_columns.bat'"
powershell -Command "& './add_event_columns.bat'"
powershell -Command "& './check_table_schema.bat'"

# Server management:
powershell -Command "& './dev-manager.js'"
powershell -Command "node dev-manager.js restart backend"
```

## 🔴 CRITICAL: Why Only PowerShell Works

1. **Environment Context**: We're using Git Bash on Windows, which doesn't natively execute .bat files
2. **PowerShell Bridge**: PowerShell acts as the bridge between bash and Windows batch files
3. **Output Capture**: Only PowerShell properly captures and returns batch file output
4. **Error Handling**: PowerShell correctly reports batch file errors back to bash

## 📁 Working with Paths

### Always Use These Path Formats:
```bash
# For PowerShell commands with spaces in paths:
powershell -Command "cd 'C:\Path With Spaces\folder'; & './script.bat'"

# For simple paths:
powershell -Command "cd C:\Users\broac\CascadeProjects\The-Power100-Experience; & './script.bat'"

# Current directory batch files:
powershell -Command "& './local_script.bat'"
```

## 🛠️ Complete Examples for Common Tasks

### Database Operations
```bash
# Check all columns in a table:
powershell -Command "& './check_all_event_columns.bat'"

# Add missing columns:
powershell -Command "& './add_missing_columns.bat'"

# Run database migrations:
powershell -Command "& './run_migrations.bat'"
```

### Server Management
```bash
# Start servers:
powershell -Command "node dev-manager.js start all"

# Restart backend:
powershell -Command "node dev-manager.js restart backend"

# Check status:
powershell -Command "node dev-manager.js status"
```

### NPM Scripts
```bash
# Run development server:
powershell -Command "npm run dev"

# Run with safety checks:
powershell -Command "npm run safe"

# Build project:
powershell -Command "npm run build"
```

## 🎯 STEP-BY-STEP GUIDE FOR NEW USERS

### When You Need to Run a Batch File:

1. **STOP** - Don't try Linux/Mac commands
2. **USE** - `powershell -Command "& './filename.bat'"`
3. **VERIFY** - Check that output is returned
4. **CONTINUE** - Only proceed if you see actual output

### Example Workflow:
```bash
# Step 1: Check what batch files exist
ls *.bat

# Step 2: Run the batch file with PowerShell
powershell -Command "& './check_all_event_columns.bat'"

# Step 3: Verify you got output (not just Windows version)
# You should see actual database results or script output

# Step 4: Continue with your task
```

## 🚫 COMMON MISTAKES TO AVOID

### Mistake 1: Using cmd directly
```bash
# WRONG - Returns only Windows version:
cmd /c check_database.bat

# RIGHT - Returns actual output:
powershell -Command "& './check_database.bat'"
```

### Mistake 2: Using bash syntax
```bash
# WRONG - Command not found:
./my_script.bat

# RIGHT - Executes properly:
powershell -Command "& './my_script.bat'"
```

### Mistake 3: Forgetting quotes with paths
```bash
# WRONG - Fails with spaces:
powershell -Command "cd C:\Program Files\folder; & './script.bat'"

# RIGHT - Works with spaces:
powershell -Command "cd 'C:\Program Files\folder'; & './script.bat'"
```

## 📝 TESTING YOUR COMMANDS

### How to Verify a Command Works:
1. Run the command
2. Check for actual output (not just "Microsoft Windows [Version...]")
3. If you only see Windows version info, the command FAILED
4. If you see your expected output, the command SUCCEEDED

### Test Example:
```bash
# This is how you test if your command works:
powershell -Command "& './check_all_event_columns.bat'"

# GOOD OUTPUT (command worked):
# All columns in events table:
# ========================================
# Column listings here...

# BAD OUTPUT (command failed):
# Microsoft Windows [Version 10.0.26100.4946]
# (c) Microsoft Corporation. All rights reserved.
```

## 🔧 TROUBLESHOOTING

### If PowerShell Commands Don't Work:

1. **Check file exists**: `ls *.bat`
2. **Check current directory**: `pwd`
3. **Use absolute path**: `powershell -Command "& 'C:\full\path\to\file.bat'"`
4. **Check file permissions**: File should be readable

### Debug Pattern:
```bash
# Step 1: Confirm location
pwd

# Step 2: Confirm file exists
ls check_all_event_columns.bat

# Step 3: Run with PowerShell
powershell -Command "& './check_all_event_columns.bat'"

# Step 4: If still failing, try absolute path
powershell -Command "& 'C:\Users\broac\CascadeProjects\The-Power100-Experience\check_all_event_columns.bat'"
```

## 💡 REMEMBER: ONE RULE TO RULE THEM ALL

**When in doubt, remember this ONE pattern:**
```bash
powershell -Command "& './your_file.bat'"
```

This is the ONLY way that consistently works in our Git Bash on Windows environment.

---

## 🎯 CLAUDE-SPECIFIC INSTRUCTIONS

### For Claude or Any AI Assistant:
1. **ALWAYS** use PowerShell for batch files - no exceptions
2. **NEVER** try cmd, cmd.exe, or direct execution
3. **ALWAYS** verify output before proceeding
4. **IF** you see only Windows version info, the command failed
5. **REMEMBER** this pattern: `powershell -Command "& './file.bat'"`

### The Golden Rule:
If you're about to run a .bat file and you're not using PowerShell, STOP and use PowerShell.

---

**Created**: 2025-09-10
**Environment**: Git Bash on Windows 10
**Verified Working**: All commands in this document have been tested and confirmed working