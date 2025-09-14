@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 2: Remaining Greg Fields
echo Fields: poc_media_phone, hotel_block_url, sponsors, pre_registered_attendees
echo ========================================
echo.

echo Adding poc_media_phone...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_media_phone VARCHAR(50);"

echo Adding hotel_block_url...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_block_url VARCHAR(500);"

echo Adding sponsors (JSON array)...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsors TEXT;"

echo Adding pre_registered_attendees (JSON array)...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS pre_registered_attendees TEXT;"

echo.
echo Verifying Batch 2 fields...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('poc_media_phone', 'hotel_block_url', 'sponsors', 'pre_registered_attendees') ORDER BY column_name;"

echo.
echo ✅ Batch 2 complete!