# 🤖 AI Tables Production Migration Guide
*Complete list of AI tables, columns, and migration scripts for production deployment*

---

## 🔍 How to Find AI Tables in Database

### IMPORTANT: Finding AI Tables Reliably

**Problem**: Searching for `%ai%` or `%interaction%` returns 0 results because of SQL pattern matching quirks.
**Solution**: AI tables follow these naming patterns:

1. **Tables starting with `ai_`** (8 tables)
   - ai_coach_conversations
   - ai_coach_sessions
   - ai_content_analysis
   - ai_event_experiences
   - ai_interactions
   - ai_recommendations
   - ai_success_stories
   - ai_tagging_history

2. **Tables starting with `contractor_ai_`** (1 table)
   - contractor_ai_profiles

3. **Tag-related tables** (5 tables)
   - content_tags
   - tagged_content
   - tag_rules
   - tag_synonyms
   - recommendation_history

### Reliable Search Query:
```sql
-- This ALWAYS works to find all AI tables:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE 'ai\_%' ESCAPE '\'  -- Tables starting with 'ai_'
    OR table_name LIKE 'contractor\_ai\_%' ESCAPE '\'  -- Tables starting with 'contractor_ai_'
    OR table_name LIKE '%tag%'  -- Tag-related tables
    OR table_name = 'recommendation_history'  -- Specific AI table
)
ORDER BY table_name;
```

### For Batch Files:
```batch
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE 'ai_%%' OR table_name LIKE 'contractor_ai_%%' OR table_name LIKE '%%tag%%' OR table_name = 'recommendation_history') ORDER BY table_name;"
```

---

## 📋 Migration Checklist

### Tables to Migrate (New):
- [ ] contractor_ai_profiles
- [ ] ai_recommendations
- [ ] ai_content_analysis
- [ ] ai_event_experiences
- [ ] ai_success_stories

### Already Existing (Verify First):
- [ ] ai_interactions
- [ ] ai_coach_sessions
- [ ] ai_coach_conversations
- [ ] ai_tagging_history
- [ ] content_tags
- [ ] tagged_content
- [ ] tag_rules
- [ ] tag_synonyms
- [ ] recommendation_history

---

## 📊 Table Schemas for Production

### 1. contractor_ai_profiles
**Purpose**: Store behavioral profiles and preferences for each contractor

```sql
CREATE TABLE IF NOT EXISTS contractor_ai_profiles (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) UNIQUE,

  -- Communication Preferences
  preferred_channels JSONB DEFAULT '["email", "sms"]',
  communication_frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, bi_weekly, monthly
  best_contact_times JSONB DEFAULT '["morning", "afternoon"]',
  timezone VARCHAR(50) DEFAULT 'America/New_York',

  -- Learning Preferences
  content_types JSONB DEFAULT '["video", "text"]', -- video, audio, text, interactive
  session_length VARCHAR(20) DEFAULT 'short', -- micro, short, medium, long
  learning_depth VARCHAR(20) DEFAULT 'detailed', -- summary, detailed, comprehensive

  -- Business Context
  business_goals JSONB DEFAULT '[]', -- Array of {goal, timeline, priority, progress}
  current_challenges JSONB DEFAULT '[]', -- Array of {challenge, severity, attempted_solutions}

  -- AI Metrics
  engagement_score DECIMAL(5,2) DEFAULT 50.00, -- 0-100
  churn_risk DECIMAL(5,2) DEFAULT 50.00, -- 0-100
  growth_potential DECIMAL(5,2) DEFAULT 50.00, -- 0-100
  lifecycle_stage VARCHAR(20) DEFAULT 'onboarding', -- onboarding, active, power_user, at_risk, churned
  next_best_action TEXT,

  -- Metadata
  last_interaction TIMESTAMP,
  total_interactions INTEGER DEFAULT 0,
  successful_recommendations INTEGER DEFAULT 0,
  total_recommendations INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_contractor_ai_profiles_contractor ON contractor_ai_profiles(contractor_id);
CREATE INDEX idx_contractor_ai_profiles_lifecycle ON contractor_ai_profiles(lifecycle_stage);
```

### 2. ai_recommendations
**Purpose**: Track all AI-generated recommendations and their outcomes

```sql
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id),

  -- What was recommended
  entity_type VARCHAR(50), -- partner, book, podcast, event
  entity_id INTEGER,
  recommendation_reason TEXT,
  ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  -- Context
  trigger_event VARCHAR(100), -- What prompted this recommendation
  business_context JSONB, -- Contractor's state when recommended

  -- Engagement tracking
  presented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  engagement_status VARCHAR(20) DEFAULT 'presented', -- presented, viewed, clicked, completed, dismissed
  engaged_at TIMESTAMP,

  -- Feedback
  feedback_rating INTEGER, -- 1-5 stars
  feedback_text TEXT,
  outcome TEXT,
  revenue_impact DECIMAL(10,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ai_recommendations_contractor ON ai_recommendations(contractor_id);
CREATE INDEX idx_ai_recommendations_entity ON ai_recommendations(entity_type, entity_id);
CREATE INDEX idx_ai_recommendations_status ON ai_recommendations(engagement_status);
CREATE INDEX idx_ai_recommendations_presented ON ai_recommendations(presented_at DESC);
```

