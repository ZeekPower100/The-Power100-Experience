@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 1: Basic Event Information
echo Fields: name, date, location, format, event_type
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('name', 'date', 'location', 'format', 'event_type') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, name, date, location, format, event_type FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"