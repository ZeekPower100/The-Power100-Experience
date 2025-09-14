@echo off
set PGPASSWORD=TPXP0stgres!!
echo Adding target_revenue column to events table...
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS target_revenue TEXT;"
echo.
echo Verifying column was added:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'target_revenue';"