@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 3: Host Extended Info and Guest Info (7 columns)
echo ========================================
echo.

echo 1. Adding host_linkedin column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS host_linkedin VARCHAR(500);"

echo 2. Adding host_company column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS host_company VARCHAR(255);"

echo 3. Adding host_bio column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS host_bio TEXT;"

echo 4. Adding accepts_guest_requests column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS accepts_guest_requests BOOLEAN DEFAULT false;"

echo 5. Adding guest_requirements column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS guest_requirements TEXT;"

echo 6. Adding typical_guest_profile column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS typical_guest_profile TEXT;"

echo 7. Adding booking_link column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS booking_link VARCHAR(500);"

echo.
echo ========================================
echo Verifying Batch 3 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('host_linkedin', 'host_company', 'host_bio', 'accepts_guest_requests', 'guest_requirements', 'typical_guest_profile', 'booking_link');"