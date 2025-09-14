@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo ========================================
echo Array/JSON/Text fields that may contain arrays:
echo ========================================
echo.
echo These fields likely store JSON arrays or complex data:
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND data_type IN ('text', 'json', 'jsonb') AND (column_name LIKE '%%_%%' OR column_name LIKE '%%profiles%%' OR column_name LIKE '%%guests%%' OR column_name LIKE '%%topics%%' OR column_name LIKE '%%testimonials%%' OR column_name LIKE '%%takeaways%%' OR column_name LIKE '%%highlights%%' OR column_name LIKE '%%areas%%' OR column_name LIKE '%%tags%%') ORDER BY table_name, column_name;"
echo.
echo ========================================
echo All TEXT columns (potential array storage):
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'text' ORDER BY table_name, column_name;"