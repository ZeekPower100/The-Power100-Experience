@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Renaming expected_attendees to expected_attendance
echo ========================================
echo.

echo 1. RENAMING COLUMN:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events RENAME COLUMN expected_attendees TO expected_attendance;"

echo.
echo 2. VERIFYING CHANGE:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('expected_attendees', 'expected_attendance');"

echo.
echo 3. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, expected_attendance FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"