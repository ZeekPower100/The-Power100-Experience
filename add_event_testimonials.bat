@echo off
set PGPASSWORD=TPXP0stgres!!
echo Adding past_attendee_testimonials column to events table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS past_attendee_testimonials TEXT;"
echo.
echo Verifying column was added:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'past_attendee_testimonials';"