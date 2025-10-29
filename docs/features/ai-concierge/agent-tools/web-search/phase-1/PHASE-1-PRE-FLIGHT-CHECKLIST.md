# Phase 1: Pre-Flight Checklist - AI Concierge Web Search Tool

**Document Version:** 1.0
**Date:** October 29, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment for implementing the AI Concierge Web Search Tool. This tool allows the AI to **supplement** database knowledge with real-time web search when database fields are sparse or external context adds value. Following this prevents field name mismatches and ensures the database-first strategy is properly implemented.

**Critical Principle**: Web search is SUPPLEMENTAL only. Database queries ALWAYS come first.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Phase 1 Web Search Tool Tables:**
- `contractors` - Contractor profiles (focus_areas, ai_summary, ai_tags, business_goals)
- `strategic_partners` - Partner profiles (company_description, key_differentiators, ai_summary)
- `events` - Event information (focus_areas_covered, ai_summary, topics)
- `books` - Book content (topics, focus_areas_covered, ai_summary, ai_insights)

**For this implementation:**
All 4 tables are queried to check for sparse data before web search is triggered.

**Note**: Web search does NOT modify these tables in Phase 1. It only reads to determine when supplemental data is needed.

---

### Step 2: Verify Column Names (Field Names)

**All fields verified October 29, 2025 using:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

#### contractors (72 columns) ✅ VERIFIED

**Relevant fields for web search decision logic:**

```
column_name          | data_type
---------------------|----------
focus_areas          | text  ⚠️ TEXT not JSONB!
primary_focus_area   | character varying
ai_summary           | text
ai_tags              | jsonb
ai_insights          | jsonb
business_goals       | jsonb
current_challenges   | jsonb
engagement_score     | integer
```

**🔴 CRITICAL FINDINGS:**
- `focus_areas` is **TEXT** (comma-separated), NOT JSONB
- `ai_summary` is **TEXT** (may be NULL or sparse)
- `ai_tags` is **JSONB** (may be NULL or empty array)
- `ai_insights` is **JSONB** (may be NULL or have low confidence)
- All these fields are **NULLABLE** - must check before assuming web search is needed

#### strategic_partners (124 columns) ✅ VERIFIED

**Relevant fields for web search decision logic:**

```
column_name                  | data_type
-----------------------------|----------
company_name                 | character varying
company_description          | text  ⚠️ May be NULL or sparse
key_differentiators          | text  ⚠️ May be NULL or empty
ai_summary                   | text  ⚠️ May be NULL
ai_tags                      | jsonb
ai_insights                  | jsonb
ai_generated_differentiators | text
power_confidence_score       | integer
focus_areas                  | text  ⚠️ TEXT not JSONB!
```

**🔴 CRITICAL FINDINGS:**
- `company_description` is **TEXT** (may be NULL or < 50 characters)
- `key_differentiators` is **TEXT** (may be NULL or empty)
- `ai_summary` is **TEXT** (may be NULL or generic)
- `focus_areas` is **TEXT** (comma-separated), NOT JSONB
- All TEXT fields are **NULLABLE** - must check LENGTH and NULL

**🔥 WEB SEARCH TRIGGER CONDITIONS:**
```javascript
// When to use web search for partner enrichment:
if (!partner.company_description || partner.company_description.length < 50) {
  // Trigger: enrich_entity
}
if (!partner.key_differentiators || partner.key_differentiators.length === 0) {
  // Trigger: enrich_entity
}
if (!partner.ai_summary || partner.ai_summary.includes('No information')) {
  // Trigger: enrich_entity
}
```

#### events (53 columns) ✅ VERIFIED

**Relevant fields for web search decision logic:**

```
column_name          | data_type
---------------------|----------
name                 | character varying
description          | text
focus_areas_covered  | text  ⚠️ TEXT comma-separated
ai_summary           | text
ai_tags              | jsonb
topics               | text  ⚠️ TEXT comma-separated
```

**🔴 CRITICAL FINDINGS:**
- `focus_areas_covered` is **TEXT** (comma-separated)
- `topics` is **TEXT** (comma-separated)
- `ai_summary` is **TEXT** (may be NULL)
- `ai_tags` is **JSONB** (may be NULL or sparse)

