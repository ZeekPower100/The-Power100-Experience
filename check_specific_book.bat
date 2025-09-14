@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo Checking Book ID 28 (Madness Max) - Has strategic fields
echo ========================================
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, title, writing_influence, intended_solutions, author_next_focus, book_goals, author_availability FROM books WHERE id = 28;"