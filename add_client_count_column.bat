@echo off
echo Adding client_count column to strategic_partners table...

REM Set PostgreSQL password
set PGPASSWORD=TPXP0stgres!!

REM Add client_count column
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS client_count TEXT;"

REM Verify the column was added
echo.
echo Verifying column was added:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name = 'client_count';"

echo.
echo Done! client_count column has been added to strategic_partners table.
pause