#### books (53 columns) ✅ VERIFIED

**Relevant fields for web search decision logic:**

```
column_name          | data_type
---------------------|----------
title                | character varying
author               | character varying
topics               | text  ⚠️ TEXT comma-separated
focus_areas_covered  | text  ⚠️ TEXT comma-separated
ai_summary           | text
ai_tags              | jsonb
ai_insights          | jsonb
```

**🔴 CRITICAL FINDINGS:**
- `topics` is **TEXT** (comma-separated)
- `focus_areas_covered` is **TEXT** (comma-separated)
- `ai_summary` is **TEXT** (may be NULL or sparse)
- `ai_insights` is **JSONB** (may have low confidence scores)

---

### Step 3: Verify AI Concierge Service Architecture

**Current AI Concierge Service Location:**
- `tpe-backend/src/services/aiConciergeService.js`

**Verify existing structure:**
```bash
# Check if file exists and review structure
cat tpe-backend/src/services/aiConciergeService.js | head -100
```

**Expected Structure:**
```javascript
// System prompt definition
// Available tools array
// Function definitions for OpenAI
// executeToolCall() handler
// Database query tools (queryContractors, queryPartners, etc.)
```

**🔴 CRITICAL INTEGRATION POINTS:**
1. **Tools Array** - Where we add `web_search`
2. **Function Definitions** - Where we define the tool for OpenAI
3. **executeToolCall()** - Where we handle the `web_search` case
4. **System Prompt** - Where we add database-first instructions

---

### Step 4: Verify Environment Variables

**Current .env files:**
- `.env.development` (local development)
- `.env.production` (EC2 production)

**Verify BRAVE_SEARCH_API_KEY placeholder exists:**
```bash
# Check development env
grep "BRAVE" tpe-backend/.env.development

# Expected result (currently):
# BRAVE_API_KEY=your_brave_search_api_key_here
```

**🔴 CRITICAL FINDINGS:**
- `.env.development` has `BRAVE_API_KEY` placeholder
- Need to obtain actual API key before implementation
- Must add same key to `.env.production` for deployment

---

### Step 5: Check Data Types and Parsing Requirements

**Phase 1 Critical Data Types:**

| Field                                  | Type      | Parsing Method                                    | Web Search Trigger                      |
|----------------------------------------|-----------|---------------------------------------------------|-----------------------------------------|
| `contractors.focus_areas`              | TEXT      | `.split(',').map(f => f.trim())`                  | N/A (always available)                  |
| `contractors.ai_summary`               | TEXT      | Direct access (check for NULL)                    | `NULL` or `length < 20`                 |
| `contractors.ai_tags`                  | JSONB     | `safeJsonParse(value, [])`                        | `NULL` or `length === 0`                |
| `strategic_partners.company_description` | TEXT    | Direct access (check NULL and length)             | `NULL` or `length < 50` ⚠️ PRIMARY TRIGGER |
| `strategic_partners.key_differentiators` | TEXT    | Direct access (check NULL and empty)              | `NULL` or `length === 0` ⚠️ PRIMARY TRIGGER |
| `strategic_partners.ai_summary`        | TEXT      | Direct access (check NULL and generic)            | `NULL` or generic content               |
| `strategic_partners.focus_areas`       | TEXT      | `.split(',').map(f => f.trim())`                  | N/A (used for matching, not trigger)    |
| `events.focus_areas_covered`           | TEXT      | `.split(',').map(f => f.trim())`                  | N/A (used for analysis)                 |
| `events.topics`                        | TEXT      | `.split(',').map(f => f.trim())`                  | N/A (used for analysis)                 |
| `books.ai_insights`                    | JSONB     | `safeJsonParse(value, [])`                        | `NULL` or low confidence                |

