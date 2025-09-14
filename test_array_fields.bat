@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Testing Array Fields in Database
echo =================================
echo.
echo Checking for test event with array fields:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT name, speaker_profiles, agenda_highlights, past_attendee_testimonials FROM events WHERE speaker_profiles IS NOT NULL OR agenda_highlights IS NOT NULL LIMIT 5;"
echo.
echo Checking for test podcast with array fields:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT name, topics, notable_guests, testimonials FROM podcasts WHERE notable_guests IS NOT NULL OR testimonials IS NOT NULL LIMIT 5;"
echo.
echo Checking for test book with array fields:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT title, key_takeaways, testimonials FROM books WHERE key_takeaways IS NOT NULL OR testimonials IS NOT NULL LIMIT 5;"