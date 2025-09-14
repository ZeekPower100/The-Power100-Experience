@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 4: POC Media and Event Links
echo Fields: poc_media_phone, hotel_block_url, registration_url, registration_deadline, price_range
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('poc_media_phone', 'hotel_block_url', 'registration_url', 'registration_deadline', 'price_range') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, poc_media_phone, hotel_block_url, registration_url, registration_deadline, price_range FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"