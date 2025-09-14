@echo off
echo Adding remaining podcast transcription tables to PRODUCTION...
echo.

REM Run remaining CREATE TABLE statements

echo Creating podcast_episodes table...
echo CREATE TABLE IF NOT EXISTS podcast_episodes (id SERIAL PRIMARY KEY, show_id INTEGER REFERENCES podcast_shows(id), episode_number INTEGER, title VARCHAR(255) NOT NULL, description TEXT, audio_url TEXT NOT NULL, duration_seconds INTEGER, publish_date DATE, guest_names TEXT[], transcript_status VARCHAR(20) DEFAULT 'pending', file_size_mb DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

echo Creating episode_transcripts table...
echo CREATE TABLE IF NOT EXISTS episode_transcripts (id SERIAL PRIMARY KEY, episode_id INTEGER REFERENCES podcast_episodes(id), full_transcript TEXT, transcript_confidence DECIMAL(3,2), word_count INTEGER, language VARCHAR(10) DEFAULT 'en', speakers_identified INTEGER, speaker_segments JSONB, host_speaking_percentage DECIMAL(3,2), ai_summary TEXT, episode_type VARCHAR(50), key_topics TEXT[], actionable_insights JSONB, tips_and_strategies JSONB, tools_mentioned JSONB, metrics_discussed JSONB, content_depth_score DECIMAL(3,2), practical_value_score DECIMAL(3,2), audio_quality_score DECIMAL(3,2), conversation_flow_score DECIMAL(3,2), contractor_relevance_score DECIMAL(3,2), focus_area_alignment JSONB, target_audience_fit DECIMAL(3,2), transcription_time_seconds INTEGER, analysis_time_seconds INTEGER, total_tokens_used INTEGER, processing_cost_usd DECIMAL(10,4), whisper_model_used VARCHAR(50), gpt_model_used VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

echo Creating episode_highlights table...
echo CREATE TABLE IF NOT EXISTS episode_highlights (id SERIAL PRIMARY KEY, episode_id INTEGER REFERENCES podcast_episodes(id), highlight_type VARCHAR(50), timestamp_start INTEGER NOT NULL, timestamp_end INTEGER, speaker VARCHAR(100), content TEXT NOT NULL, context TEXT, importance_score DECIMAL(3,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

echo Creating podcast_topics table...
echo CREATE TABLE IF NOT EXISTS podcast_topics (id SERIAL PRIMARY KEY, topic_name VARCHAR(100) UNIQUE NOT NULL, topic_category VARCHAR(50), description TEXT, episode_count INTEGER DEFAULT 0, total_duration_minutes INTEGER DEFAULT 0, average_depth_score DECIMAL(3,2), trending_score DECIMAL(3,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

echo Creating episode_topics table...
echo CREATE TABLE IF NOT EXISTS episode_topics (id SERIAL PRIMARY KEY, episode_id INTEGER REFERENCES podcast_episodes(id), topic_id INTEGER REFERENCES podcast_topics(id), duration_seconds INTEGER, depth_score DECIMAL(3,2), timestamps JSONB, key_points JSONB, UNIQUE(episode_id, topic_id));

echo Creating podcast_guests table...
echo CREATE TABLE IF NOT EXISTS podcast_guests (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, title VARCHAR(255), company VARCHAR(255), expertise_areas TEXT[], episode_appearances INTEGER DEFAULT 1, total_insights_provided INTEGER, average_quality_score DECIMAL(3,2), linkedin_url TEXT, website TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

echo.
echo Please run these CREATE TABLE statements on production using your preferred method.
echo.
echo Also create these indexes:
echo CREATE INDEX IF NOT EXISTS idx_episode_show ON podcast_episodes(show_id);
echo CREATE INDEX IF NOT EXISTS idx_transcript_episode ON episode_transcripts(episode_id);
echo CREATE INDEX IF NOT EXISTS idx_highlights_episode ON episode_highlights(episode_id);
echo CREATE INDEX IF NOT EXISTS idx_highlights_type ON episode_highlights(highlight_type);
echo CREATE INDEX IF NOT EXISTS idx_episode_topics_lookup ON episode_topics(episode_id, topic_id);
echo CREATE INDEX IF NOT EXISTS idx_transcript_relevance ON episode_transcripts(contractor_relevance_score DESC);
echo CREATE INDEX IF NOT EXISTS idx_topics_trending ON podcast_topics(trending_score DESC);