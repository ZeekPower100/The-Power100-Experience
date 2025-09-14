@echo off
echo Running podcast transcription tables migration on PRODUCTION database...
echo.

set PGPASSWORD=dBP0wer100!!

REM Run the SQL file directly on production
echo Executing migration file on PRODUCTION...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -f "tpe-database\migrations\006_create_podcast_transcription_tables.sql"

echo.
echo Podcast transcription tables migration completed on PRODUCTION!
echo.

REM Verify tables were created
echo Verifying tables on PRODUCTION...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'podcast_%' OR table_name LIKE 'episode_%' ORDER BY table_name;"