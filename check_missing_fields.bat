@echo off
set PGPASSWORD=TPXP0stgres!!

echo Checking Books table for missing fields...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('author_email', 'author_phone')"

echo.
echo Checking Events table for missing fields...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('organizer_name', 'organizer_email', 'target_audience')"

echo.
echo Checking Podcasts table for missing fields...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('host_email', 'host_phone')"