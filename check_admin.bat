@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT email, name, password IS NULL as password_is_null, LENGTH(password) as password_length FROM admin_users;"
pause