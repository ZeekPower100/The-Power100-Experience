@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo All tables in TPE database:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"