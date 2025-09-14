@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 1: Customer Experience POC Fields
echo Fields: poc_customer_name, poc_customer_email, poc_customer_phone, poc_media_name, poc_media_email
echo ========================================
echo.

echo Adding poc_customer_name...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_customer_name VARCHAR(255);"

echo Adding poc_customer_email...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_customer_email VARCHAR(255);"

echo Adding poc_customer_phone...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_customer_phone VARCHAR(50);"

echo Adding poc_media_name...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_media_name VARCHAR(255);"

echo Adding poc_media_email...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_media_email VARCHAR(255);"

echo.
echo Verifying Batch 1 fields...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('poc_customer_name', 'poc_customer_email', 'poc_customer_phone', 'poc_media_name', 'poc_media_email') ORDER BY column_name;"

echo.
echo ✅ Batch 1 complete!