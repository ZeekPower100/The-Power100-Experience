@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 1: Platform URLs (4 columns)
echo ========================================
echo.

echo 1. Adding spotify_url column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS spotify_url VARCHAR(500);"

echo 2. Adding apple_podcasts_url column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS apple_podcasts_url VARCHAR(500);"

echo 3. Adding youtube_url column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(500);"

echo 4. Adding other_platform_urls column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS other_platform_urls TEXT;"

echo.
echo ========================================
echo Verifying Batch 1 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('spotify_url', 'apple_podcasts_url', 'youtube_url', 'other_platform_urls');"