@echo off
set PGPASSWORD=TPXP0stgres!!

echo Checking average_episode_length values in database:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT DISTINCT average_episode_length FROM podcasts WHERE average_episode_length IS NOT NULL ORDER BY average_episode_length;"