@echo off
set PGPASSWORD=TPXP0stgres!!

echo Checking if key_citations column exists in books table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'key_citations';"

echo.
echo If missing, adding it now...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS key_citations TEXT;"

echo.
echo Verifying it was added...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'key_citations';"