@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 1: Submitter tracking fields (5 columns)
echo ========================================
echo.

echo 1. Adding submitter_name column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255);"

echo 2. Adding submitter_email column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255);"

echo 3. Adding submitter_phone column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(50);"

echo 4. Adding submitter_company column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_company VARCHAR(255);"

echo 5. Adding is_author column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS is_author BOOLEAN DEFAULT false;"

echo.
echo ========================================
echo Verifying Batch 1 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('submitter_name', 'submitter_email', 'submitter_phone', 'submitter_company', 'is_author');"