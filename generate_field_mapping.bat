@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo ========================================
echo FIELD MAPPING REFERENCE GENERATOR
echo ========================================
echo.
echo This generates the exact field names you MUST use in:
echo - Frontend forms
echo - Backend controllers
echo - API endpoints
echo.

if "%1"=="" (
    echo Usage: generate_field_mapping.bat [table_name]
    echo Example: generate_field_mapping.bat events
    echo.
    echo Available tables:
    "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT DISTINCT table_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name;" --tuples-only
    exit /b 1
)

echo ========================================
echo TABLE: %1
echo ========================================
echo.
echo DATABASE COLUMNS (USE THESE EXACT NAMES):
echo ------------------------------------------
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '%1' ORDER BY ordinal_position;" --tuples-only

echo.
echo ========================================
echo FRONTEND FORM STATE:
echo ========================================
echo const [formData, setFormData] = useState({
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT '  ' || column_name || ': ' || CASE WHEN data_type = 'text' THEN ''''',' WHEN data_type LIKE 'character%%' THEN ''''',' WHEN data_type = 'integer' THEN '0,' WHEN data_type = 'boolean' THEN 'false,' WHEN data_type = 'jsonb' THEN '[],' WHEN data_type = 'date' THEN ''''',' WHEN data_type LIKE 'timestamp%%' THEN 'null,' ELSE 'null,' END FROM information_schema.columns WHERE table_name = '%1' AND column_name NOT IN ('id', 'created_at', 'updated_at') ORDER BY ordinal_position;" --tuples-only
echo });

echo.
echo ========================================
echo BACKEND CONTROLLER EXTRACTION:
echo ========================================
echo const {
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT '  ' || column_name || ',' FROM information_schema.columns WHERE table_name = '%1' AND column_name NOT IN ('id', 'created_at', 'updated_at') ORDER BY ordinal_position;" --tuples-only
echo } = req.body;

echo.
echo ========================================
echo ARRAY/JSON FIELDS (Need JSON.stringify):
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name || ' (' || data_type || ')' FROM information_schema.columns WHERE table_name = '%1' AND data_type IN ('text', 'json', 'jsonb') AND (column_name LIKE '%%_%%' OR column_name LIKE '%%s') ORDER BY column_name;" --tuples-only

echo.
echo ========================================
echo REMEMBER: Database field names are LAW!
echo Never invent field names. Always verify!
echo ========================================