**🔴 CRITICAL: TEXT vs JSONB**
```javascript
// ✅ CORRECT: Handling TEXT fields
const contractorFocusAreas = contractor.focus_areas
  ? contractor.focus_areas.split(',').map(f => f.trim())
  : [];

// ✅ CORRECT: Checking TEXT for sparse content
const needsEnrichment = !partner.company_description ||
                       partner.company_description.length < 50;

// ✅ CORRECT: Parsing JSONB fields
const aiTags = safeJsonParse(partner.ai_tags, []);

// ❌ WRONG: Treating TEXT as JSONB
const focusAreas = safeJsonParse(partner.focus_areas, []); // WRONG!

// ❌ WRONG: Not checking length for TEXT
const needsEnrichment = !partner.company_description; // Incomplete! Check length too
```

---

### Step 6: Document Findings BEFORE Coding

**Web Search Service Verification Block:**
```javascript
// DATABASE-CHECKED: No database writes, only reads for decision logic
// Verified October 29, 2025
// ================================================================
// WEB SEARCH TOOL - DATABASE FIELD CHECKS:
// ================================================================
// CONTRACTORS TABLE:
// - focus_areas (TEXT comma-separated) - for matching, not trigger
// - ai_summary (TEXT nullable) - trigger if NULL or length < 20
// - ai_tags (JSONB nullable) - trigger if NULL or empty array
// ================================================================
// STRATEGIC_PARTNERS TABLE (PRIMARY TRIGGERS):
// - company_description (TEXT nullable) - ⚠️ PRIMARY TRIGGER: NULL or length < 50
// - key_differentiators (TEXT nullable) - ⚠️ PRIMARY TRIGGER: NULL or empty
// - ai_summary (TEXT nullable) - trigger if NULL or generic
// - focus_areas (TEXT comma-separated) - for analysis, not trigger
// ================================================================
// EVENTS TABLE:
// - focus_areas_covered (TEXT comma-separated) - for trend analysis
// - topics (TEXT comma-separated) - for trend analysis
// - ai_summary (TEXT nullable) - for context
// ================================================================
// BOOKS TABLE:
// - topics (TEXT comma-separated) - for trend analysis
// - ai_insights (JSONB nullable) - for pattern analysis
// ================================================================
// CRITICAL: ALL TEXT fields must check NULL AND length
// CRITICAL: Split TEXT fields by comma before using
// CRITICAL: Parse JSONB fields with safeJsonParse
// ================================================================
```

**AI Concierge Integration Verification Block:**
```javascript
// DATABASE-CHECKED: aiConciergeService.js integration points verified
// Verified October 29, 2025
// ================================================================
// INTEGRATION POINTS:
// 1. Tools array (add web_search)
// 2. Function definitions (OpenAI format)
// 3. executeToolCall() (handle web_search case)
// 4. System prompt (database-first instructions)
// ================================================================
// SYSTEM PROMPT REQUIREMENTS:
// - Reference exact field names (company_description, key_differentiators, etc.)
// - Specify NULL and length checks
// - Emphasize database queries FIRST
// - Define purpose parameter requirement
// ================================================================
// DATABASE-FIRST PRIORITY:
// - Query contractors.focus_areas, ai_tags, ai_summary FIRST
// - Query strategic_partners.company_description, key_differentiators FIRST
// - Check field values before triggering web_search
// - Use web search ONLY when fields are NULL, empty, or sparse
// ================================================================
```

**Brave Search Service Verification Block:**
```javascript
// DATABASE-CHECKED: No database operations in webSearchService.js
// Verified October 29, 2025
// ================================================================
// EXTERNAL API INTEGRATION ONLY:
// - Brave Search API endpoint: https://api.search.brave.com/res/v1/web/search
// - API key from process.env.BRAVE_SEARCH_API_KEY
// - No database reads or writes
// - Returns formatted results for AI consumption
// ================================================================
// RESULT FORMAT:
// {
//   results: [
//     { title: STRING, url: STRING, description: STRING, date: STRING }
//   ],
//   query: STRING,
//   count: NUMBER
// }
// ================================================================
```

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 1, STOP and run verification queries:

1. **Querying database WITHOUT checking fields first** ❌
   ```javascript
   // WRONG: Web search without database query
   const results = await webSearch('company X');
   ```
   **Fix**: Query `strategic_partners` table FIRST, check `company_description`

