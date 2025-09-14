@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 3: Remaining EA and author fields (5 columns)
echo ========================================
echo.

echo 1. Adding ea_email column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_email VARCHAR(255);"

echo 2. Adding ea_phone column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_phone VARCHAR(50);"

echo 3. Adding ea_scheduling_link column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_scheduling_link VARCHAR(500);"

echo 4. Adding author_linkedin_url column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS author_linkedin_url VARCHAR(500);"

echo 5. Adding author_website column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS author_website VARCHAR(500);"

echo.
echo ========================================
echo Verifying Batch 3 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('ea_email', 'ea_phone', 'ea_scheduling_link', 'author_linkedin_url', 'author_website');"