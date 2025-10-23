# Phase 3 Pre-Flight Checklist: Proactive Behavior & Evolution
**Last Updated**: January 2025
**Phase**: 3 of 3 - Proactive Behavior & Evolution

---

## 🎯 Purpose of This Checklist

**CRITICAL**: This checklist MUST be completed BEFORE writing ANY code for Phase 3 implementation.

Phase 3 introduces AI-initiated conversations, strategic question asking, follow-up scheduling, goal evolution, and trust-building systems. This phase has **4 NEW TABLES** with complex constraints and relationships that MUST be verified before coding.

**Why This Matters**:
- ❌ Assuming field names = Bugs, failed inserts, wasted time
- ✅ Verifying field names = Clean code, working features, fast development

---

## 📋 Pre-Flight Verification Steps

### Step 1: Identify Database Tables Involved

Phase 3 introduces **4 NEW TABLES**:

1. **`ai_proactive_messages`** - AI-initiated messages and outcomes
2. **`ai_question_log`** - Strategic questions and success rates
3. **`ai_goal_evolution_log`** - Goal evolution tracking
4. **`ai_trust_indicators`** - Trust-building moments

**Existing Tables Referenced**:
- `contractors` (foreign key relationships)
- `contractor_goals` (foreign key relationships)
- `business_growth_patterns` (referenced for context)

---

### Step 2: Verify Column Names

**NEVER assume field names. ALWAYS verify with these commands:**

#### 2.1 Verify ai_proactive_messages Table
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'ai_proactive_messages' ORDER BY ordinal_position;\""
```

**Expected Fields** (verify these exactly):
- `id` (INTEGER, PRIMARY KEY)
- `contractor_id` (INTEGER, FOREIGN KEY → contractors.id)
- `message_type` (TEXT with CHECK constraint)
- `message_content` (TEXT)
- `ai_reasoning` (TEXT)
- `context_data` (JSONB)
- `sent_at` (TIMESTAMP)
- `contractor_response` (TEXT, nullable)
- `response_received_at` (TIMESTAMP, nullable)
- `conversation_continued` (BOOLEAN)
- `outcome_rating` (INTEGER 1-5, nullable)
- `led_to_action` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Critical Constraints to Verify**:
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_proactive_messages'::regclass;\""
```

Expected CHECK constraint:
```sql
CHECK (message_type IN ('check_in', 'milestone_follow_up', 'resource_suggestion', 'encouragement', 'course_correction', 'celebration'))
```

Expected CHECK constraint:
```sql
CHECK (outcome_rating >= 1 AND outcome_rating <= 5)
```

---

#### 2.2 Verify ai_question_log Table
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'ai_question_log' ORDER BY ordinal_position;\""
```

**Expected Fields** (verify these exactly):
- `id` (INTEGER, PRIMARY KEY)
- `contractor_id` (INTEGER, FOREIGN KEY → contractors.id)
- `goal_id` (INTEGER, FOREIGN KEY → contractor_goals.id, nullable)
- `question_text` (TEXT)
- `question_purpose` (TEXT)
- `question_type` (TEXT with CHECK constraint)
- `asked_at` (TIMESTAMP)
- `contractor_answer` (TEXT, nullable)
- `answer_received_at` (TIMESTAMP, nullable)
- `answer_quality_score` (INTEGER 1-5, nullable)
- `led_to_goal_refinement` (BOOLEAN)
- `question_naturalness_score` (INTEGER 1-5)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Critical Constraints to Verify**:
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_question_log'::regclass;\""
```

Expected CHECK constraint:
```sql
CHECK (question_type IN ('clarifying', 'exploratory', 'validating', 'prioritizing', 'reflecting'))
```

Expected CHECK constraint:
```sql
CHECK (answer_quality_score >= 1 AND answer_quality_score <= 5)
```

Expected CHECK constraint:
```sql
CHECK (question_naturalness_score >= 1 AND question_naturalness_score <= 5)
```

---

