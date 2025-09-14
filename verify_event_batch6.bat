@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 6: Content and Speakers
echo Fields: speaker_profiles, agenda_highlights, topics, past_attendee_testimonials, success_metrics
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('speaker_profiles', 'agenda_highlights', 'topics', 'past_attendee_testimonials', 'success_metrics') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, speaker_profiles, agenda_highlights, topics, past_attendee_testimonials, success_metrics FROM events WHERE id IN (SELECT id FROM events ORDER BY id DESC LIMIT 2);"