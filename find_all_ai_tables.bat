@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo ALL AI-RELATED TABLES (Based on actual database analysis):
echo ========================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('ai_coach_conversations', 'ai_coach_sessions', 'ai_interactions', 'ai_tagging_history', 'contractor_ai_profiles', 'ai_recommendations', 'ai_content_analysis', 'ai_event_experiences', 'ai_success_stories', 'content_tags', 'recommendation_history', 'tagged_content', 'tag_rules', 'tag_synonyms') ORDER BY table_name;"