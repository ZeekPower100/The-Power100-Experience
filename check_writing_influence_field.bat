@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo FIELD 1: Writing Influence
echo ========================================
echo.

echo Checking exact column name in database:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name LIKE '%%writing%%' OR column_name LIKE '%%influence%%' OR column_name LIKE '%%inspiration%%';"

echo.
echo Sample data from this field:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, title, writing_influence FROM books WHERE writing_influence IS NOT NULL LIMIT 3;"