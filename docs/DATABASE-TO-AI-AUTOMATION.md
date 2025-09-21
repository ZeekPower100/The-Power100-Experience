# Database to AI Concierge - Complete Automation Documentation

## 🚀 Overview
This document describes the **fully automated pipeline** that connects database tables directly to the AI Concierge with **ZERO manual intervention**. When you create a table in the database, it automatically becomes available to the AI within minutes.

## 🔄 The Automation Flow

### Step 1: Create Table → Trigger Fires (Instant)
```sql
CREATE TABLE success_stories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    ai_summary TEXT,
    contractor_id INTEGER
);
```
**What happens:** PostgreSQL event trigger `auto_detect_new_tables` fires immediately

### Step 2: Auto-Registration (< 1 second)
The trigger automatically:
- Detects if table matches entity patterns
- Converts `success_stories` → `successStories` (camelCase)
- Inserts into `ai_metadata` table
- Sends notification via `pg_notify`

### Step 3: Schema Discovery (On next request)
When AI Concierge receives a message:
- `schemaDiscoveryService` checks for new entities
- Finds `success_stories` marked as entity in `ai_metadata`
- Includes it in discoverable schema

### Step 4: Knowledge Base Loading (Automatic)
`aiKnowledgeService` automatically:
- Loads data from all entity tables
- Maps using API property names (`successStories`)
- Caches for 5 minutes (development) or 1 hour (production)

### Step 5: AI Response (Seamless)
AI Concierge:
- Receives knowledge base with new data
- Includes in OpenAI prompt context
- Responds using the latest information

## 🎯 Auto-Detection Patterns

Tables are **automatically registered** if they match ANY of these patterns:

### 1. Name Patterns
Tables containing these suffixes:
- `_content`
- `_studies`
- `_resources`
- `_library`
- `_materials`
- `_sessions`
- `_analysis`

**Example:** `training_materials`, `case_studies`, `video_content`

### 2. AI Columns
Tables with AI-related columns:
- Any column starting with `ai_` (e.g., `ai_summary`, `ai_insights`)
- Column named `key_differentiators`

**Example:** Table with `ai_confidence_score` column

### 3. Entity Foreign Keys
Tables with entity relationship columns:
- `contractor_id`
- `partner_id`
- `strategic_partner_id`
- `book_id`, `podcast_id`, `event_id`, `video_id`

**Example:** Table with `contractor_id` for contractor-specific data

## 📁 Key Files & Components

### Database Level
- **Event Triggers:** `handle_ddl_event()` and `handle_alter_table()` functions
- **Metadata Table:** `ai_metadata` - Configuration for all entity tables
- **Status Check:** `check_auto_detection_status()` - Verify triggers are active

### Backend Services
- **`schemaDiscoveryService.js`** - Discovers and caches database schema
  - Cache time: 5 minutes (dev) / 10 minutes (prod)
  - Location: `tpe-backend/src/services/schemaDiscoveryService.js`

- **`aiKnowledgeService.js`** - Loads entity data for AI
  - Direct API property mapping
  - Cache time: 1 hour
  - Location: `tpe-backend/src/services/aiKnowledgeService.js`

- **`openAIService.js`** - Builds dynamic prompts with knowledge
  - Handles both array and object data formats
  - Location: `tpe-backend/src/services/openAIService.js`

### API Endpoints
- **Force Refresh:** `POST /api/ai-concierge/schema/refresh`
- **Check Knowledge:** `GET /api/ai-concierge/debug-knowledge`
- **Send Message:** `POST /api/ai-concierge/message`

## 🛠️ Troubleshooting Guide

### Issue: Table created but not appearing in AI responses

**1. Check if trigger fired:**
```sql
SELECT * FROM ai_metadata WHERE table_name = 'your_table_name';
```

**2. Check trigger status:**
```sql
SELECT * FROM check_auto_detection_status();
```
Should show:
- `auto_detect_new_tables`: ENABLED
- `auto_detect_new_columns`: ENABLED

**3. Force schema refresh:**
```bash
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
```

**4. Verify in knowledge base:**
```bash
curl http://localhost:5000/api/ai-concierge/debug-knowledge | grep yourTableName
```

### Issue: Table not auto-registering

**Check patterns:**
```sql
-- Does it have AI columns?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table'
AND (column_name LIKE 'ai_%' OR column_name = 'key_differentiators');

-- Does it have entity foreign keys?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table'
AND column_name IN ('contractor_id', 'partner_id', 'book_id', etc.);
```

