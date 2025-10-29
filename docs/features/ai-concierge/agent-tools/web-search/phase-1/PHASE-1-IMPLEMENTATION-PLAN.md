# Web Search Tool - Phase 1 Implementation Plan

**Feature**: AI Concierge Web Search Capability
**Location**: `docs/features/ai-concierge/agent-tools/web-search/`
**Status**: Planning
**Created**: October 29, 2025
**Database Schemas Verified**: October 29, 2025

---

## 🔴 DATABASE SCHEMA VERIFICATION

**All field names in this document have been verified against actual database schemas.**

### Verified Tables (as of October 29, 2025):
- ✅ **contractors** - 72 columns verified
- ✅ **strategic_partners** - 124 columns verified
- ✅ **events** - 53 columns verified
- ✅ **books** - 53 columns verified

### Key Database Fields Referenced in This Document:

**contractors table**:
- `focus_areas` (text)
- `ai_summary` (text)
- `ai_tags` (jsonb)
- `ai_insights` (jsonb)
- `engagement_score` (integer)
- `business_goals` (jsonb)
- `current_challenges` (jsonb)

**strategic_partners table**:
- `company_name` (varchar)
- `focus_areas` (text)
- `ai_summary` (text)
- `ai_tags` (jsonb)
- `ai_insights` (jsonb)
- `power_confidence_score` (integer)
- `ai_generated_differentiators` (text)
- `company_description` (text)
- `key_differentiators` (text)

**events table**:
- `name` (varchar)
- `focus_areas_covered` (text)
- `ai_summary` (text)
- `ai_tags` (jsonb)
- `topics` (text)
- `description` (text)

**books table**:
- `title` (varchar)
- `author` (varchar)
- `topics` (text)
- `focus_areas_covered` (text)
- `ai_summary` (text)
- `ai_tags` (jsonb)
- `ai_insights` (jsonb)

---

## Executive Summary

Enable the AI Concierge to intelligently supplement database knowledge with real-time web search when beneficial. The AI will **prioritize first-party database data** and use web search as supplemental context or to enrich sparse entity information.

### Key Principle: Database-First Strategy
**Our first-party behavioral data is the competitive advantage.** Web search is seasoning, not the main course.

---

## Business Value

### Primary Benefits
1. **Enrich Sparse Entity Profiles**: When `company_description` or `ai_summary` is limited, web search fills gaps
2. **Contextual Validation**: Database patterns in `ai_tags` and `ai_insights` validated against external trends
3. **Enhanced Recommendations**: Better answers by combining internal `business_goals` with external context
4. **Competitive Intelligence**: Understand broader industry trends while leveraging internal `engagement_score` and `focus_areas`

### Use Case Examples (With Verified Database Fields)

**Scenario 1: Trends Analysis (Database-First)**
```
User: "What are current trends in contractor marketing?"

AI Process:
1. Query contractors table:
   - GROUP BY focus_areas WHERE focus_areas LIKE '%marketing%'
   - Analyze ai_tags for marketing-related patterns
   - Review engagement_score for contractors with marketing focus

2. Query strategic_partners table:
   - WHERE focus_areas LIKE '%marketing%'
   - Analyze power_confidence_score for top marketing partners
   - Review ai_generated_differentiators for successful strategies

3. Query books table:
   - WHERE topics LIKE '%marketing%' OR focus_areas_covered LIKE '%marketing%'
   - Analyze ai_insights for content trends

4. Use web search to ADD external context and validation

5. Present insights prioritizing TPX first-party data
```

**Scenario 2: Entity Enrichment (Web as Supplement)**
```
User: "Tell me about Partner X"

AI Process:
1. Query strategic_partners WHERE company_name = 'X':
   - Check if company_description is NULL or LENGTH < 50
   - Check if key_differentiators is NULL or empty
   - Check if ai_summary is NULL or sparse

2. IF profile is sparse/incomplete:
   - Web search for: "X company contractor services"
   - Web search for: "X company reviews testimonials"
   - Enrich database response with external context

3. Present combined view with database data prominent:
   - Show power_confidence_score first
   - Display focus_areas and ai_generated_differentiators
   - Add web-sourced context as supplemental information
```

