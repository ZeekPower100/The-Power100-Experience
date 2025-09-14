@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 7: Metrics Fields Verification
echo Fields: subscriber_count, download_average
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('subscriber_count', 'download_average') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, subscriber_count, download_average FROM podcasts WHERE id IN (SELECT id FROM podcasts ORDER BY id DESC LIMIT 2);"