@echo off
set PGPASSWORD=TPXP0stgres!!
echo Checking event_type column and data...
echo.
echo Column info:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_type';"
echo.
echo Sample data:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, name, event_type FROM events LIMIT 3;"