**Scenario 3: Pure Database (No Web Search Needed)**
```
User: "Show me contractors interested in marketing"

AI Process:
1. Query contractors:
   - WHERE focus_areas LIKE '%marketing%'
   - ORDER BY engagement_score DESC
   - Include ai_summary and business_goals

2. Return results (no web search needed - pure internal query)
```

---

## Architecture Overview

### Tool Integration Model

```
AI Concierge Request
       |
       v
OpenAI Function Calling
       |
       ├─→ Database Tools (PRIORITY)
       │   - queryContractors() → contractors table
       │   - queryPartners() → strategic_partners table
       │   - queryEvents() → events table
       │   - queryContent() → books table
       │
       └─→ Web Search Tool (SUPPLEMENTAL)
           - webSearch(query, purpose)
           - Brave Search API integration
           - Returns: organic results + context
```

### Decision Flow (Database Fields Verified)

```
1. User Question Received
   ↓
2. AI Evaluates: "Do I need database data?"
   ↓ YES
3. Execute Database Queries FIRST
   - Check focus_areas, ai_summary, ai_tags, ai_insights
   - Evaluate engagement_score, power_confidence_score
   - Review business_goals, current_challenges
   ↓
4. Evaluate Results: "Is this sufficient?"
   - Is company_description NULL or sparse?
   - Is key_differentiators empty?
   - Are ai_tags limited?
   ↓ NO (sparse data or needs context)
5. Execute Web Search as SUPPLEMENT
   ↓
6. Combine & Present: Database data prominent
   - Lead with database fields (ai_summary, focus_areas)
   - Add web context as supporting information
```

---

## Phase 1 Scope

### ✅ In Scope
1. **Brave Search API Integration**
   - Search service wrapper
   - Result formatting and parsing
   - Error handling and rate limiting

2. **OpenAI Function Tool Definition**
   - `webSearch(query, purpose)` function
   - Clear instructions for when to use
   - Database-first priority in system prompt

3. **AI System Prompt Updates**
   - Define tool usage priorities (database tools first)
   - Specify database-first strategy with actual field names
   - Provide decision criteria referencing verified fields

4. **Basic Testing**
   - Database-only queries (verify no unnecessary searches)
   - Entity enrichment (verify supplemental behavior with actual fields)
   - Trend analysis (verify database data from `ai_tags`, `focus_areas` comes first)

### ❌ Out of Scope (Future Phases)
- Advanced search result ranking/filtering
- Caching search results
- Multiple search provider fallbacks
- Search result persistence to database tables
- Analytics on search usage patterns
- Automatic enrichment of `ai_summary` or `company_description` fields

---

## Technical Implementation

### File Changes Required

#### 1. **New File**: `tpe-backend/src/services/webSearchService.js`
```javascript
// Brave Search API integration
// - searchWeb(query, options)
// - formatResults(braveResponse)
// - Error handling and rate limiting
```

**Purpose**: Isolated service for external web search integration

#### 2. **Modified**: `tpe-backend/src/services/aiConciergeService.js`
**Changes**:
- Add `web_search` to available tools array (lines ~200-220)
- Add function definition for OpenAI function calling (lines ~250-280)
- Update `executeToolCall()` to handle `web_search` case (lines ~400-450)

**System Prompt Updates** (lines ~50-150):
- Add database-first priority instructions
- Reference actual database fields (focus_areas, ai_summary, etc.)
- Specify when to use web search (sparse company_description, missing key_differentiators)

#### 3. **Environment Variables**: `.env.development` and `.env.production`
```bash
# Add:
BRAVE_SEARCH_API_KEY=your_api_key_here
```

### API Integration: Brave Search

**Why Brave Search?**
- Free tier: 2,000 queries/month (sufficient for Phase 1)
- No tracking/privacy-focused
- Clean API with good documentation
- Organic results + structured data

