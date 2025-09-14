@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 3: POC Customer Experience Fields (NEW)
echo Fields: poc_customer_name, poc_customer_email, poc_customer_phone, poc_media_name, poc_media_email
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('poc_customer_name', 'poc_customer_email', 'poc_customer_phone', 'poc_media_name', 'poc_media_email') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, poc_customer_name, poc_customer_email, poc_customer_phone, poc_media_name, poc_media_email FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"