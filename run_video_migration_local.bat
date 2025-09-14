@echo off
echo.
echo ========================================
echo Running Video Analysis Migration on LOCAL Database
echo ========================================
echo.

set PGPASSWORD=TPXP0stgres!!

echo Applying migration to local database...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -h localhost -f "tpe-database\migrations\007_create_video_analysis_tables.sql"

echo.
echo ========================================
echo Migration completed!
echo ========================================
echo.

REM Verify tables were created
echo Verifying tables...
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -h localhost -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('video_content', 'video_analysis', 'demo_segments', 'video_performance') ORDER BY table_name;"

pause