#### 2.3 Verify ai_goal_evolution_log Table
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'ai_goal_evolution_log' ORDER BY ordinal_position;\""
```

**Expected Fields** (verify these exactly):
- `id` (INTEGER, PRIMARY KEY)
- `goal_id` (INTEGER, FOREIGN KEY → contractor_goals.id)
- `contractor_id` (INTEGER, FOREIGN KEY → contractors.id)
- `evolution_type` (TEXT with CHECK constraint)
- `original_description` (TEXT)
- `evolved_description` (TEXT)
- `original_milestones` (JSONB, nullable)
- `evolved_milestones` (JSONB, nullable)
- `reason_for_evolution` (TEXT)
- `ai_confidence_in_change` (DECIMAL 0-1)
- `contractor_approved` (BOOLEAN)
- `goal_relevance_score` (INTEGER 1-10)
- `evolved_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Critical Constraints to Verify**:
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_goal_evolution_log'::regclass;\""
```

Expected CHECK constraint:
```sql
CHECK (evolution_type IN ('refinement', 'expansion', 'pivot', 'milestone_adjustment', 'priority_change', 'goal_completion'))
```

Expected CHECK constraint:
```sql
CHECK (ai_confidence_in_change >= 0 AND ai_confidence_in_change <= 1)
```

Expected CHECK constraint:
```sql
CHECK (goal_relevance_score >= 1 AND goal_relevance_score <= 10)
```

---

#### 2.4 Verify ai_trust_indicators Table
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'ai_trust_indicators' ORDER BY ordinal_position;\""
```

**Expected Fields** (verify these exactly):
- `id` (INTEGER, PRIMARY KEY)
- `contractor_id` (INTEGER, FOREIGN KEY → contractors.id)
- `indicator_type` (TEXT with CHECK constraint)
- `indicator_description` (TEXT)
- `context_data` (JSONB, nullable)
- `confidence_impact` (INTEGER -10 to +10)
- `cumulative_trust_score` (DECIMAL 0-100)
- `recorded_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Critical Constraints to Verify**:
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_trust_indicators'::regclass;\""
```

Expected CHECK constraint:
```sql
CHECK (indicator_type IN ('positive_feedback', 'negative_feedback', 'ignored_suggestion', 'acted_on_suggestion', 'shared_vulnerability', 'asked_for_help', 'milestone_achieved', 'setback_shared'))
```

Expected CHECK constraint:
```sql
CHECK (confidence_impact >= -10 AND confidence_impact <= 10)
```

Expected CHECK constraint:
```sql
CHECK (cumulative_trust_score >= 0 AND cumulative_trust_score <= 100)
```

---

### Step 3: Verify Foreign Key Constraints

**All 4 tables have foreign key relationships that CASCADE delete:**

```bash
powershell -Command ".\quick-db.bat \"SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name, rc.delete_rule FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('ai_proactive_messages', 'ai_question_log', 'ai_goal_evolution_log', 'ai_trust_indicators');\""
```

**Expected Foreign Keys**:

| Table | Column | References | Delete Rule |
|-------|--------|-----------|-------------|
| ai_proactive_messages | contractor_id | contractors.id | CASCADE |
| ai_question_log | contractor_id | contractors.id | CASCADE |
| ai_question_log | goal_id | contractor_goals.id | CASCADE |
| ai_goal_evolution_log | contractor_id | contractors.id | CASCADE |
| ai_goal_evolution_log | goal_id | contractor_goals.id | CASCADE |
| ai_trust_indicators | contractor_id | contractors.id | CASCADE |

**Why This Matters**: When a contractor or goal is deleted, all related Phase 3 data is automatically cleaned up.

---

### Step 4: Verify Indexes

**Performance-critical indexes for Phase 3:**

```bash
powershell -Command ".\quick-db.bat \"SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('ai_proactive_messages', 'ai_question_log', 'ai_goal_evolution_log', 'ai_trust_indicators') ORDER BY tablename, indexname;\""
```

**Expected Indexes**:
- `idx_ai_proactive_messages_contractor` on ai_proactive_messages(contractor_id)
- `idx_ai_proactive_messages_sent_at` on ai_proactive_messages(sent_at)
- `idx_ai_question_log_contractor` on ai_question_log(contractor_id)
- `idx_ai_question_log_goal` on ai_question_log(goal_id)
- `idx_ai_goal_evolution_contractor` on ai_goal_evolution_log(contractor_id)
- `idx_ai_goal_evolution_goal` on ai_goal_evolution_log(goal_id)
- `idx_ai_trust_indicators_contractor` on ai_trust_indicators(contractor_id)
- `idx_ai_trust_indicators_recorded_at` on ai_trust_indicators(recorded_at)

---

### Step 5: Verify Data Types (Special Attention to JSONB)

**JSONB Fields in Phase 3**:

1. **ai_proactive_messages.context_data** (JSONB)
   - Stores: Related goals, milestones, patterns, contractor state
   - Example: `{"related_goal_id": 123, "milestone_name": "First Revenue Milestone", "pattern_match_score": 0.87}`

2. **ai_goal_evolution_log.original_milestones** (JSONB)
   - Stores: Array of milestone objects before evolution
   - Example: `[{"name": "Hire first employee", "target_date": "2025-03-01"}]`

