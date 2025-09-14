@echo off
echo Running Document Extraction migration on LOCAL database...
echo ========================================

set PGPASSWORD=TPXP0stgres!!

psql -U postgres -h localhost -d tpedb -f tpe-database/migrations/008_create_document_extraction_tables.sql

echo ========================================
echo Migration completed on LOCAL database.
pause