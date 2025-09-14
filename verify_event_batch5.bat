@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 5: Event Details
echo Fields: description, duration, expected_attendance, focus_areas_covered, target_revenue
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('description', 'duration', 'expected_attendance', 'focus_areas_covered', 'target_revenue') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, description, duration, expected_attendance, focus_areas_covered, target_revenue FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"