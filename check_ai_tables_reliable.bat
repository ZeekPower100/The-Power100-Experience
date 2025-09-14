@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Method 1: Search for tables starting with 'ai_' (MOST RELIABLE)
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name;"

echo.
echo Method 2: Search for tables with 'ai' anywhere (might include non-AI tables)
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%ai%' ORDER BY table_name;"

echo.
echo Method 3: Search for known AI-related patterns
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE 'ai_%' OR table_name LIKE '%_ai_%' OR table_name LIKE 'contractor_ai_%' OR table_name IN ('content_tags', 'ai_tagging_history', 'recommendation_history')) ORDER BY table_name;"