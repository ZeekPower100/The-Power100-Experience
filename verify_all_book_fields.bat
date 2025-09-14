@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo COMPLETE BOOK FIELDS VERIFICATION
echo ========================================
echo.

echo 1. ALL 20 NEW FIELDS (from all 4 batches):
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'books' AND column_name IN ('submitter_name', 'submitter_email', 'submitter_phone', 'submitter_company', 'is_author', 'target_revenue', 'sample_chapter_link', 'table_of_contents', 'has_executive_assistant', 'ea_name', 'ea_email', 'ea_phone', 'ea_scheduling_link', 'author_linkedin_url', 'author_website', 'writing_influence', 'intended_solutions', 'author_next_focus', 'book_goals', 'author_availability') ORDER BY column_name;"

echo.
echo 2. TOTAL COLUMN COUNT:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT COUNT(*) as total_book_columns FROM information_schema.columns WHERE table_name = 'books';"

echo.
echo 3. ALL BOOK TABLE COLUMNS:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' ORDER BY ordinal_position;"