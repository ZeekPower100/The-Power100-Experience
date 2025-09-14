@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding missing contact fields to database
echo ========================================
echo.

echo Adding fields to books table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS author_email VARCHAR(255), ADD COLUMN IF NOT EXISTS author_phone VARCHAR(50);"

echo.
echo Adding fields to events table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255), ADD COLUMN IF NOT EXISTS organizer_email VARCHAR(255), ADD COLUMN IF NOT EXISTS target_audience TEXT;"

echo.
echo Adding fields to podcasts table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS host_email VARCHAR(255), ADD COLUMN IF NOT EXISTS host_phone VARCHAR(50);"

echo.
echo ========================================
echo Fields added successfully!
echo ========================================
echo.
echo Verifying the fields were added...
echo.

echo Books table columns:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('author_email', 'author_phone') ORDER BY column_name;"

echo.
echo Events table columns:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('organizer_name', 'organizer_email', 'target_audience') ORDER BY column_name;"

echo.
echo Podcasts table columns:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('host_email', 'host_phone') ORDER BY column_name;"