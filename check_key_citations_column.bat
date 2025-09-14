@echo off
set PGPASSWORD=TPXP0stgres!!

echo Checking if key_citations column exists:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'key_citations';"