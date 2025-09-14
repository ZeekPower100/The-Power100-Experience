# 🚨 STOP! READ THIS BEFORE ANY DATABASE OPERATION! 🚨

## You MUST check `DATABASE-CONNECTION-PATTERN.md` FIRST!

### Why this file exists:
Claude keeps forgetting to check the database connection documentation even though it exists.
This file is a REMINDER to ALWAYS check the proper documentation BEFORE attempting any database operation.

## The ONLY correct way to connect to the local database:

1. **CHECK THE DOCUMENTATION FIRST**: 
   - `DATABASE-CONNECTION-PATTERN.md` has the complete pattern
   
2. **Use Batch Files ONLY**:
   ```batch
   @echo off
   set PGPASSWORD=TPXP0stgres!!
   "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SQL COMMAND"
   ```

3. **NEVER**:
   - Try to use psql directly
   - Forget to set PGPASSWORD
   - Use forward slashes in paths
   - Attempt connection without checking documentation

## If you're about to:
- Check if a column exists → READ `DATABASE-CONNECTION-PATTERN.md`
- Add a column → READ `DATABASE-CONNECTION-PATTERN.md`
- Query the database → READ `DATABASE-CONNECTION-PATTERN.md`
- Do ANYTHING with the database → READ `DATABASE-CONNECTION-PATTERN.md`

## The documentation exists and has been tested!
Stop reinventing the wheel. The pattern is documented. Use it.

---
**REMEMBER**: When in doubt, check `DATABASE-CONNECTION-PATTERN.md` FIRST!