### 3. ai_content_analysis
**Purpose**: Store AI analysis results for all content (videos, podcasts, books, events)

```sql
CREATE TABLE IF NOT EXISTS ai_content_analysis (
  id SERIAL PRIMARY KEY,

  -- Content identification
  entity_type VARCHAR(50), -- partner, book, podcast, event
  entity_id INTEGER,
  content_type VARCHAR(50), -- video, audio, text, image
  content_url TEXT,

  -- AI Analysis Results
  ai_summary TEXT,
  ai_tags JSONB DEFAULT '[]',
  ai_insights JSONB DEFAULT '[]', -- Actionable insights extracted
  ai_quality_score DECIMAL(5,2), -- 0-100

  -- Relevance scoring per focus area
  relevance_scores JSONB DEFAULT '{}', -- {focus_area: score}

  -- Extracted entities and topics
  mentioned_entities JSONB DEFAULT '[]', -- People, companies, products mentioned
  key_topics JSONB DEFAULT '[]',
  sentiment_analysis JSONB DEFAULT '{}',

  -- ROI and Implementation
  implementation_difficulty VARCHAR(20), -- easy, moderate, complex
  time_to_value VARCHAR(50), -- immediate, 1_week, 1_month, 3_months
  investment_required JSONB, -- {min: 0, max: 5000, type: 'money|time|resources'}

  -- Processing metadata
  processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  processing_model VARCHAR(50), -- gpt-4, whisper, vision
  processing_time_ms INTEGER,
  error_message TEXT,
  requires_human_review BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_ai_analysis TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ai_content_entity ON ai_content_analysis(entity_type, entity_id);
CREATE INDEX idx_ai_content_status ON ai_content_analysis(processing_status);
CREATE INDEX idx_ai_content_quality ON ai_content_analysis(ai_quality_score DESC);
```

