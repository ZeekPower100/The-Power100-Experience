@echo off
set PGPASSWORD=TPXP0stgres!!
echo Updating admin password...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "UPDATE admin_users SET password='$2a$12$YK0qHzZaRnX6xL9Y8vI7XeH2qQy/XqS1QdV1OMzH16h0zXOBVo/6i' WHERE email='admin@power100.io';"
echo Admin user password reset to: admin123
pause