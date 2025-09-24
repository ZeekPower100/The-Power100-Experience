@echo off
echo Creating Event Tables in Local Database...
echo ========================================

set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -h localhost -p 5432 -f create-event-tables.sql

echo.
echo ========================================
echo Event tables creation completed.
pause