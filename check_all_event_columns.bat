@echo off
set PGPASSWORD=TPXP0stgres!!

echo All columns in events table:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d events"