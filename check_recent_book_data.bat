@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Checking recent book submissions for strategic fields
echo ========================================
echo.

echo Recent books with strategic field data:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, title, SUBSTRING(writing_influence, 1, 50) as writing_influence_preview, SUBSTRING(intended_solutions, 1, 50) as solutions_preview, SUBSTRING(author_next_focus, 1, 50) as focus_preview FROM books ORDER BY created_at DESC LIMIT 5;"

echo.
echo Checking if any NULL vs empty string issues:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT COUNT(*) as total_books, COUNT(writing_influence) as has_writing_influence, COUNT(CASE WHEN writing_influence = '' THEN 1 END) as empty_writing_influence, COUNT(CASE WHEN writing_influence IS NULL THEN 1 END) as null_writing_influence FROM books;"