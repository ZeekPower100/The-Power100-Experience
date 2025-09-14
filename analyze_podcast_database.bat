@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo COMPLETE PODCAST TABLE SCHEMA ANALYSIS
echo ========================================
echo.

echo 1. ALL COLUMNS IN PODCASTS TABLE:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'podcasts' ORDER BY ordinal_position;"

echo.
echo 2. TOTAL COLUMN COUNT:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT COUNT(*) as total_columns FROM information_schema.columns WHERE table_name = 'podcasts';"

echo.
echo 3. SAMPLE DATA (Recent podcasts):
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, title, host, SUBSTRING(description, 1, 50) as desc_preview FROM podcasts ORDER BY created_at DESC LIMIT 3;"