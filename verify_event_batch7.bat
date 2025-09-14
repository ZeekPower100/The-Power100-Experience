@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 7: Sponsors and Attendees
echo Fields: sponsors, pre_registered_attendees, networking_quality_score, networking_opportunities, session_recordings
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('sponsors', 'pre_registered_attendees', 'networking_quality_score', 'networking_opportunities', 'session_recordings') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, sponsors, pre_registered_attendees, networking_quality_score, networking_opportunities, session_recordings FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"