**Endpoint**: `https://api.search.brave.com/res/v1/web/search`

**Request Example**:
```bash
curl -H "X-Subscription-Token: YOUR_API_KEY" \
     "https://api.search.brave.com/res/v1/web/search?q=contractor+marketing+trends+2025&count=5"
```

**Response Structure**:
```json
{
  "query": {
    "original": "contractor marketing trends 2025"
  },
  "web": {
    "results": [
      {
        "title": "Top Contractor Marketing Trends",
        "url": "https://example.com",
        "description": "...",
        "age": "2025-01-15"
      }
    ]
  }
}
```

---

## System Prompt Strategy (Database Fields Verified)

### Database-First Instructions (Add to System Prompt)

```markdown
## Tool Usage Priority - Database Schema Verified

**CRITICAL**: You have access to both database tools and web search. Follow this priority:

### 1. ALWAYS Query Database FIRST

When the question involves contractor/partner/event/book data, you MUST query the database first:

**Contractors** (contractors table):
- focus_areas (text) - Business focus areas
- ai_summary (text) - AI-generated profile summary
- ai_tags (jsonb) - AI-extracted tags and patterns
- ai_insights (jsonb) - AI-analyzed insights
- engagement_score (integer) - Engagement level
- business_goals (jsonb) - Stated business objectives
- current_challenges (jsonb) - Active business challenges

**Strategic Partners** (strategic_partners table):
- company_name (varchar) - Partner company name
- focus_areas (text) - Service focus areas
- ai_summary (text) - AI-generated company summary
- ai_tags (jsonb) - AI-extracted capabilities
- ai_insights (jsonb) - AI-analyzed performance patterns
- power_confidence_score (integer) - PCR score (0-100)
- ai_generated_differentiators (text) - AI-extracted unique value
- company_description (text) - Company overview
- key_differentiators (text) - What makes them unique

**Events** (events table):
- name (varchar) - Event name
- focus_areas_covered (text) - Topics covered
- ai_summary (text) - AI-generated event summary
- ai_tags (jsonb) - AI-extracted themes
- topics (text) - Event topics
- description (text) - Event description

**Books** (books table):
- title (varchar) - Book title
- author (varchar) - Author name
- topics (text) - Book topics
- focus_areas_covered (text) - Business areas addressed
- ai_summary (text) - AI-generated book summary
- ai_tags (jsonb) - AI-extracted key themes
- ai_insights (jsonb) - AI-analyzed takeaways

### 2. Use Web Search as SUPPLEMENTAL ONLY

Use web search ONLY when:

**A. Sparse Database Fields** (after querying database):
- partner.company_description IS NULL OR LENGTH < 50 characters
- partner.key_differentiators IS NULL OR empty
- partner.ai_summary IS NULL OR very generic
- contractor.ai_insights has low confidence scores
- book.ai_summary is missing key context

**B. External Validation Needed**:
- Database ai_tags show internal patterns, need external trends
- focus_areas analysis needs industry-wide context
- power_confidence_score trends need market validation

**C. Current Events/News**:
- Question explicitly asks for "latest" or "recent" information
- Need to supplement database topics with current news

### 3. NEVER Use Web Search For

- Pure internal queries: "Show me contractors interested in X"
  → Query: SELECT * FROM contractors WHERE focus_areas LIKE '%X%'
  → NO web search needed

- Data that exists in database fields:
  → If ai_summary exists, use it
  → If ai_tags are populated, use them
  → If power_confidence_score is available, use it

- Questions fully answerable from database:
  → "What are our top performing partners?" → Query power_confidence_score
  → "Which contractors are most engaged?" → Query engagement_score
  → "What topics are popular?" → Aggregate ai_tags and topics

### Web Search Purpose Specification

When you DO use web search, you MUST specify the `purpose` parameter:

- **"enrich_entity"**: Filling gaps in sparse database fields
  - Example: company_description is NULL, need basic company info

- **"validate_trends"**: External validation of database patterns
  - Example: ai_tags show marketing trend, validate with external data

- **"current_events"**: Recent news or updates
  - Example: "latest contractor marketing news 2025"

- **"context_supplement"**: Adding external context to database insights
  - Example: ai_insights show patterns, add industry context

This helps track appropriate usage and prevents over-reliance on web search.
```

