@echo off
echo ================================
echo COMPARING DEV vs PROD COLUMNS
echo ================================
echo.

echo LOCAL DEV DATABASE - EVENTS TABLE:
echo -----------------------------------
set PGPASSWORD=TPXP0stgres!!
psql -h localhost -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'events' ORDER BY column_name;" > dev_events_columns.txt 2>&1
type dev_events_columns.txt
echo.

echo LOCAL DEV DATABASE - BOOKS TABLE:
echo ----------------------------------
psql -h localhost -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'books' ORDER BY column_name;" > dev_books_columns.txt 2>&1
type dev_books_columns.txt
echo.

echo LOCAL DEV DATABASE - PODCASTS TABLE:
echo -------------------------------------
psql -h localhost -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'podcasts' ORDER BY column_name;" > dev_podcasts_columns.txt 2>&1
type dev_podcasts_columns.txt
echo.

pause