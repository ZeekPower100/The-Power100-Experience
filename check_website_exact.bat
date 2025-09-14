@echo off
set PGPASSWORD=TPXP0stgres!!
echo Checking website column exactly...
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'website';"