---

## Tool Function Definition (OpenAI Format)

```javascript
{
  type: "function",
  function: {
    name: "web_search",
    description: `Search the web for information to SUPPLEMENT database results.

    ONLY use when:
    - Database fields (ai_summary, company_description, key_differentiators) are sparse/NULL
    - External context adds value to database ai_tags and ai_insights
    - Question needs current events not in database topics

    ALWAYS query database FIRST (contractors, strategic_partners, events, books tables) before considering web search.

    Database has rich fields: focus_areas, ai_summary, ai_tags, ai_insights, business_goals, power_confidence_score, engagement_score.
    Use these FIRST.`,

    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (be specific and concise)"
        },
        purpose: {
          type: "string",
          enum: ["enrich_entity", "validate_trends", "current_events", "context_supplement"],
          description: `Why you're using web search:
          - enrich_entity: Database company_description/key_differentiators is NULL/sparse
          - validate_trends: Validate database ai_tags patterns with external data
          - current_events: Need recent news not in database topics
          - context_supplement: Add context to database ai_insights`
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default: 5, max: 10)",
          default: 5
        }
      },
      required: ["query", "purpose"]
    }
  }
}
```

---

## Implementation Steps

### Step 1: Set Up Brave Search API (15 minutes)
1. Sign up for Brave Search API: https://brave.com/search/api/
2. Get API key (free tier: 2,000 queries/month)
3. Add to `.env.development`: `BRAVE_SEARCH_API_KEY=...`
4. Test API key with curl command
5. Document API key location for production deployment

### Step 2: Create Web Search Service (30 minutes)
1. Create `tpe-backend/src/services/webSearchService.js`
2. Implement `searchWeb(query, options)` with Brave API integration
3. Implement result formatting (extract title, url, description, date)
4. Add error handling (API errors, rate limits, network failures)
5. Add logging for search tracking (query, purpose, result count, timestamp)

### Step 3: Integrate with AI Concierge (20 minutes)
1. Add `web_search` to tools array in `aiConciergeService.js`
2. Add function definition for OpenAI (with database field references)
3. Update `executeToolCall()` to handle `web_search` case
4. Add result formatting for AI consumption (structured JSON)
5. Add usage tracking (log each search with purpose)

### Step 4: Update System Prompt (15 minutes)
1. Add database-first priority instructions (reference verified fields)
2. Add web search usage criteria (sparse company_description, NULL ai_summary, etc.)
3. Add purpose specification requirement (enrich_entity, validate_trends, etc.)
4. Add examples of appropriate usage (with actual database field checks)
5. Add examples of inappropriate usage (when database fields are sufficient)

### Step 5: Testing (30 minutes)
1. **Test database-only queries** (verify no web search):
   - "Show me contractors with marketing focus"
   - Should query focus_areas field, return results, NO web search

2. **Test entity enrichment** (verify supplemental behavior):
   - "Tell me about Partner X" where company_description is NULL
   - Should query strategic_partners FIRST, then web search to enrich

3. **Test trend analysis** (verify database data comes first):
   - "What are contractor marketing trends?"
   - Should analyze ai_tags, focus_areas, topics FIRST, then add web context

4. **Verify purpose tracking in logs**:
   - Check that each search logs purpose parameter correctly

**Total Estimated Time: ~2 hours**

---

## Success Criteria (Database Fields Verified)

### Phase 1 Complete When:

✅ **Functional Requirements**
- [ ] Brave Search API integrated and working
- [ ] Web search available as OpenAI function tool
- [ ] AI correctly prioritizes database queries first
- [ ] AI checks database fields (ai_summary, company_description, key_differentiators) before web search
- [ ] Web search only used as supplement when database fields are sparse
- [ ] Purpose parameter tracked in all searches

