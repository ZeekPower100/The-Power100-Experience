@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Creating AI Behavioral Tracking Tables...
echo ========================================

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE TABLE IF NOT EXISTS contractor_ai_profiles (id SERIAL PRIMARY KEY, contractor_id INTEGER REFERENCES contractors(id) UNIQUE, preferred_channels JSONB DEFAULT '[\"email\", \"sms\"]', communication_frequency VARCHAR(20) DEFAULT 'weekly', best_contact_times JSONB DEFAULT '[\"morning\", \"afternoon\"]', timezone VARCHAR(50) DEFAULT 'America/New_York', content_types JSONB DEFAULT '[\"video\", \"text\"]', session_length VARCHAR(20) DEFAULT 'short', learning_depth VARCHAR(20) DEFAULT 'detailed', business_goals JSONB DEFAULT '[]', current_challenges JSONB DEFAULT '[]', engagement_score DECIMAL(5,2) DEFAULT 50.00, churn_risk DECIMAL(5,2) DEFAULT 50.00, growth_potential DECIMAL(5,2) DEFAULT 50.00, lifecycle_stage VARCHAR(20) DEFAULT 'onboarding', next_best_action TEXT, last_interaction TIMESTAMP, total_interactions INTEGER DEFAULT 0, successful_recommendations INTEGER DEFAULT 0, total_recommendations INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo.
echo Created contractor_ai_profiles table
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE TABLE IF NOT EXISTS ai_recommendations (id SERIAL PRIMARY KEY, contractor_id INTEGER REFERENCES contractors(id), entity_type VARCHAR(50), entity_id INTEGER, recommendation_reason TEXT, ai_confidence_score DECIMAL(3,2), trigger_event VARCHAR(100), business_context JSONB, presented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, engagement_status VARCHAR(20) DEFAULT 'presented', engaged_at TIMESTAMP, feedback_rating INTEGER, feedback_text TEXT, outcome TEXT, revenue_impact DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo.
echo Created ai_recommendations table
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE TABLE IF NOT EXISTS ai_content_analysis (id SERIAL PRIMARY KEY, entity_type VARCHAR(50), entity_id INTEGER, content_type VARCHAR(50), content_url TEXT, ai_summary TEXT, ai_tags JSONB DEFAULT '[]', ai_insights JSONB DEFAULT '[]', ai_quality_score DECIMAL(5,2), relevance_scores JSONB DEFAULT '{}', mentioned_entities JSONB DEFAULT '[]', key_topics JSONB DEFAULT '[]', sentiment_analysis JSONB DEFAULT '{}', implementation_difficulty VARCHAR(20), time_to_value VARCHAR(50), investment_required JSONB, processing_status VARCHAR(20) DEFAULT 'pending', processing_model VARCHAR(50), processing_time_ms INTEGER, error_message TEXT, requires_human_review BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_ai_analysis TIMESTAMP);"

echo.
echo Created ai_content_analysis table
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE TABLE IF NOT EXISTS ai_event_experiences (id SERIAL PRIMARY KEY, event_id INTEGER REFERENCES events(id), contractor_id INTEGER REFERENCES contractors(id), profile_completed BOOLEAN DEFAULT false, custom_agenda JSONB, recommended_speakers JSONB DEFAULT '[]', recommended_sponsors JSONB DEFAULT '[]', prepared_questions JSONB DEFAULT '[]', sessions_attended JSONB DEFAULT '[]', speaker_alerts_sent INTEGER DEFAULT 0, notes_captured JSONB DEFAULT '[]', sponsor_visits JSONB DEFAULT '[]', real_time_insights JSONB DEFAULT '[]', speaker_ratings JSONB DEFAULT '{}', event_summary TEXT, key_takeaways JSONB DEFAULT '[]', action_items JSONB DEFAULT '[]', follow_up_connections JSONB DEFAULT '[]', engagement_score DECIMAL(5,2), value_received VARCHAR(20), would_recommend BOOLEAN, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo.
echo Created ai_event_experiences table
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE TABLE IF NOT EXISTS ai_success_stories (id SERIAL PRIMARY KEY, contractor_id INTEGER REFERENCES contractors(id), story_type VARCHAR(50), title VARCHAR(255), description TEXT, metrics_before JSONB, metrics_after JSONB, timeframe VARCHAR(50), roi_percentage DECIMAL(10,2), related_partners JSONB DEFAULT '[]', related_books JSONB DEFAULT '[]', related_podcasts JSONB DEFAULT '[]', related_events JSONB DEFAULT '[]', verified BOOLEAN DEFAULT false, verification_method VARCHAR(100), testimonial_video_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo.
echo Created ai_success_stories table
echo.
echo ========================================
echo All AI Behavioral Tracking tables created successfully!
echo ========================================