2. **Not checking NULL AND length for TEXT fields** ❌
   ```javascript
   // WRONG: Only checking NULL
   if (!partner.company_description) { webSearch(...) }
   ```
   **Fix**: `if (!partner.company_description || partner.company_description.length < 50)`

3. **Treating TEXT focus_areas as JSONB** ❌
   ```javascript
   // WRONG: It's TEXT, not JSONB!
   const focusAreas = safeJsonParse(partner.focus_areas, []);
   ```
   **Fix**: `partner.focus_areas.split(',').map(f => f.trim())`

4. **Using web search for pure database queries** ❌
   ```javascript
   // WRONG: This is a pure database query
   User: "Show me contractors interested in marketing"
   AI: Uses web_search
   ```
   **Fix**: System prompt should prevent this - query `contractors.focus_areas` only

5. **Not specifying purpose parameter** ❌
   ```javascript
   // WRONG: Missing purpose
   await webSearch('company X');
   ```
   **Fix**: `await webSearch('company X', 'enrich_entity')`

6. **Presenting web search results BEFORE database data** ❌
   ```javascript
   // WRONG: Web search results shown first
   response = webResults + "\n\n" + databaseResults;
   ```
   **Fix**: Database results FIRST, web results as supplemental context

7. **Not parsing JSONB fields before checking** ❌
   ```javascript
   // WRONG: Not parsing JSONB
   if (partner.ai_tags.length === 0) { ... }
   ```
   **Fix**: `const aiTags = safeJsonParse(partner.ai_tags, []); if (aiTags.length === 0)`

---

## 📋 Quick Reference Commands

### Verify All Columns for Web Search Triggers

```bash
# contractors - Check AI fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND (column_name LIKE '%ai%' OR column_name LIKE '%focus%' OR column_name LIKE '%goal%');\""

# strategic_partners - Check enrichment fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND (column_name LIKE '%description%' OR column_name LIKE '%differentiator%' OR column_name LIKE '%ai%');\""

# events - Check analysis fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND (column_name LIKE '%focus%' OR column_name LIKE '%topic%' OR column_name LIKE '%ai%');\""

# books - Check insight fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' AND (column_name LIKE '%topic%' OR column_name LIKE '%focus%' OR column_name LIKE '%ai%');\""
```

### Check for Sparse Partner Data (Primary Web Search Triggers)

```bash
# Find partners with NULL or short company_description
powershell -Command ".\quick-db.bat \"SELECT id, company_name, LENGTH(company_description) as desc_length FROM strategic_partners WHERE company_description IS NULL OR LENGTH(company_description) < 50 LIMIT 10;\""

# Find partners with NULL key_differentiators
powershell -Command ".\quick-db.bat \"SELECT id, company_name, key_differentiators FROM strategic_partners WHERE key_differentiators IS NULL OR LENGTH(key_differentiators) = 0 LIMIT 10;\""

# Find partners with NULL ai_summary
powershell -Command ".\quick-db.bat \"SELECT id, company_name, ai_summary FROM strategic_partners WHERE ai_summary IS NULL LIMIT 10;\""
```

### Verify AI Concierge Service Structure

```bash
# Check if aiConciergeService exists
ls tpe-backend/src/services/aiConciergeService.js

# Check for existing tools
grep -n "tools =" tpe-backend/src/services/aiConciergeService.js | head -5

# Check for executeToolCall function
grep -n "executeToolCall" tpe-backend/src/services/aiConciergeService.js | head -5
```

### Verify Environment Variables

```bash
# Check BRAVE_API_KEY in development
grep "BRAVE" tpe-backend/.env.development

# Expected: BRAVE_API_KEY=your_brave_search_api_key_here
```

---

## ✅ Example: Creating webSearchService.js

### Pre-Flight Verification Complete ✅

**1. Database Tables Involved:**
- `contractors` ✅ (read only, for decision logic)
- `strategic_partners` ✅ (read only, PRIMARY TRIGGER CHECKS)
- `events` ✅ (read only, for trend analysis)
- `books` ✅ (read only, for pattern analysis)