✅ **Behavior Verification (Specific Database Field Tests)**
- [ ] Pure database query: "Show contractors with marketing focus"
  - Queries: contractors.focus_areas
  - Expected: NO web search triggered

- [ ] Entity enrichment: "Tell me about Partner X" (where partner.company_description IS NULL)
  - Queries: strategic_partners.company_name, ai_summary, key_differentiators FIRST
  - Expected: Web search used AFTER database query to fill gaps

- [ ] Trend analysis: "What are contractor marketing trends?"
  - Queries: contractors.ai_tags, focus_areas, books.topics FIRST
  - Expected: Database patterns presented FIRST, web search adds external context

- [ ] Sparse profile: Partner with NULL ai_generated_differentiators
  - Queries: strategic_partners fields FIRST (company_description, key_differentiators)
  - Expected: Web search supplements sparse database fields appropriately

✅ **Quality Checks**
- [ ] Search results properly formatted for AI consumption
- [ ] Error handling prevents AI failures when search unavailable
- [ ] Logging tracks all search usage (query, purpose, database fields checked first)
- [ ] Rate limiting prevents API overuse (track queries/day)

---

## Risk Mitigation

### Risk 1: AI Over-Uses Web Search
**Mitigation**:
- Strong system prompt with database field references
- Purpose requirement forces justification
- Logging tracks usage patterns
- Monitor queries/day to detect overuse

### Risk 2: Web Search Dominates Database Data
**Mitigation**:
- Prompt explicitly states database fields (ai_summary, power_confidence_score) must be presented prominently
- Function description emphasizes SUPPLEMENT only
- Test cases verify database data comes first

### Risk 3: API Rate Limits Exceeded
**Mitigation**:
- Implement request counter (track queries/day)
- Warn at 80% of 2,000/month limit (66 queries/day)
- Log purpose to identify unnecessary usage
- System prompt discourages unnecessary searches

### Risk 4: Search Results Low Quality
**Mitigation**:
- Result filtering (remove ads, prioritize recent)
- Relevance scoring (Phase 2 enhancement)
- Max 5 results to prevent information overload

---

## Next Steps

1. ✅ Database schemas verified (contractors, strategic_partners, events, books)
2. ❓ Review and approve this implementation plan
3. ❓ Obtain Brave Search API key
4. ⏳ Proceed to Pre-Flight Checklist (create next document)
5. ⏳ Execute implementation steps
6. ⏳ Complete testing and verification
7. ⏳ Document completion summary

---

## Related Documentation

- `PHASE-1-PRE-FLIGHT-CHECKLIST.md` - Pre-implementation verification (to be created)
- `PHASE-1-COMPLETION-SUMMARY.md` - Post-implementation summary (created after completion)
- `../../AI-CONCIERGE-COMPLETE-GUIDE.md` - Overall AI Concierge architecture
- `../SMS-EMAIL-TOOLS-PRE-FLIGHT-CHECKLIST.md` - Similar tool integration pattern
- `DATABASE-CONNECTION-PATTERN.md` - How to verify database schemas
- `AI-CONCIERGE-DATA-INTEGRATION-PROCESS.md` - How AI processes database fields

---

## Database Schema Change Detection

**IMPORTANT**: If database schemas change, this document must be updated.

**How to Re-Verify**:
```bash
# Run these commands to verify current schemas:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' ORDER BY ordinal_position;\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'books' ORDER BY ordinal_position;\""
```

**Last Verified**: October 29, 2025
**Next Verification Due**: When adding new database columns or before Phase 1 implementation

---

## Questions for Stakeholder

1. ✅ Confirm database-first priority strategy with verified field names
2. ✅ Confirmed all database field names are 100% aligned with actual schema
3. ❓ Brave Search API key - do you want to obtain or should I provide instructions?
4. ❓ Any specific use cases to prioritize in Phase 1 testing?
5. ❓ Should we track search costs/usage in analytics dashboard?
6. ❓ Should we add search results to any database tables (e.g., cache enrichment data)?
