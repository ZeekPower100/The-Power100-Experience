@echo off
set PGPASSWORD=TPXP0stgres!!
echo Adding missing columns to books table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS testimonials TEXT;"
echo.
echo Adding missing columns to podcasts table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS notable_guests TEXT, ADD COLUMN IF NOT EXISTS testimonials TEXT;"
echo.
echo Verification - All columns should now exist:
echo.
echo EVENTS table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('speaker_profiles', 'agenda_highlights', 'past_attendee_testimonials') ORDER BY column_name;"
echo.
echo BOOKS table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('key_takeaways', 'testimonials') ORDER BY column_name;"
echo.
echo PODCASTS table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('notable_guests', 'testimonials', 'topics') ORDER BY column_name;"