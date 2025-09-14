@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding end_date column to events table
echo ========================================
echo.

echo Adding end_date column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;"

echo.
echo Verifying column was added...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('date', 'end_date') ORDER BY column_name;"

echo.
echo ✅ end_date column added successfully!