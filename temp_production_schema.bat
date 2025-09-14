@echo off
set PGPASSWORD=dBP0wer100!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -p 5432 -t -c "SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'books' ORDER BY ordinal_position"