@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 2: Episode Info & Target Revenue (5 columns)
echo ========================================
echo.

echo 1. Adding episode_count column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS episode_count INTEGER;"

echo 2. Adding average_episode_length column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS average_episode_length VARCHAR(50);"

echo 3. Adding total_episodes column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS total_episodes INTEGER;"

echo 4. Adding format column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS format VARCHAR(100);"

echo 5. Adding target_revenue column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS target_revenue TEXT;"

echo.
echo ========================================
echo Verifying Batch 2 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('episode_count', 'average_episode_length', 'total_episodes', 'format', 'target_revenue');"