### 4. ai_event_experiences
**Purpose**: Track AI-orchestrated event experiences (Greg's vision)

```sql
CREATE TABLE IF NOT EXISTS ai_event_experiences (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  contractor_id INTEGER REFERENCES contractors(id),

  -- Pre-Event
  profile_completed BOOLEAN DEFAULT false,
  custom_agenda JSONB, -- Personalized speaker/sponsor recommendations
  recommended_speakers JSONB DEFAULT '[]',
  recommended_sponsors JSONB DEFAULT '[]',
  prepared_questions JSONB DEFAULT '[]',

  -- During Event
  sessions_attended JSONB DEFAULT '[]', -- Array of session IDs with timestamps
  speaker_alerts_sent INTEGER DEFAULT 0,
  notes_captured JSONB DEFAULT '[]', -- SMS notes with timestamps
  sponsor_visits JSONB DEFAULT '[]',
  real_time_insights JSONB DEFAULT '[]',

  -- Post-Event
  speaker_ratings JSONB DEFAULT '{}', -- {speaker_id: rating}
  event_summary TEXT,
  key_takeaways JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  follow_up_connections JSONB DEFAULT '[]',

  -- Analytics
  engagement_score DECIMAL(5,2), -- 0-100
  value_received VARCHAR(20), -- low, medium, high, exceptional
  would_recommend BOOLEAN,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ai_event_exp_event ON ai_event_experiences(event_id);
CREATE INDEX idx_ai_event_exp_contractor ON ai_event_experiences(contractor_id);
CREATE UNIQUE INDEX idx_ai_event_exp_unique ON ai_event_experiences(event_id, contractor_id);
```

### 5. ai_success_stories
**Purpose**: Track and validate contractor success stories with metrics

```sql
CREATE TABLE IF NOT EXISTS ai_success_stories (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id),

  -- Story details
  story_type VARCHAR(50), -- partner_success, implementation, growth, transformation
  title VARCHAR(255),
  description TEXT,

  -- Metrics
  metrics_before JSONB, -- {revenue: X, team_size: Y, etc}
  metrics_after JSONB,
  timeframe VARCHAR(50), -- 30_days, 90_days, 6_months, 1_year
  roi_percentage DECIMAL(10,2),

  -- Related entities
  related_partners JSONB DEFAULT '[]',
  related_books JSONB DEFAULT '[]',
  related_podcasts JSONB DEFAULT '[]',
  related_events JSONB DEFAULT '[]',

  -- Validation
  verified BOOLEAN DEFAULT false,
  verification_method VARCHAR(100),
  testimonial_video_url TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ai_success_contractor ON ai_success_stories(contractor_id);
CREATE INDEX idx_ai_success_verified ON ai_success_stories(verified);
CREATE INDEX idx_ai_success_roi ON ai_success_stories(roi_percentage DESC);
```

---

## 🚀 Production Migration Script

### Complete Migration SQL File
Save this as `migrate_ai_tables_to_production.sql`:

```sql
-- AI Tables Migration Script for Production
-- Run this on production database: tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com

BEGIN;

-- 1. Create contractor_ai_profiles
CREATE TABLE IF NOT EXISTS contractor_ai_profiles (
  [... full schema from above ...]
);

-- 2. Create ai_recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
  [... full schema from above ...]
);

-- 3. Create ai_content_analysis
CREATE TABLE IF NOT EXISTS ai_content_analysis (
  [... full schema from above ...]
);

-- 4. Create ai_event_experiences
CREATE TABLE IF NOT EXISTS ai_event_experiences (
  [... full schema from above ...]
);

-- 5. Create ai_success_stories
CREATE TABLE IF NOT EXISTS ai_success_stories (
  [... full schema from above ...]
);

-- Create all indexes
[... all CREATE INDEX statements from above ...]

-- Add update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contractor_ai_profiles_updated_at
  BEFORE UPDATE ON contractor_ai_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_recommendations_updated_at
  BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_content_analysis_updated_at
  BEFORE UPDATE ON ai_content_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_event_experiences_updated_at
  BEFORE UPDATE ON ai_event_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_success_stories_updated_at
  BEFORE UPDATE ON ai_success_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

## 📝 Production Migration Commands

### 🔴 IMPORTANT: Production Database Connection via MCP

**CLAUDE: You have MCP (Model Context Protocol) access to production!**
Use the `mcp__aws-production__exec` tool to run commands on the production server.

### Test Connection First (ALWAYS DO THIS):
```javascript
// Claude should ALWAYS test the connection first:
mcp__aws-production__exec({
  command: "PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c 'SELECT current_database(), current_user, version();'"
})
```

### Method 1: Using MCP Tool (RECOMMENDED - What Claude Should Use)
```javascript
// Claude can execute this directly:
mcp__aws-production__exec({
  command: "PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -f /path/to/migrate_ai_tables_to_production.sql"
})

// Or for individual queries:
mcp__aws-production__exec({
  command: "PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c 'SELECT COUNT(*) FROM contractors;'"
})
```

### Method 2: Direct Connection Details (Manual Access)
**Production Database:**
- **Host**: tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com
- **Database**: tpedb
- **User**: tpeadmin
- **Password**: dBP0wer100!!
- **Port**: 5432
- **SSL**: Required

### For Windows (Manual):
```batch
@echo off
set PGPASSWORD=dBP0wer100!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -f migrate_ai_tables_to_production.sql
```

### For Linux/Mac (Manual):
```bash
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -f migrate_ai_tables_to_production.sql
```

---

## ✅ Verification Queries

After migration, run these to verify:

```sql
-- Check all AI tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%ai_%'
ORDER BY table_name;

-- Check row counts
SELECT
  'contractor_ai_profiles' as table_name, COUNT(*) as row_count FROM contractor_ai_profiles
UNION ALL
SELECT 'ai_recommendations', COUNT(*) FROM ai_recommendations
UNION ALL
SELECT 'ai_content_analysis', COUNT(*) FROM ai_content_analysis
UNION ALL
SELECT 'ai_event_experiences', COUNT(*) FROM ai_event_experiences
UNION ALL
SELECT 'ai_success_stories', COUNT(*) FROM ai_success_stories;
```

---

## 📅 Migration Log

| Date | Environment | Tables Migrated | Status | Notes |
|------|------------|-----------------|--------|--------|
| 2025-09-13 | Local Dev | All 5 tables | ✅ Complete | Initial creation |
| TBD | Production | Pending | ⏳ Pending | Awaiting deployment |

---

## 🔄 Rollback Script

If needed, to rollback:

```sql
-- CAUTION: This will delete all AI data!
DROP TABLE IF EXISTS ai_success_stories CASCADE;
DROP TABLE IF EXISTS ai_event_experiences CASCADE;
DROP TABLE IF EXISTS ai_content_analysis CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS contractor_ai_profiles CASCADE;
```

---

## 📌 Important Notes

1. **Foreign Key Dependencies**: These tables reference `contractors` and `events` tables - ensure those exist in production
2. **JSONB Columns**: PostgreSQL-specific, ensure production is PostgreSQL 9.4+
3. **Indexes**: Critical for performance with large datasets
4. **Triggers**: Auto-update `updated_at` timestamps
5. **Migration Order**: Tables must be created in the order listed due to foreign key constraints

---

*Last Updated: September 13, 2025*
*Version: 1.0*
*Status: Ready for Production Migration*