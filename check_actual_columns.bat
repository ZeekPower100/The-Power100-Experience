@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Actual columns in EVENTS table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;"
echo.
echo Actual columns in PODCASTS table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'podcasts' ORDER BY ordinal_position;"
echo.
echo Actual columns in BOOKS table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'books' ORDER BY ordinal_position;"