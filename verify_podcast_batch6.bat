@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 6: Host Details Verification
echo Fields: host_company, host_bio, format
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('host_company', 'host_bio', 'format') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, host_company, SUBSTRING(host_bio, 1, 30) as bio_preview, format FROM podcasts WHERE id IN (SELECT id FROM podcasts ORDER BY id DESC LIMIT 2);"