@echo off
REM Execute Learning Infrastructure Tables Creation
echo Creating AI Learning Infrastructure Tables...
echo ========================================

set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -f create-learning-tables.sql

echo ========================================
echo Learning tables creation completed!
pause