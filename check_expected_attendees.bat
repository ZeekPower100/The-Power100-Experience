@echo off
set PGPASSWORD=TPXP0stgres!!
echo Checking expected_attendees column type and data...
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'expected_attendees';"
echo.
echo Sample data:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, name, expected_attendees FROM events WHERE expected_attendees IS NOT NULL LIMIT 3;"