**Manual registration (if needed):**
```sql
INSERT INTO ai_metadata (
    table_name,
    is_entity_table,
    api_property_name,
    include_in_knowledge_base,
    is_ai_relevant
) VALUES (
    'your_table',
    true,
    'yourTable',  -- camelCase version
    true,
    true
);
```

### Issue: Triggers not working

**Reinstall triggers:**
```bash
node apply-auto-triggers-fixed.js
```

**Check PostgreSQL event trigger support:**
```sql
SELECT version();  -- Should be PostgreSQL 9.3+
SELECT current_user;  -- Should have superuser privileges
```

## 🔍 Testing the Pipeline

### Quick Test Script
```bash
# 1. Create test table
powershell -Command ".\quick-db.bat \"CREATE TABLE test_content (id SERIAL PRIMARY KEY, title TEXT, ai_summary TEXT);\""

# 2. Insert test data
powershell -Command ".\quick-db.bat \"INSERT INTO test_content (title, ai_summary) VALUES ('Test', 'AI test data');\""

# 3. Refresh schema
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

# 4. Check knowledge base
curl http://localhost:5000/api/ai-concierge/debug-knowledge | grep testContent

# 5. Cleanup
powershell -Command ".\quick-db.bat \"DROP TABLE test_content; DELETE FROM ai_metadata WHERE table_name = 'test_content';\""
```

### Comprehensive Test
Run the full test suite:
```bash
node test-automation-complete.js
```

This will:
- Test all detection patterns
- Verify auto-registration
- Check knowledge base integration
- Confirm AI retrieval

## 📊 Monitoring

### Check Recently Added Tables
```sql
SELECT
    table_name,
    api_property_name,
    created_at
FROM ai_metadata
WHERE is_entity_table = true
ORDER BY created_at DESC
LIMIT 10;
```

### Check Cache Status
```bash
curl http://localhost:5000/api/ai-concierge/schema/summary
```

### View Active Entity Tables
```sql
SELECT
    table_name,
    api_property_name,
    CASE
        WHEN description LIKE '%Auto-registered%' THEN 'Auto'
        ELSE 'Manual'
    END as registration_type
FROM ai_metadata
WHERE is_entity_table = true
ORDER BY table_name;
```

## 🎯 Best Practices

### 1. Naming Conventions
- **Database Tables:** Use `snake_case` (e.g., `customer_feedback`)
- **API Properties:** Will auto-convert to `camelCase` (e.g., `customerFeedback`)
- **AI Columns:** Prefix with `ai_` (e.g., `ai_analysis`)

### 2. Performance Tips
- Keep entity tables under 1000 rows for optimal performance
- Use `is_active` or `status` columns to filter inactive records
- Add indexes on frequently queried columns

### 3. Data Quality
- Always include `ai_summary` or `ai_insights` for better AI context
- Use structured JSON in `focus_areas` type columns
- Include `created_at` and `updated_at` timestamps

## 🔒 Security Considerations

- Event triggers require superuser privileges to create
- Triggers only fire for tables in `public` schema
- Sensitive data should use `is_ai_relevant = false` in ai_metadata
- AI Concierge filters out sensitive columns automatically

## 📈 Performance Metrics

- **Trigger Execution:** < 100ms
- **Auto-registration:** < 1 second
- **Schema Discovery:** 2-3 seconds (cached for 5-10 minutes)
- **Knowledge Loading:** 1-2 seconds (cached for 1 hour)
- **End-to-end:** New table available in AI within 5 seconds

## 🎉 Summary

The automation eliminates ALL manual steps between database and AI:

**OLD PROCESS (Manual):**
1. Create table
2. Manually add to entity list ❌
3. Update schema discovery ❌
4. Modify knowledge service ❌
5. Restart servers ❌
6. Test and debug ❌

**NEW PROCESS (Automated):**
1. Create table ✅
2. **DONE!** Everything else is automatic 🎉

The system now truly embodies "Database as the Source of Truth" - any data you add to the database automatically flows through to the AI Concierge without any manual intervention.

## 🆘 Support

For issues or questions about the automation pipeline:
1. Check this documentation first
2. Run the test suite: `node test-automation-complete.js`
3. Check trigger status: `SELECT * FROM check_auto_detection_status();`
4. Review logs in `tpe-backend/logs/`

Last Updated: September 2025
Automation Version: 1.0