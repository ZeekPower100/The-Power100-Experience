-- =====================================================
-- AI Enhancement Migration for TPX Database
-- Purpose: Add AI-specific fields for personalized recommendations
-- =====================================================

-- 1. ENHANCE CONTRACTORS TABLE WITH AI FIELDS
-- =====================================================
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER DEFAULT 0 CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS churn_risk INTEGER DEFAULT 0 CHECK (churn_risk >= 0 AND churn_risk <= 100);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS growth_potential INTEGER DEFAULT 50 CHECK (growth_potential >= 0 AND growth_potential <= 100);
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS next_best_action TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) DEFAULT 'onboarding' CHECK (lifecycle_stage IN ('onboarding', 'active', 'power_user', 'at_risk', 'churned'));

-- AI Behavioral Data (JSON for flexibility)
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{
  "channels": ["email"],
  "frequency": "weekly",
  "best_times": ["morning"],
  "time_zone": "America/New_York"
}'::jsonb;

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS learning_preferences JSONB DEFAULT '{
  "content_type": ["text"],
  "session_length": "medium",
  "depth": "detailed"
}'::jsonb;

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS business_goals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS current_challenges JSONB DEFAULT '[]'::jsonb;

-- 2. ENHANCE STRATEGIC PARTNERS TABLE WITH AI FIELDS
-- =====================================================
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER DEFAULT 0 CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100);
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS ai_relevance_scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS total_recommendations INTEGER DEFAULT 0;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS positive_outcomes INTEGER DEFAULT 0;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS success_stories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS implementation_difficulty VARCHAR(20) DEFAULT 'moderate' CHECK (implementation_difficulty IN ('easy', 'moderate', 'complex'));
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS time_to_value VARCHAR(50) DEFAULT '1 month';
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS last_ai_analysis TIMESTAMP;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER DEFAULT 0 CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100);
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT false;
ALTER TABLE strategic_partners ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed'));

-- 3. ENHANCE BOOKS TABLE WITH AI FIELDS
-- =====================================================
ALTER TABLE books ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS actionable_ratio DECIMAL(5,2);
ALTER TABLE books ADD COLUMN IF NOT EXISTS implementation_guides JSONB DEFAULT '[]'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2);
ALTER TABLE books ADD COLUMN IF NOT EXISTS prerequisite_knowledge TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS companion_resources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS chapter_summaries JSONB DEFAULT '{}'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS key_concepts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS related_entities JSONB DEFAULT '{
  "books": [],
  "podcasts": [],
  "events": [],
  "partners": []
}'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS engagement_metrics JSONB DEFAULT '{
  "views": 0,
  "recommendations": 0,
  "completions": 0,
  "feedback": []
}'::jsonb;

-- 4. ENHANCE EVENTS TABLE WITH AI FIELDS
-- =====================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS historical_attendance JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS post_event_support TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS implementation_support BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS roi_tracking JSONB DEFAULT '{}'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS networking_opportunities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS speaker_credentials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS session_recordings BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS follow_up_resources JSONB DEFAULT '[]'::jsonb;

-- 5. ENHANCE PODCASTS TABLE WITH AI FIELDS
-- =====================================================
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS episode_transcripts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS actionable_insights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS guest_credentials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS episode_consistency DECIMAL(5,2);
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS community_engagement INTEGER DEFAULT 0;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS topic_depth_analysis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS implementation_examples JSONB DEFAULT '[]'::jsonb;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS roi_discussions JSONB DEFAULT '[]'::jsonb;

-- 6. CREATE AI INTERACTION TRACKING TABLES
-- =====================================================

-- AI Interactions Table
CREATE TABLE IF NOT EXISTS ai_interactions (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  helpful BOOLEAN,
  action_taken TEXT,
  outcome TEXT,
  session_id UUID,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommendation History Table
CREATE TABLE IF NOT EXISTS recommendation_history (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('partner', 'book', 'podcast', 'event')),
  entity_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  engagement VARCHAR(20) CHECK (engagement IN ('ignored', 'viewed', 'clicked', 'completed')),
  feedback TEXT,
  outcome TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Engagement Metrics Table
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER,
  device_type VARCHAR(50),
  source VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Feedback Loops Table
CREATE TABLE IF NOT EXISTS feedback_loops (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('rating', 'comment', 'success_story', 'complaint')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  success_metrics JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT false
);

-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_contractors_ai_tags ON contractors USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS idx_contractors_lifecycle ON contractors (lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_contractors_engagement ON contractors (engagement_score);

CREATE INDEX IF NOT EXISTS idx_partners_ai_tags ON strategic_partners USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS idx_partners_relevance ON strategic_partners USING GIN (ai_relevance_scores);

CREATE INDEX IF NOT EXISTS idx_books_ai_tags ON books USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS idx_books_related ON books USING GIN (related_entities);

CREATE INDEX IF NOT EXISTS idx_events_ai_tags ON events USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS idx_podcasts_ai_tags ON podcasts USING GIN (ai_tags);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_contractor ON ai_interactions (contractor_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_contractor ON recommendation_history (contractor_id);
CREATE INDEX IF NOT EXISTS idx_engagement_contractor ON engagement_metrics (contractor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_contractor ON feedback_loops (contractor_id);

-- 8. CREATE VECTOR EMBEDDINGS TABLE (for semantic search)
-- =====================================================
CREATE TABLE IF NOT EXISTS entity_embeddings (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  embedding_type VARCHAR(50) NOT NULL DEFAULT 'description',
  embedding FLOAT8[], -- Will store OpenAI embeddings
  model_version VARCHAR(50) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, embedding_type)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON entity_embeddings (entity_type, entity_id);

-- 9. ADD TRIGGER FOR UPDATED_AT TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contractors_updated_at') THEN
    CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_books_updated_at') THEN
    CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
    CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_podcasts_updated_at') THEN
    CREATE TRIGGER update_podcasts_updated_at BEFORE UPDATE ON podcasts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 10. SAMPLE DATA STRUCTURE FOR AI FIELDS
-- =====================================================
COMMENT ON COLUMN contractors.business_goals IS 'JSON array of goals: [{goal, timeline, priority, current_progress}]';
COMMENT ON COLUMN contractors.current_challenges IS 'JSON array: [{challenge, severity, attempted_solutions, open_to_solutions}]';
COMMENT ON COLUMN strategic_partners.ai_relevance_scores IS 'JSON object: {focus_area: score} mapping';
COMMENT ON COLUMN books.chapter_summaries IS 'JSON object: {chapter_number: {title, summary, key_points}}';
COMMENT ON TABLE entity_embeddings IS 'Stores vector embeddings for semantic search powered by OpenAI';

-- =====================================================
-- Migration Complete!
-- Next Steps:
-- 1. Run this migration
-- 2. Update API endpoints to populate AI fields
-- 3. Implement OpenAI integration for embeddings
-- 4. Build recommendation engine
-- 5. Create feedback collection mechanisms
-- =====================================================