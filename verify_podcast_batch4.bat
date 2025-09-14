@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 4: Content & Metrics Verification
echo Fields: average_episode_length, total_episodes, key_achievements, testimonials, notable_guests
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('average_episode_length', 'total_episodes', 'key_achievements', 'testimonials', 'notable_guests') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, average_episode_length, total_episodes, SUBSTRING(key_achievements, 1, 30) as achievements_preview, SUBSTRING(testimonials, 1, 30) as testimonials_preview, SUBSTRING(notable_guests, 1, 30) as guests_preview FROM podcasts WHERE id IN (SELECT id FROM podcasts ORDER BY id DESC LIMIT 2);"