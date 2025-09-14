@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 1: Core Fields Verification
echo Fields: title, host, description, website, logo_url
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('title', 'host', 'description', 'website', 'logo_url') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, title, host, SUBSTRING(description, 1, 30) as desc_preview, website, SUBSTRING(logo_url, 1, 30) as logo_preview FROM podcasts ORDER BY id DESC LIMIT 2;"