@echo off
set PGPASSWORD=TPXP0stgres!!

echo Checking data types of array fields...
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('books', 'events', 'podcasts') AND column_name IN ('key_takeaways', 'testimonials', 'speaker_profiles', 'agenda_highlights', 'past_attendee_testimonials', 'topics', 'notable_guests', 'key_citations', 'focus_areas_covered') ORDER BY table_name, column_name;"