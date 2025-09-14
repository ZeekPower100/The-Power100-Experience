@echo off
REM Quick Database Query Tool - Always uses correct pattern
REM Usage: powershell -Command ".\quick-db.bat 'SELECT * FROM contractors LIMIT 1;'"
REM
REM This wrapper ensures Claude always uses the correct database connection pattern
REM No more forgetting how to connect to local PostgreSQL!

set PGPASSWORD=TPXP0stgres!!

if "%~1"=="" (
    echo.
    echo ERROR: No SQL query provided!
    echo.
    echo Usage: quick-db.bat "YOUR SQL QUERY HERE"
    echo Example: quick-db.bat "SELECT * FROM contractors LIMIT 5;"
    echo.
    exit /b 1
)

echo.
echo Executing query...
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "%~1"
echo.
echo ========================================
echo Query completed.