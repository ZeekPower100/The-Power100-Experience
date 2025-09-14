@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE events ADD COLUMN IF NOT EXISTS speaker_profiles TEXT, ADD COLUMN IF NOT EXISTS agenda_highlights TEXT;"
echo.
echo Checking if columns were added:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('speaker_profiles', 'agenda_highlights', 'past_attendee_testimonials') ORDER BY column_name;"