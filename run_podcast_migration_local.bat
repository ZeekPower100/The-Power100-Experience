@echo off
echo Running podcast transcription tables migration on LOCAL database...
echo.

set PGPASSWORD=TPXP0stgres!!

REM Run the SQL file directly
echo Executing migration file...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -f "tpe-database\migrations\006_create_podcast_transcription_tables.sql"

echo.
echo Podcast transcription tables migration completed!
echo.

REM Verify tables were created
echo Verifying tables...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'podcast_%' OR table_name LIKE 'episode_%' ORDER BY table_name;"