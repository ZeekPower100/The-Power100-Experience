@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 4: Metrics and Submitter Info (7 columns)
echo ========================================
echo.

echo 1. Adding subscriber_count column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS subscriber_count INTEGER;"

echo 2. Adding download_average column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS download_average INTEGER;"

echo 3. Adding submitter_name column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255);"

echo 4. Adding submitter_email column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255);"

echo 5. Adding submitter_phone column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(50);"

echo 6. Adding submitter_company column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_company VARCHAR(255);"

echo 7. Adding is_host column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT false;"

echo.
echo ========================================
echo Verifying Batch 4 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('subscriber_count', 'download_average', 'submitter_name', 'submitter_email', 'submitter_phone', 'submitter_company', 'is_host');"