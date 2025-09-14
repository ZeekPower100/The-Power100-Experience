@echo off
set PGPASSWORD=TPXP0stgres!!

echo ========================================
echo CHECKING LATEST EVENT DATA
echo ========================================
echo.

echo LATEST EVENT (ALL FIELDS):
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT id, name, event_type, date, end_date, expected_attendance, hotel_block_url, target_revenue, sponsors, pre_registered_attendees, networking_opportunities, session_recordings, post_event_support, implementation_support, follow_up_resources, poc_customer_name, poc_customer_email, poc_media_name, poc_media_email FROM events ORDER BY id DESC LIMIT 1;"