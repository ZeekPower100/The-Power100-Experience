@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding missing columns to events table
echo ========================================
echo.

echo Adding event_type column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);"

echo Adding price_range column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS price_range VARCHAR(100);"

echo Adding organizer_phone column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_phone VARCHAR(50);"

echo Adding organizer_company column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_company VARCHAR(255);"

echo Adding duration column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS duration VARCHAR(100);"

echo Adding topics column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS topics TEXT;"

echo Adding registration_url column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_url VARCHAR(500);"

echo Adding success_metrics column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS success_metrics TEXT;"

echo Adding networking_quality_score column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS networking_quality_score VARCHAR(50);"

echo.
echo ========================================
echo Verifying columns were added...
echo ========================================
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('event_type', 'price_range', 'organizer_phone', 'organizer_company', 'duration', 'topics', 'registration_url', 'success_metrics', 'networking_quality_score') ORDER BY column_name;"

echo.
echo ========================================
echo Complete!
echo ========================================