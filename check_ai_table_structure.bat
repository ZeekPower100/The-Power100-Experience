@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Structure of ai_interactions table:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d ai_interactions"
echo.
echo ========================================
echo Structure of ai_coach_sessions table:
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d ai_coach_sessions"