3. **ai_goal_evolution_log.evolved_milestones** (JSONB)
   - Stores: Array of milestone objects after evolution
   - Example: `[{"name": "Hire COO", "target_date": "2025-04-15"}]`

4. **ai_trust_indicators.context_data** (JSONB)
   - Stores: Additional context about the trust moment
   - Example: `{"related_message_id": 456, "goal_id": 789, "interaction_type": "proactive_check_in"}`

**Verification Command**:
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('ai_proactive_messages', 'ai_goal_evolution_log', 'ai_trust_indicators') AND data_type = 'jsonb';\""
```

---

### Step 6: Document Findings BEFORE Coding

**Before creating ANY Phase 3 service file, add this verification header:**

```javascript
// ============================================================================
// DATABASE-CHECKED: Phase 3 Tables Verification
// ============================================================================
// TABLE: ai_proactive_messages
// VERIFIED COLUMNS: id, contractor_id, message_type, message_content, ai_reasoning,
//                   context_data (JSONB), sent_at, contractor_response,
//                   response_received_at, conversation_continued, outcome_rating,
//                   led_to_action, created_at, updated_at
// CHECK CONSTRAINTS: message_type IN (check_in, milestone_follow_up, resource_suggestion,
//                                     encouragement, course_correction, celebration)
//                    outcome_rating BETWEEN 1 AND 5
// FOREIGN KEYS: contractor_id → contractors.id (CASCADE)
//
// TABLE: ai_question_log
// VERIFIED COLUMNS: id, contractor_id, goal_id, question_text, question_purpose,
//                   question_type, asked_at, contractor_answer, answer_received_at,
//                   answer_quality_score, led_to_goal_refinement,
//                   question_naturalness_score, created_at, updated_at
// CHECK CONSTRAINTS: question_type IN (clarifying, exploratory, validating,
//                                      prioritizing, reflecting)
//                    answer_quality_score BETWEEN 1 AND 5
//                    question_naturalness_score BETWEEN 1 AND 5
// FOREIGN KEYS: contractor_id → contractors.id (CASCADE)
//               goal_id → contractor_goals.id (CASCADE)
//
// TABLE: ai_goal_evolution_log
// VERIFIED COLUMNS: id, goal_id, contractor_id, evolution_type, original_description,
//                   evolved_description, original_milestones (JSONB),
//                   evolved_milestones (JSONB), reason_for_evolution,
//                   ai_confidence_in_change, contractor_approved, goal_relevance_score,
//                   evolved_at, created_at, updated_at
// CHECK CONSTRAINTS: evolution_type IN (refinement, expansion, pivot,
//                                       milestone_adjustment, priority_change,
//                                       goal_completion)
//                    ai_confidence_in_change BETWEEN 0 AND 1
//                    goal_relevance_score BETWEEN 1 AND 10
// FOREIGN KEYS: contractor_id → contractors.id (CASCADE)
//               goal_id → contractor_goals.id (CASCADE)
//
// TABLE: ai_trust_indicators
// VERIFIED COLUMNS: id, contractor_id, indicator_type, indicator_description,
//                   context_data (JSONB), confidence_impact, cumulative_trust_score,
//                   recorded_at, created_at, updated_at
// CHECK CONSTRAINTS: indicator_type IN (positive_feedback, negative_feedback,
//                                       ignored_suggestion, acted_on_suggestion,
//                                       shared_vulnerability, asked_for_help,
//                                       milestone_achieved, setback_shared)
//                    confidence_impact BETWEEN -10 AND 10
//                    cumulative_trust_score BETWEEN 0 AND 100
// FOREIGN KEYS: contractor_id → contractors.id (CASCADE)
//
// VERIFIED: January 2025
// ============================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**CRITICAL**: Phase 3 tables must exist in BOTH environments before coding.

