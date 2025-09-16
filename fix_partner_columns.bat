@echo off
REM Fix partner data - separate service areas from focus areas

set PGPASSWORD=TPXP0stgres!!

echo Fixing partner data - separating service areas from focus areas...
echo.

REM First, identify which focus_areas_served actually contain service areas (not focus areas)
REM Service areas are things like: bath, roofing, windows_doors, gutters, etc.
REM Focus areas are things like: controlling_lead_flow, installation_quality, etc.

echo Step 1: Copy service area data to service_areas column where needed...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "UPDATE strategic_partners SET service_areas = focus_areas_served WHERE focus_areas_served::text LIKE '%windows_doors%' OR focus_areas_served::text LIKE '%roofing%' OR focus_areas_served::text LIKE '%bath%' OR focus_areas_served::text LIKE '%gutters%' OR focus_areas_served::text LIKE '%hvac%' OR focus_areas_served::text LIKE '%plumbing%' OR focus_areas_served::text LIKE '%siding%' OR focus_areas_served::text LIKE '%solar%';"

echo.
echo Step 2: Clear focus_areas_served for partners that had service areas there...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "UPDATE strategic_partners SET focus_areas_served = '[]' WHERE focus_areas_served::text LIKE '%windows_doors%' OR focus_areas_served::text LIKE '%roofing%' OR focus_areas_served::text LIKE '%bath%' OR focus_areas_served::text LIKE '%gutters%' OR focus_areas_served::text LIKE '%hvac%' OR focus_areas_served::text LIKE '%plumbing%' OR focus_areas_served::text LIKE '%siding%' OR focus_areas_served::text LIKE '%solar%';"

echo.
echo Step 3: Verify the fix...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, company_name, focus_areas_served, service_areas FROM strategic_partners WHERE id IN (6, 3, 58);"

echo.
echo Data fix completed!