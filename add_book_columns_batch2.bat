@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Adding BATCH 2: Content and initial EA fields (5 columns)
echo ========================================
echo.

echo 1. Adding target_revenue column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS target_revenue TEXT;"

echo 2. Adding sample_chapter_link column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_chapter_link VARCHAR(500);"

echo 3. Adding table_of_contents column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS table_of_contents TEXT;"

echo 4. Adding has_executive_assistant column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS has_executive_assistant BOOLEAN DEFAULT false;"

echo 5. Adding ea_name column...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_name VARCHAR(255);"

echo.
echo ========================================
echo Verifying Batch 2 columns were added:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('target_revenue', 'sample_chapter_link', 'table_of_contents', 'has_executive_assistant', 'ea_name');"