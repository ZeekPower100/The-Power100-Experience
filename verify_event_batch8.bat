@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 8: Support and Resources (FINAL BATCH)
echo Fields: post_event_support, implementation_support, follow_up_resources, target_audience, logo_url
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('post_event_support', 'implementation_support', 'follow_up_resources', 'target_audience', 'logo_url') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, post_event_support, implementation_support, follow_up_resources, target_audience, logo_url FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"