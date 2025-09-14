@echo off
set PGPASSWORD=TPXP0stgres!!
if "%1"=="" (
    echo Usage: check_field_exists.bat [table_name] [field_name]
    echo Example: check_field_exists.bat events speaker_profiles
    exit /b 1
)
if "%2"=="" (
    echo Usage: check_field_exists.bat [table_name] [field_name]
    echo Example: check_field_exists.bat events speaker_profiles
    exit /b 1
)
echo.
echo Checking if field '%2' exists in table '%1':
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_name = '%1' AND column_name = '%2';"
echo.
set RESULT=%ERRORLEVEL%
if %RESULT%==0 (
    echo ✓ Query executed successfully
    echo If no rows returned, field does NOT exist
) else (
    echo ✗ Query failed
)