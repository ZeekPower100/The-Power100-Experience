@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Checking for missing columns in database
echo ========================================
echo.

echo Books table - checking author_email and author_phone:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('author_email', 'author_phone') ORDER BY column_name;"

echo.
echo Events table - checking organizer_name, organizer_email, target_audience:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' AND column_name IN ('organizer_name', 'organizer_email', 'target_audience') ORDER BY column_name;"

echo.
echo Podcasts table - checking host_email and host_phone:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('host_email', 'host_phone') ORDER BY column_name;"

echo.
echo ========================================
echo Check complete
echo ========================================