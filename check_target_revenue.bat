@echo off
set PGPASSWORD=TPXP0stgres!!
echo Checking target_revenue and target_audience columns...
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name LIKE 'target%';"