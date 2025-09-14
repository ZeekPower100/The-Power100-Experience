@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Checking BOOKS table for missing columns:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT 'key_takeaways' as missing_column WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'key_takeaways') UNION SELECT 'testimonials' WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'testimonials');"
echo.
echo Checking PODCASTS table for missing columns:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT 'notable_guests' as missing_column WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name = 'notable_guests') UNION SELECT 'testimonials' WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name = 'testimonials');"