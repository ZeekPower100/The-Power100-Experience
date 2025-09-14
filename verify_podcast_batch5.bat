@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo BATCH 5: Guest Management Fields Verification
echo Fields: accepts_guest_requests, guest_requirements, typical_guest_profile, booking_link
echo ========================================
echo.

echo 1. DATABASE COLUMNS:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'podcasts' AND column_name IN ('accepts_guest_requests', 'guest_requirements', 'typical_guest_profile', 'booking_link') ORDER BY column_name;"

echo.
echo 2. SAMPLE DATA:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, accepts_guest_requests, SUBSTRING(guest_requirements, 1, 30) as requirements_preview, SUBSTRING(typical_guest_profile, 1, 30) as profile_preview, booking_link FROM podcasts WHERE id IN (SELECT id FROM podcasts ORDER BY id DESC LIMIT 2);"