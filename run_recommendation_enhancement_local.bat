@echo off
echo Running Recommendation Enhancement migration on LOCAL database...
echo ========================================

set PGPASSWORD=TPXP0stgres!!

psql -U postgres -h localhost -d tpedb -f tpe-database/migrations/009_enhance_recommendation_system.sql

echo ========================================
echo Migration completed on LOCAL database.
pause