**2. Key Fields Verified for Trigger Logic:**
```
strategic_partners (PRIMARY TRIGGERS):
- company_description (TEXT nullable) - ⚠️ Check NULL or length < 50
- key_differentiators (TEXT nullable) - ⚠️ Check NULL or empty
- ai_summary (TEXT nullable) - Check NULL or generic

contractors (SECONDARY TRIGGERS):
- ai_summary (TEXT nullable) - Check NULL or length < 20
- ai_tags (JSONB nullable) - Parse then check empty

events/books (ANALYSIS ONLY):
- focus_areas_covered, topics (TEXT) - Split by comma
- ai_tags, ai_insights (JSONB) - Parse with safeJsonParse
```

**3. No Database Writes:**
- ✅ webSearchService.js does NOT modify any database tables
- ✅ Only external API integration (Brave Search)
- ✅ Returns formatted results to AI Concierge

**4. Environment Variables:**
- ✅ BRAVE_SEARCH_API_KEY needed in .env.development
- ✅ BRAVE_SEARCH_API_KEY needed in .env.production
- ❓ API key to be obtained before implementation

**5. Integration Points:**
- ✅ aiConciergeService.js - add web_search to tools
- ✅ aiConciergeService.js - add function definition
- ✅ aiConciergeService.js - update executeToolCall()
- ✅ aiConciergeService.js - update system prompt with field names

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: No database operations, external API only
// Verified October 29, 2025
// ================================================================
// BRAVE SEARCH API INTEGRATION:
// - Endpoint: https://api.search.brave.com/res/v1/web/search
// - API Key: process.env.BRAVE_SEARCH_API_KEY
// - Rate Limit: 2,000 queries/month (free tier)
// - No database reads or writes
// ================================================================
// USAGE TRACKING:
// - Log every search: query, purpose, result count, timestamp
// - Monitor daily usage to avoid rate limits
// - Purpose parameter required: enrich_entity, validate_trends, etc.
// ================================================================
```

**NOW WE CAN CODE SAFELY!**

---

## 📚 Phase 1 Specific Verification Notes

### Web Search Trigger Logic Checklist
- [ ] Verify `company_description` is TEXT and nullable
- [ ] Verify NULL check AND length check for TEXT fields
- [ ] Verify `focus_areas` fields are TEXT (comma-separated)
- [ ] Verify `ai_tags`, `ai_insights` are JSONB
- [ ] Verify all JSONB fields parsed with safeJsonParse
- [ ] Verify TEXT fields split by comma where needed

### AI Concierge Integration Checklist
- [ ] `web_search` added to tools array
- [ ] Function definition references exact field names
- [ ] `executeToolCall()` handles web_search case
- [ ] System prompt enforces database-first priority
- [ ] System prompt references verified field names
- [ ] Purpose parameter required and validated

### Brave Search Service Checklist
- [ ] API key from environment variables
- [ ] Error handling for API failures
- [ ] Rate limiting tracking (2,000/month)
- [ ] Result formatting for AI consumption
- [ ] Logging for all searches (query, purpose, results)

### Database-First Logic Checklist
- [ ] Always query database FIRST
- [ ] Check field values (NULL, length, empty)
- [ ] Use web search ONLY when database insufficient
- [ ] Present database data PROMINENTLY
- [ ] Web search results as supplemental context

---

## 🚨 Phase 1 Critical Gotchas

### 1. TEXT vs JSONB Field Handling

```javascript
// ❌ WRONG: Treating TEXT as JSONB
const focusAreas = safeJsonParse(partner.focus_areas, []);

// ✅ CORRECT: Split TEXT by comma
const focusAreas = partner.focus_areas
  ? partner.focus_areas.split(',').map(f => f.trim())
  : [];

// ❌ WRONG: Not parsing JSONB
const aiTags = partner.ai_tags;

// ✅ CORRECT: Parse JSONB with safeJsonParse
const aiTags = safeJsonParse(partner.ai_tags, []);
```

### 2. Incomplete NULL/Empty Checks

```javascript
// ❌ WRONG: Only checking NULL
if (!partner.company_description) {
  useWebSearch();
}

