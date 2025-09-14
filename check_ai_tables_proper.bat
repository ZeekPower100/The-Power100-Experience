@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Checking for AI-related tables in database...
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%ai%' OR table_name LIKE '%interaction%' OR table_name LIKE '%recommendation%' OR table_name LIKE '%behavioral%' OR table_name LIKE '%content_analysis%' OR table_name LIKE '%success_stor%' OR table_name LIKE '%content_tag%') ORDER BY table_name;"