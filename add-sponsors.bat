@echo off
set PGPASSWORD=TPXP0stgres!!

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -f temp_sponsors.sql