// ✅ CORRECT: Check NULL AND length
if (!partner.company_description || partner.company_description.length < 50) {
  useWebSearch('enrich_entity');
}
```

### 3. Database Query Order

```javascript
// ❌ WRONG: Web search before database
const webResults = await webSearch('company X info');
const dbResults = await queryPartners({ name: 'X' });

// ✅ CORRECT: Database FIRST, then web search if needed
const dbResults = await queryPartners({ name: 'X' });
if (!dbResults.company_description || dbResults.company_description.length < 50) {
  const webResults = await webSearch('company X info', 'enrich_entity');
}
```

### 4. Purpose Parameter Requirement

```javascript
// ❌ WRONG: No purpose specified
await webSearch('contractor marketing trends');

// ✅ CORRECT: Always specify purpose
await webSearch('contractor marketing trends 2025', 'validate_trends');
```

### 5. Result Presentation Order

```javascript
// ❌ WRONG: Web results first
response = `Web Search Results:\n${webResults}\n\nDatabase:\n${dbResults}`;

// ✅ CORRECT: Database data FIRST
response = `Based on our data:\n${dbResults}\n\nExternal Context:\n${webResults}`;
```

---

## 📚 Related Documents

- **Phase 1 Implementation Plan:** `PHASE-1-IMPLEMENTATION-PLAN.md` (this directory)
- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **AI Concierge Architecture:** `docs/AI-CONCIERGE-COMPLETE-GUIDE.md`
- **AI Field Naming Conventions:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`
- **Storage and JSON Guidelines:** `docs/STORAGE-AND-JSON-GUIDELINES.md`

---

## 🎯 Quick Start for Phase 1

**Before creating ANY file, run these commands:**

```bash
# 1. Verify strategic_partners enrichment trigger fields
powershell -Command ".\quick-db.bat \"SELECT id, company_name, LENGTH(company_description) as desc_len, LENGTH(key_differentiators) as diff_len FROM strategic_partners LIMIT 5;\""

# 2. Find partners needing enrichment (primary use case)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as needs_enrichment FROM strategic_partners WHERE company_description IS NULL OR LENGTH(company_description) < 50 OR key_differentiators IS NULL;\""

# 3. Verify contractors AI fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name LIKE '%ai%';\""

# 4. Check AI Concierge service exists
ls -la tpe-backend/src/services/aiConciergeService.js

# 5. Verify BRAVE_API_KEY placeholder
grep "BRAVE" tpe-backend/.env.development
```

**Document results, then code safely!**

---

**Last Updated:** October 29, 2025
**Next Review:** Before implementing webSearchService.js
**Status:** MANDATORY - Use this checklist religiously

---

## 🎉 Phase 1 Completion Criteria

Phase 1 pre-flight checklist is complete when:
- ✅ All 4 database table schemas verified (contractors, strategic_partners, events, books)
- ✅ Sparse data trigger fields identified (company_description, key_differentiators, ai_summary)
- ✅ TEXT vs JSONB field types documented
- ✅ NULL and length check requirements clear
- ✅ AI Concierge integration points identified
- ✅ Environment variable requirements documented
- ✅ All verification commands tested
- ✅ Red flags and gotchas documented
- ✅ Ready to implement Task 1: Create webSearchService.js

---

**Document Status:** ✅ Complete and Verified
**Database Verification Date:** October 29, 2025
**Integration Points Verified:** October 29, 2025
**Ready for Implementation:** YES

---

## 🔥 Final Verification Before Coding

**Run this command block and document results:**

```bash
# Complete pre-flight verification
echo "=== Strategic Partners Enrichment Candidates ==="
powershell -Command ".\quick-db.bat \"SELECT id, company_name, CASE WHEN company_description IS NULL THEN 'NULL' WHEN LENGTH(company_description) < 50 THEN 'SPARSE' ELSE 'OK' END as desc_status FROM strategic_partners LIMIT 10;\""

echo ""
echo "=== AI Concierge Service Check ==="
ls -la tpe-backend/src/services/aiConciergeService.js

echo ""
echo "=== Environment Variable Check ==="
grep "BRAVE" tpe-backend/.env.development

echo ""
echo "=== Ready for Implementation ==="
```

**If all checks pass, proceed to implementation! 🚀**