#### Development Database
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name;\""
```

Expected output includes:
- ai_goal_evolution_log
- ai_proactive_messages
- ai_question_log
- ai_trust_indicators

#### Production Database (AWS RDS)
Use `mcp__aws-production__exec` tool with:
```bash
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name;"
```

**If tables don't exist in production**: Run migration script in production BEFORE coding.

---

## 🚨 Red Flags - STOP Coding If You See These

### ❌ Missing CHECK Constraints
If any of these constraints are missing, the tables were not created correctly:
- `message_type` enum constraint (6 values)
- `question_type` enum constraint (5 values)
- `evolution_type` enum constraint (6 values)
- `indicator_type` enum constraint (8 values)
- Score range constraints (outcome_rating, answer_quality_score, question_naturalness_score, goal_relevance_score, confidence_impact, cumulative_trust_score)

### ❌ Missing Foreign Keys
If foreign keys don't CASCADE delete, orphaned records will accumulate.

### ❌ Missing Indexes
If contractor_id indexes are missing, queries will be slow.

### ❌ Wrong Data Types for JSONB Fields
If context_data, original_milestones, or evolved_milestones are TEXT instead of JSONB, parsing will fail.

### ❌ Production Tables Don't Match Development
If schemas differ between environments, deployments will break.

---

## ✅ Quick Reference Commands

### Check All Phase 3 Tables Exist
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name IN ('ai_proactive_messages', 'ai_question_log', 'ai_goal_evolution_log', 'ai_trust_indicators');\""
```

### Count Records in Phase 3 Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT 'ai_proactive_messages' as table_name, COUNT(*) as record_count FROM ai_proactive_messages UNION ALL SELECT 'ai_question_log', COUNT(*) FROM ai_question_log UNION ALL SELECT 'ai_goal_evolution_log', COUNT(*) FROM ai_goal_evolution_log UNION ALL SELECT 'ai_trust_indicators', COUNT(*) FROM ai_trust_indicators;\""
```

### Verify All CHECK Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conrelid::regclass AS table_name, conname AS constraint_name, pg_get_constraintdef(oid) AS constraint_definition FROM pg_constraint WHERE contype = 'c' AND conrelid::regclass::text LIKE 'ai_%' ORDER BY conrelid::regclass, conname;\""
```

### Verify All Foreign Keys with Delete Rules
```bash
powershell -Command ".\quick-db.bat \"SELECT tc.table_name, kcu.column_name, ccu.table_name AS references_table, rc.delete_rule FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name LIKE 'ai_%' ORDER BY tc.table_name;\""
```

---

## 📝 Phase 3 Specific Verification Notes

### Message Type Validation
When writing proactive message code, verify these exact enum values are used:
- `check_in`
- `milestone_follow_up`
- `resource_suggestion`
- `encouragement`
- `course_correction`
- `celebration`

### Question Type Validation
When writing question asking code, verify these exact enum values are used:
- `clarifying`
- `exploratory`
- `validating`
- `prioritizing`
- `reflecting`

### Evolution Type Validation
When writing goal evolution code, verify these exact enum values are used:
- `refinement`
- `expansion`
- `pivot`
- `milestone_adjustment`
- `priority_change`
- `goal_completion`

### Trust Indicator Type Validation
When writing trust tracking code, verify these exact enum values are used:
- `positive_feedback`
- `negative_feedback`
- `ignored_suggestion`
- `acted_on_suggestion`
- `shared_vulnerability`
- `asked_for_help`
- `milestone_achieved`
- `setback_shared`

### Score Range Validations
**CRITICAL**: All score fields have strict ranges enforced by CHECK constraints:
- `outcome_rating`: 1-5
- `answer_quality_score`: 1-5
- `question_naturalness_score`: 1-5
- `goal_relevance_score`: 1-10
- `ai_confidence_in_change`: 0.00-1.00 (DECIMAL)
- `confidence_impact`: -10 to +10
- `cumulative_trust_score`: 0.00-100.00 (DECIMAL)

**Any insert/update outside these ranges will fail at the database level.**

---

## 🎯 Checklist Complete - Ready to Code

**Before starting Day 1 of Phase 3, confirm:**

- ✅ All 4 Phase 3 tables verified in development database
- ✅ All column names documented with exact data types
- ✅ All CHECK constraints verified (message_type, question_type, evolution_type, indicator_type, score ranges)
- ✅ All foreign keys verified with CASCADE delete
- ✅ All indexes verified for performance
- ✅ JSONB fields identified and verified
- ✅ Production database verified to match development
- ✅ DATABASE-CHECKED header template prepared

**If ANY item is unchecked, DO NOT START CODING. Fix database schema first.**

---

## 📚 Related Documentation

- **Phase 3 Implementation Plan**: `PHASE-3-IMPLEMENTATION-PLAN.md`
- **Internal Goal Engine Overview**: `../INTERNAL-GOAL-ENGINE-OVERVIEW.md`
- **Phase 1 Pre-Flight Checklist**: `../phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Phase 2 Pre-Flight Checklist**: `../phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md`
- **Database Source of Truth**: `../../../DATABASE-SOURCE-OF-TRUTH.md`

---

**Remember**: The database is the source of truth. VERIFY FIRST, CODE SECOND. ✅
