@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Verifying Event #18 array fields:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT name, speaker_profiles, agenda_highlights, past_attendee_testimonials FROM events WHERE id = 18;"