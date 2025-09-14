@echo off
set PGPASSWORD=TPXP0stgres!!
echo Checking website column in events table...
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name LIKE '%website%';"
echo.
echo Sample data:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, name, website FROM events WHERE website IS NOT NULL LIMIT 3;"