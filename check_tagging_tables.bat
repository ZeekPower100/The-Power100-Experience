@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Checking for tagging-related tables in local database:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('content_tags', 'tagged_content', 'tag_rules', 'tag_synonyms', 'ai_tagging_history') ORDER BY table_name;"