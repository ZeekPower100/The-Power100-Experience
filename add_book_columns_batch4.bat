@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 4: Strategic fields (5 columns)
echo ========================================
echo.

echo 1. Adding writing_influence column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS writing_influence TEXT;"

echo 2. Adding intended_solutions column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS intended_solutions TEXT;"

echo 3. Adding author_next_focus column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS author_next_focus TEXT;"

echo 4. Adding book_goals column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS book_goals TEXT;"

echo 5. Adding author_availability column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS author_availability TEXT;"

echo.
echo ========================================
echo Verifying Batch 4 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('writing_influence', 'intended_solutions', 'author_next_focus', 'book_goals', 'author_availability');"