@echo off
set PGPASSWORD=TPXP0stgres!!

echo Checking array field formats in database...
echo.

echo Books - key_takeaways field (first record):
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT key_takeaways FROM books WHERE key_takeaways IS NOT NULL LIMIT 1;"

echo.
echo Events - speaker_profiles field (first record):
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT speaker_profiles FROM events WHERE speaker_profiles IS NOT NULL LIMIT 1;"

echo.
echo Podcasts - topics field (first record):
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT topics FROM podcasts WHERE topics IS NOT NULL LIMIT 1;"