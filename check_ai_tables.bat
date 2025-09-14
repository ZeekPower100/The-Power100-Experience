@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo Checking for AI-related tables in database
echo ========================================
echo.

set PGPASSWORD=TPXP0stgres!!

echo Searching for tables with 'ai', 'interaction', 'recommendation', or 'behavioral' in their names...
echo.

psql -U postgres -d tpedb -h localhost -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%%ai%%' OR table_name LIKE '%%interaction%%' OR table_name LIKE '%%recommendation%%' OR table_name LIKE '%%behavioral%%' OR table_name LIKE '%%content_analysis%%' OR table_name LIKE '%%success_stor%%') ORDER BY table_name;"

echo.
echo ========================================
echo Checking for content_tags table (for auto-tagging)
echo ========================================
echo.

psql -U postgres -d tpedb -h localhost -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_tags';"

echo.
echo Done checking AI tables.
pause