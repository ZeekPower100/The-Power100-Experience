@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 2: Organizer Information
echo Fields: organizer_name, organizer_email, organizer_phone, organizer_company, website
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('organizer_name', 'organizer_email', 'organizer_phone', 'organizer_company', 'website') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, organizer_name, organizer_email, organizer_phone, organizer_company, website FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"