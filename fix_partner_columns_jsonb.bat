@echo off
REM Fix partner data - separate service areas from focus areas (JSONB version)

set PGPASSWORD=TPXP0stgres!!

echo Fixing partner data - separating service areas from focus areas...
echo.

echo Step 1: For partners with service areas in focus_areas_served, copy to service_areas if empty...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "UPDATE strategic_partners SET service_areas = focus_areas_served WHERE (service_areas IS NULL OR service_areas = '[]' OR service_areas = '') AND focus_areas_served IS NOT NULL AND (focus_areas_served::text LIKE '%%\"windows_doors\"%%' OR focus_areas_served::text LIKE '%%\"roofing\"%%' OR focus_areas_served::text LIKE '%%\"bath\"%%' OR focus_areas_served::text LIKE '%%\"gutters\"%%');"

echo.
echo Step 2: Clear focus_areas_served where it contains service areas instead of focus areas...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "UPDATE strategic_partners SET focus_areas_served = '[]' WHERE focus_areas_served::text LIKE '%%\"windows_doors\"%%' OR focus_areas_served::text LIKE '%%\"roofing\"%%' OR focus_areas_served::text LIKE '%%\"bath\"%%' OR focus_areas_served::text LIKE '%%\"gutters\"%%' OR focus_areas_served::text LIKE '%%\"hvac\"%%' OR focus_areas_served::text LIKE '%%\"plumbing\"%%' OR focus_areas_served::text LIKE '%%\"siding\"%%' OR focus_areas_served::text LIKE '%%\"solar\"%%';"

echo.
echo Step 3: Verify the changes...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, company_name, focus_areas_served, service_areas FROM strategic_partners WHERE id IN (6, 3, 58);"

echo.
echo Step 4: Check all partners...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT COUNT(*) as total_partners, COUNT(CASE WHEN focus_areas_served != '[]' THEN 1 END) as has_focus_areas, COUNT(CASE WHEN service_areas != '[]' AND service_areas IS NOT NULL THEN 1 END) as has_service_areas FROM strategic_partners;"

echo.
echo Data fix completed!