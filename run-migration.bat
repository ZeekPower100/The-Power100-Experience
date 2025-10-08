@echo off
set PGPASSWORD=TPXP0stgres!!
psql -h localhost -U postgres -d tpedb -f tpe-backend\migrations\add-post-event-action-tracking.sql
pause
