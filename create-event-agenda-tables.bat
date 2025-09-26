@echo off
echo Creating event agenda tables...
echo ========================================

set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -f create-event-agenda-tables.sql

echo ========================================
echo Event agenda tables creation completed.
pause