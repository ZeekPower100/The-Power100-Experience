@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Checking difficulty_level field details
echo ========================================
echo.

echo 1. Column data type and constraints:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'difficulty_level';"

echo.
echo 2. Check for any CHECK constraints:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'books'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%difficulty_level%';"

echo.
echo 3. Current unique values in database:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT DISTINCT difficulty_level, COUNT(*) as count FROM books WHERE difficulty_level IS NOT NULL GROUP BY difficulty_level ORDER BY difficulty_level;"