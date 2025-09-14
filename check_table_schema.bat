@echo off
set PGPASSWORD=TPXP0stgres!!
if "%1"=="" (
    echo Usage: check_table_schema.bat [table_name]
    echo Example: check_table_schema.bat events
    echo.
    echo Available tables:
    "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
) else (
    echo.
    echo ========================================
    echo Schema for table: %1
    echo ========================================
    "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d %1"
    echo.
    echo ========================================
    echo Column Details:
    echo ========================================
    "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '%1' ORDER BY ordinal_position;"
)