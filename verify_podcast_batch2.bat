@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 2: Content Fields Verification
echo Fields: frequency, focus_areas_covered, topics, target_audience, spotify_url
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('frequency', 'focus_areas_covered', 'topics', 'target_audience', 'spotify_url') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, frequency, SUBSTRING(focus_areas_covered, 1, 30) as focus_preview, SUBSTRING(topics, 1, 30) as topics_preview, SUBSTRING(target_audience, 1, 30) as audience_preview, spotify_url FROM podcasts WHERE id IN (SELECT id FROM podcasts ORDER BY id DESC LIMIT 2);"