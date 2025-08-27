@echo off
echo Please enter the PostgreSQL password you set during installation:
set /p PGPASSWORD=Password: 

echo.
echo Creating database...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE tpedb;"

echo.
echo Importing data...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -f "C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe_production_backup_complete.sql"

echo.
echo Testing connection...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT COUNT(*) FROM contractors;"

echo.
echo Done!
pause