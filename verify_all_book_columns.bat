@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo VERIFICATION: All 15 newly added columns
echo ========================================
echo.

echo Checking all newly added columns exist in books table:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('submitter_name', 'submitter_email', 'submitter_phone', 'submitter_company', 'is_author', 'target_revenue', 'sample_chapter_link', 'table_of_contents', 'has_executive_assistant', 'ea_name', 'ea_email', 'ea_phone', 'ea_scheduling_link', 'author_linkedin_url', 'author_website') ORDER BY column_name;"

echo.
echo ========================================
echo Total count of columns in books table:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT COUNT(*) as total_columns FROM information_schema.columns WHERE table_name = 'books';"