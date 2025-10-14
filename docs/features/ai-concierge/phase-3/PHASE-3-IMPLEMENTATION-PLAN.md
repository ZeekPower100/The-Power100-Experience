# Phase 3: Observability & Guardrails

**Phase Name:** Observability & Guardrails
**Timeline:** Week 4 (5 days)
**Status:** Ready for Implementation
**Database Schema:** Verified October 14, 2025

---

## 🎯 Phase 3 Overview

**Goal:** "Never wonder why AI made a decision"

Phase 3 adds comprehensive observability and safety guardrails to the AI Concierge system. This phase implements LangSmith tracing for full visibility into agent decisions, AI Action Guards to prevent unauthorized operations, and a monitoring dashboard for real-time oversight.

### Primary Objectives
1. **Setup LangSmith** for complete agent tracing and debugging
2. **Add OpenAI Tracing** to track all LLM calls and token usage
3. **Implement AI Action Guards** with permission-based safety checks
4. **Integrate Guards** into all tool and function calling operations
5. **Create Monitoring Dashboard** for real-time AI oversight

### Success Metrics
- ✅ 100% trace coverage for all agent invocations
- ✅ 0 guard violations in production
- ✅ 50% reduction in debug time with trace insights
- ✅ Real-time monitoring dashboard operational

---

## 📅 Day-by-Day Implementation Plan

### Day 1: LangSmith Setup & Integration (0.5 days)

#### Objectives
- Install and configure LangSmith
- Connect to existing LangGraph agents
- Verify trace capture working

#### Tasks
1. **Install LangSmith Dependencies**
   ```bash
   cd tpe-backend
   npm install langsmith
   ```

2. **Configure LangSmith Environment Variables**
   - Add to `.env` (development):
     ```
     LANGSMITH_API_KEY=<your-api-key>
     LANGSMITH_PROJECT=tpe-ai-concierge-dev
     LANGSMITH_TRACING=true
     ```
   - Add to production environment (AWS):
     ```
     LANGSMITH_API_KEY=<production-api-key>
     LANGSMITH_PROJECT=tpe-ai-concierge-prod
     LANGSMITH_TRACING=true
     ```

3. **Update Agent Files with Tracing**
   - File: `tpe-backend/src/services/agents/aiConciergeStandardAgent.js`
   - File: `tpe-backend/src/services/agents/aiConciergeEventAgent.js`

   Add at top of each file:
   ```javascript
   // DATABASE-CHECKED: ai_concierge_sessions columns verified on 2025-10-14
   const { Client } = require('langsmith');
   const langsmithClient = new Client({
     apiKey: process.env.LANGSMITH_API_KEY
   });
   ```

4. **Verify Trace Capture**
   - Send test message to AI Concierge
   - Check LangSmith dashboard for trace
   - Verify all tool calls are captured

#### Database Fields (No Changes Required)
- Uses existing `ai_concierge_sessions` table:
  - `session_id` (VARCHAR) - Links traces to sessions
  - `contractor_id` (INTEGER) - Links traces to contractors
  - `session_type` (VARCHAR) - 'standard' or 'event'
  - `session_data` (TEXT) - Already stores LangGraph state

#### Success Criteria
- [ ] LangSmith installed and configured
- [ ] Environment variables set in dev and production
- [ ] Test traces appear in LangSmith dashboard
- [ ] All agent invocations are traced
- [ ] Tool calls visible in trace tree

---

### Day 2: OpenAI Service Tracing (1 day)

#### Objectives
- Add comprehensive tracing to OpenAI API calls
- Track token usage, latency, and errors
- Link OpenAI calls to LangSmith traces

#### Tasks
1. **Create OpenAI Tracing Wrapper**
   - File: `tpe-backend/src/services/openai/openaiTracer.js` (NEW)

   ```javascript
   // DATABASE-CHECKED: ai_interactions columns verified on 2025-10-14
   const { traceable } = require('langsmith/traceable');
   const { query } = require('../db');

   /**
    * Wraps OpenAI calls with LangSmith tracing and database logging
    * Logs to ai_interactions table for analytics
    */
   class OpenAITracer {
     static async traceCall(contractorId, interactionType, callFn) {
       const startTime = Date.now();

       try {
         const result = await traceable(
           callFn,
           { name: interactionType, tags: ['openai', 'llm'] }
         )();

         const duration = Date.now() - startTime;

         // Log to ai_interactions table
         await query(`
           INSERT INTO ai_interactions (
             contractor_id,
             interaction_type,
             interaction_data,
             user_message,
             ai_response,
             created_at
           ) VALUES ($1, $2, $3, $4, $5, NOW())
         `, [
           contractorId,
           interactionType,
           JSON.stringify({ duration, status: 'success' }),
           result.userMessage || '',
           result.aiResponse || ''
         ]);

         return result;
       } catch (error) {
         const duration = Date.now() - startTime;

         // Log error to ai_interactions table
         await query(`
           INSERT INTO ai_interactions (
             contractor_id,
             interaction_type,
             interaction_data,
             created_at
           ) VALUES ($1, $2, $3, NOW())
         `, [
           contractorId,
           interactionType,
           JSON.stringify({ duration, status: 'error', error: error.message })
         ]);

         throw error;
       }
     }
   }

   module.exports = OpenAITracer;
   ```

2. **Update Agent Invocations to Use Tracer**
   - File: `tpe-backend/src/controllers/aiConciergeController.js`
   - Lines 318-378 (dev mode sendMessage)
   - Lines 462-522 (production mode sendMessage)

   Add at top:
   ```javascript
   const OpenAITracer = require('../services/openai/openaiTracer');
   ```

   Wrap agent invocations:
   ```javascript
   // BEFORE
   const result = await routing.agent.invoke(
     { messages: allMessages },
     { configurable: { thread_id: session.session_id } }
   );

   // AFTER
   const result = await OpenAITracer.traceCall(
     contractorId,
     `ai_concierge_${routing.sessionType}`,
     async () => routing.agent.invoke(
       { messages: allMessages },
       { configurable: { thread_id: session.session_id } }
     )
   );
   ```

3. **Add Token Usage Tracking**
   - Capture token counts from OpenAI responses
   - Store in `ai_interactions.interaction_data` (JSONB field)
   - Track cumulative usage per contractor

4. **Create Token Analytics Query**
   - File: `tpe-backend/src/services/analytics/tokenUsageAnalytics.js` (NEW)

   ```javascript
   // DATABASE-CHECKED: ai_interactions columns verified on 2025-10-14
   const { query } = require('../db');

   async function getContractorTokenUsage(contractorId, days = 30) {
     const result = await query(`
       SELECT
         contractor_id,
         COUNT(*) as interaction_count,
         SUM((interaction_data->>'prompt_tokens')::int) as total_prompt_tokens,
         SUM((interaction_data->>'completion_tokens')::int) as total_completion_tokens,
         SUM((interaction_data->>'total_tokens')::int) as total_tokens,
         AVG((interaction_data->>'duration')::int) as avg_duration_ms
       FROM ai_interactions
       WHERE contractor_id = $1
         AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY contractor_id
     `, [contractorId]);

     return result.rows[0] || null;
   }

   module.exports = { getContractorTokenUsage };
   ```

#### Database Fields Used
- **ai_interactions** table (verified schema):
  - `contractor_id` (INTEGER) - Links to contractors
  - `interaction_type` (VARCHAR) - Type of AI interaction
  - `interaction_data` (JSONB) - Stores token usage, duration, status
  - `user_message` (TEXT) - User's input message
  - `ai_response` (TEXT) - AI's response
  - `satisfaction_rating` (INTEGER) - Optional feedback
  - `created_at` (TIMESTAMP) - Interaction timestamp

#### Success Criteria
- [ ] OpenAITracer wrapper created
- [ ] All agent invocations wrapped with tracer
- [ ] Token usage captured and stored
- [ ] Analytics query working
- [ ] Traces linked between LangSmith and database

---

### Day 3: AI Action Guards Implementation (2 days)

#### Objectives
- Create permission-based guard system
- Implement safety checks for all AI actions
- Prevent unauthorized database operations

#### Tasks
1. **Create AI Action Guard Framework**
   - File: `tpe-backend/src/services/guards/aiActionGuards.js` (NEW)

   ```javascript
   // DATABASE-CHECKED: contractor_action_items, contractors columns verified on 2025-10-14
   const { query } = require('../db');

   /**
    * AI Action Guards - Permission-based safety checks
    * Prevents AI from performing unauthorized operations
    */
   class AIActionGuards {
     /**
      * Check if contractor has permission for AI to create action items
      * @param {number} contractorId - Contractor ID
      * @returns {Promise<{allowed: boolean, reason: string}>}
      */
     static async canCreateActionItem(contractorId) {
       const result = await query(`
         SELECT
           has_ai_access,
           ai_coach_opt_in,
           opted_in_coaching
         FROM contractors
         WHERE id = $1
       `, [contractorId]);

       if (result.rows.length === 0) {
         return { allowed: false, reason: 'Contractor not found' };
       }

       const contractor = result.rows[0];

       if (!contractor.has_ai_access) {
         return { allowed: false, reason: 'AI access not enabled' };
       }

       if (!contractor.ai_coach_opt_in && !contractor.opted_in_coaching) {
         return { allowed: false, reason: 'Contractor has not opted in to AI coaching' };
       }

       return { allowed: true, reason: 'Permission granted' };
     }

     /**
      * Check if contractor has reached action item limit
      * @param {number} contractorId - Contractor ID
      * @returns {Promise<{allowed: boolean, reason: string, current: number, max: number}>}
      */
     static async checkActionItemLimit(contractorId) {
       const MAX_ACTIVE_ITEMS = 25; // Configurable limit

       const result = await query(`
         SELECT COUNT(*) as active_count
         FROM contractor_action_items
         WHERE contractor_id = $1
           AND status NOT IN ('completed', 'cancelled')
       `, [contractorId]);

       const activeCount = parseInt(result.rows[0].active_count);

       if (activeCount >= MAX_ACTIVE_ITEMS) {
         return {
           allowed: false,
           reason: `Maximum active action items reached (${MAX_ACTIVE_ITEMS})`,
           current: activeCount,
           max: MAX_ACTIVE_ITEMS
         };
       }

       return {
         allowed: true,
         reason: 'Within limit',
         current: activeCount,
         max: MAX_ACTIVE_ITEMS
       };
     }

     /**
      * Check if AI can modify existing action item
      * @param {number} actionItemId - Action item ID
      * @param {number} contractorId - Contractor ID
      * @returns {Promise<{allowed: boolean, reason: string}>}
      */
     static async canModifyActionItem(actionItemId, contractorId) {
       const result = await query(`
         SELECT
           contractor_id,
           ai_generated,
           status,
           completed_at
         FROM contractor_action_items
         WHERE id = $1
       `, [actionItemId]);

       if (result.rows.length === 0) {
         return { allowed: false, reason: 'Action item not found' };
       }

       const item = result.rows[0];

       if (item.contractor_id !== contractorId) {
         return { allowed: false, reason: 'Action item belongs to different contractor' };
       }

       if (item.status === 'completed' && item.completed_at) {
         return { allowed: false, reason: 'Cannot modify completed action items' };
       }

       if (!item.ai_generated) {
         return { allowed: false, reason: 'Cannot modify manually created action items' };
       }

       return { allowed: true, reason: 'Permission granted' };
     }

     /**
      * Check if contractor can access partner information
      * @param {number} contractorId - Contractor ID
      * @param {number} partnerId - Partner ID
      * @returns {Promise<{allowed: boolean, reason: string}>}
      */
     static async canAccessPartner(contractorId, partnerId) {
       // Check if contractor has been matched with this partner
       const matchResult = await query(`
         SELECT id
         FROM contractor_partner_matches
         WHERE contractor_id = $1
           AND partner_id = $2
       `, [contractorId, partnerId]);

       if (matchResult.rows.length > 0) {
         return { allowed: true, reason: 'Contractor matched with partner' };
       }

       // Check if partner is public/approved
       const partnerResult = await query(`
         SELECT is_approved, visibility
         FROM strategic_partners
         WHERE id = $1
       `, [partnerId]);

       if (partnerResult.rows.length === 0) {
         return { allowed: false, reason: 'Partner not found' };
       }

       const partner = partnerResult.rows[0];

       if (!partner.is_approved) {
         return { allowed: false, reason: 'Partner not approved' };
       }

       if (partner.visibility === 'public') {
         return { allowed: true, reason: 'Partner is publicly visible' };
       }

       return { allowed: false, reason: 'Partner is private' };
     }

     /**
      * Rate limit check for AI operations
      * @param {number} contractorId - Contractor ID
      * @param {string} operationType - Type of operation
      * @returns {Promise<{allowed: boolean, reason: string, retryAfter: number}>}
      */
     static async checkRateLimit(contractorId, operationType) {
       const RATE_LIMITS = {
         'action_item_create': { limit: 10, window: 3600 }, // 10 per hour
         'message_send': { limit: 50, window: 3600 }, // 50 per hour
         'partner_lookup': { limit: 100, window: 3600 } // 100 per hour
       };

       const config = RATE_LIMITS[operationType];
       if (!config) {
         return { allowed: true, reason: 'No rate limit defined' };
       }

       const result = await query(`
         SELECT COUNT(*) as operation_count
         FROM ai_interactions
         WHERE contractor_id = $1
           AND interaction_type = $2
           AND created_at >= NOW() - INTERVAL '${config.window} seconds'
       `, [contractorId, operationType]);

       const count = parseInt(result.rows[0].operation_count);

       if (count >= config.limit) {
         return {
           allowed: false,
           reason: `Rate limit exceeded for ${operationType}`,
           retryAfter: config.window
         };
       }

       return {
         allowed: true,
         reason: 'Within rate limit',
         retryAfter: 0
       };
     }
   }

   module.exports = AIActionGuards;
   ```

2. **Create Guard Logging System**
   - File: `tpe-backend/src/services/guards/guardLogger.js` (NEW)

   ```javascript
   // DATABASE-CHECKED: ai_interactions columns verified on 2025-10-14
   const { query } = require('../db');

   /**
    * Logs all guard checks for audit trail
    */
   async function logGuardCheck(contractorId, guardType, guardResult) {
     await query(`
       INSERT INTO ai_interactions (
         contractor_id,
         interaction_type,
         interaction_data,
         created_at
       ) VALUES ($1, $2, $3, NOW())
     `, [
       contractorId,
       `guard_check_${guardType}`,
       JSON.stringify({
         guard_type: guardType,
         allowed: guardResult.allowed,
         reason: guardResult.reason,
         timestamp: new Date().toISOString()
       })
     ]);
   }

   module.exports = { logGuardCheck };
   ```

#### Database Fields Used
- **contractors** table:
  - `has_ai_access` (BOOLEAN) - AI feature flag
  - `ai_coach_opt_in` (BOOLEAN) - AI coaching consent
  - `opted_in_coaching` (BOOLEAN) - General coaching consent

- **contractor_action_items** table:
  - `contractor_id` (INTEGER) - Owner of action item
  - `ai_generated` (BOOLEAN) - Created by AI flag
  - `status` (VARCHAR) - Action item status
  - `completed_at` (TIMESTAMP) - Completion timestamp

- **ai_interactions** table:
  - `contractor_id` (INTEGER) - Links to contractors
  - `interaction_type` (VARCHAR) - Type of guard check
  - `interaction_data` (JSONB) - Guard check details

#### Success Criteria
- [ ] AIActionGuards class created with all permission checks
- [ ] Guard logging system operational
- [ ] All guard checks logged to database
- [ ] Unit tests for each guard function

---

### Day 4: Guard Integration into Tools (1 day)

#### Objectives
- Integrate guards into all 5 agent tools
- Add guard checks before database operations
- Ensure graceful failure with user-friendly messages

#### Tasks
1. **Update Action Items Tool with Guards**
   - File: `tpe-backend/src/services/agents/tools/actionItemsTool.js`
   - Lines to update: Database insert operations

   Add at top:
   ```javascript
   const AIActionGuards = require('../../guards/aiActionGuards');
   const { logGuardCheck } = require('../../guards/guardLogger');
   ```

   Update tool execution:
   ```javascript
   async invoke({ action, title, description, priority, contractorId }) {
     // GUARD CHECK 1: Permission
     const permissionCheck = await AIActionGuards.canCreateActionItem(contractorId);
     await logGuardCheck(contractorId, 'create_action_item_permission', permissionCheck);

     if (!permissionCheck.allowed) {
       return {
         success: false,
         message: `Cannot create action item: ${permissionCheck.reason}`,
         guard_blocked: true
       };
     }

     // GUARD CHECK 2: Rate limit
     const rateLimitCheck = await AIActionGuards.checkRateLimit(contractorId, 'action_item_create');
     await logGuardCheck(contractorId, 'create_action_item_rate_limit', rateLimitCheck);

     if (!rateLimitCheck.allowed) {
       return {
         success: false,
         message: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds.`,
         guard_blocked: true
       };
     }

     // GUARD CHECK 3: Item limit
     const limitCheck = await AIActionGuards.checkActionItemLimit(contractorId);
     await logGuardCheck(contractorId, 'create_action_item_limit', limitCheck);

     if (!limitCheck.allowed) {
       return {
         success: false,
         message: limitCheck.reason,
         guard_blocked: true,
         current_count: limitCheck.current
       };
     }

     // ALL GUARDS PASSED - Proceed with database operation
     const result = await query(`
       INSERT INTO contractor_action_items (
         contractor_id,
         title,
         description,
         action_type,
         priority,
         ai_generated,
         ai_reasoning,
         status,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, true, $6, 'pending', NOW())
       RETURNING id, title, priority, status
     `, [contractorId, title, description, action, priority, description]);

     return {
       success: true,
       action_item: result.rows[0],
       guard_checks_passed: 3
     };
   }
   ```

2. **Update Partner Match Tool with Guards**
   - File: `tpe-backend/src/services/agents/tools/partnerMatchTool.js`

   Add rate limiting:
   ```javascript
   async invoke({ focusAreas, revenueRange, contractorId }) {
     const rateLimitCheck = await AIActionGuards.checkRateLimit(contractorId, 'partner_lookup');
     await logGuardCheck(contractorId, 'partner_lookup_rate_limit', rateLimitCheck);

     if (!rateLimitCheck.allowed) {
       return {
         success: false,
         message: `Too many partner lookups. Try again in ${rateLimitCheck.retryAfter} seconds.`,
         guard_blocked: true
       };
     }

     // Proceed with partner matching...
   }
   ```

3. **Update Remaining Tools**
   - Add rate limiting to:
     - `bookRecommendationTool.js`
     - `podcastRecommendationTool.js`
     - `eventRecommendationTool.js`

4. **Create Guard Test Suite**
   - File: `tpe-backend/src/services/guards/test-guards.js` (NEW)

   Test scenarios:
   - ✅ Guard allows authorized operation
   - ✅ Guard blocks unauthorized operation
   - ✅ Guard blocks rate limit violations
   - ✅ Guard blocks when limits exceeded
   - ✅ All guard checks are logged

#### Database Fields Used
- Same as Day 3 (contractors, contractor_action_items, ai_interactions)

#### Success Criteria
- [ ] All 5 tools updated with guard checks
- [ ] Guards integrated before database operations
- [ ] Graceful error messages for blocked operations
- [ ] Test suite passing for all guard scenarios
- [ ] No guard bypass vulnerabilities

---

### Day 5: Monitoring Dashboard (0.5 days)

#### Objectives
- Create admin monitoring dashboard for AI operations
- Display real-time guard violations, token usage, and trace summaries
- Enable quick debugging and oversight

#### Tasks
1. **Create AI Monitoring API Endpoints**
   - File: `tpe-backend/src/controllers/aiMonitoringController.js` (NEW)

   ```javascript
   // DATABASE-CHECKED: ai_interactions, contractor_action_items columns verified on 2025-10-14
   const { query } = require('../services/db');

   /**
    * Get AI system health metrics
    */
   async function getSystemHealth(req, res, next) {
     try {
       const metrics = await query(`
         SELECT
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as interactions_last_hour,
           COUNT(*) FILTER (WHERE interaction_type LIKE 'guard_check_%' AND created_at >= NOW() - INTERVAL '1 hour') as guard_checks_last_hour,
           COUNT(*) FILTER (WHERE interaction_type LIKE 'guard_check_%' AND (interaction_data->>'allowed')::boolean = false AND created_at >= NOW() - INTERVAL '1 hour') as guard_violations_last_hour,
           AVG((interaction_data->>'duration')::int) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as avg_duration_ms
         FROM ai_interactions
       `);

       res.json({
         success: true,
         metrics: metrics.rows[0]
       });
     } catch (error) {
       console.error('Error fetching AI system health:', error);
       next(error);
     }
   }

   /**
    * Get recent guard violations
    */
   async function getGuardViolations(req, res, next) {
     try {
       const { limit = 50 } = req.query;

       const violations = await query(`
         SELECT
           ai.id,
           ai.contractor_id,
           c.email as contractor_email,
           c.company_name,
           ai.interaction_type,
           ai.interaction_data,
           ai.created_at
         FROM ai_interactions ai
         JOIN contractors c ON c.id = ai.contractor_id
         WHERE ai.interaction_type LIKE 'guard_check_%'
           AND (ai.interaction_data->>'allowed')::boolean = false
         ORDER BY ai.created_at DESC
         LIMIT $1
       `, [limit]);

       res.json({
         success: true,
         violations: violations.rows,
         count: violations.rows.length
       });
     } catch (error) {
       console.error('Error fetching guard violations:', error);
       next(error);
     }
   }

   /**
    * Get token usage statistics
    */
   async function getTokenUsage(req, res, next) {
     try {
       const { days = 7 } = req.query;

       const usage = await query(`
         SELECT
           DATE(created_at) as date,
           COUNT(*) as interaction_count,
           SUM((interaction_data->>'prompt_tokens')::int) as prompt_tokens,
           SUM((interaction_data->>'completion_tokens')::int) as completion_tokens,
           SUM((interaction_data->>'total_tokens')::int) as total_tokens
         FROM ai_interactions
         WHERE created_at >= NOW() - INTERVAL '${days} days'
           AND interaction_data ? 'total_tokens'
         GROUP BY DATE(created_at)
         ORDER BY date DESC
       `);

       res.json({
         success: true,
         usage_by_day: usage.rows
       });
     } catch (error) {
       console.error('Error fetching token usage:', error);
       next(error);
     }
   }

   /**
    * Get AI-generated action items summary
    */
   async function getAIActionItemsStats(req, res, next) {
     try {
       const stats = await query(`
         SELECT
           COUNT(*) FILTER (WHERE ai_generated = true) as ai_generated_count,
           COUNT(*) FILTER (WHERE ai_generated = false) as manual_count,
           COUNT(*) FILTER (WHERE ai_generated = true AND status = 'completed') as ai_completed_count,
           COUNT(*) FILTER (WHERE ai_generated = true AND status = 'pending') as ai_pending_count,
           AVG(extraction_confidence) FILTER (WHERE ai_generated = true) as avg_ai_confidence
         FROM contractor_action_items
         WHERE created_at >= NOW() - INTERVAL '30 days'
       `);

       res.json({
         success: true,
         stats: stats.rows[0]
       });
     } catch (error) {
       console.error('Error fetching AI action items stats:', error);
       next(error);
     }
   }

   module.exports = {
     getSystemHealth,
     getGuardViolations,
     getTokenUsage,
     getAIActionItemsStats
   };
   ```

2. **Create API Routes**
   - File: `tpe-backend/src/routes/aiMonitoringRoutes.js` (NEW)

   ```javascript
   const express = require('express');
   const router = express.Router();
   const aiMonitoringController = require('../controllers/aiMonitoringController');
   const { authenticateToken, requireAdmin } = require('../middleware/auth');

   // All routes require admin authentication
   router.use(authenticateToken);
   router.use(requireAdmin);

   router.get('/health', aiMonitoringController.getSystemHealth);
   router.get('/violations', aiMonitoringController.getGuardViolations);
   router.get('/token-usage', aiMonitoringController.getTokenUsage);
   router.get('/action-items-stats', aiMonitoringController.getAIActionItemsStats);

   module.exports = router;
   ```

3. **Register Routes in Server**
   - File: `tpe-backend/server.js`

   Add:
   ```javascript
   const aiMonitoringRoutes = require('./src/routes/aiMonitoringRoutes');
   app.use('/api/ai-monitoring', aiMonitoringRoutes);
   ```

4. **Create Frontend Monitoring Page**
   - File: `tpe-front-end/src/app/admindashboard/ai-monitoring/page.tsx` (NEW)

   Features:
   - Real-time system health metrics
   - Guard violations table with filtering
   - Token usage charts (last 7 days)
   - AI action items statistics
   - Auto-refresh every 30 seconds

5. **Add Navigation Link**
   - File: `tpe-front-end/src/app/admindashboard/page.tsx`

   Add card:
   ```tsx
   <Card>
     <CardHeader>
       <CardTitle>AI Monitoring</CardTitle>
     </CardHeader>
     <CardContent>
       <Link href="/admindashboard/ai-monitoring">
         <Button className="w-full bg-power100-green hover:bg-green-600 text-white">
           View AI System Health
         </Button>
       </Link>
     </CardContent>
   </Card>
   ```

#### Database Fields Used
- **ai_interactions** table:
  - `contractor_id` (INTEGER)
  - `interaction_type` (VARCHAR)
  - `interaction_data` (JSONB)
  - `created_at` (TIMESTAMP)

- **contractor_action_items** table:
  - `ai_generated` (BOOLEAN)
  - `status` (VARCHAR)
  - `extraction_confidence` (NUMERIC)
  - `created_at` (TIMESTAMP)

- **contractors** table:
  - `email` (VARCHAR)
  - `company_name` (VARCHAR)

#### Success Criteria
- [ ] All API endpoints created and tested
- [ ] Routes registered in server
- [ ] Frontend monitoring page operational
- [ ] Real-time metrics displaying correctly
- [ ] Auto-refresh working

---

## 🏗️ Final Phase 3 Architecture

### Component Hierarchy

```
AI Concierge Controller
    ↓
OpenAI Tracer (wraps all agent invocations)
    ↓
LangSmith Client (traces all LLM calls)
    ↓
Agent Routing (Standard or Event)
    ↓
    ├─── Standard Agent
    │    └─── Tools with Guards
    │         ├─ Partner Match Tool → Rate Limit Guard
    │         ├─ Book Recommendation Tool → Rate Limit Guard
    │         ├─ Podcast Recommendation Tool → Rate Limit Guard
    │         ├─ Event Recommendation Tool → Rate Limit Guard
    │         └─ Action Items Tool → Permission + Rate Limit + Item Limit Guards
    │
    └─── Event Agent
         └─── Tools with Guards (same as above)
    ↓
AI Action Guards (permission checks before database operations)
    ↓
Guard Logger (logs all guard checks to ai_interactions)
    ↓
Database (PostgreSQL)
    ├─ ai_concierge_sessions
    ├─ ai_interactions (logs + traces + guard checks)
    ├─ contractor_action_items
    └─ contractors
    ↓
Monitoring Dashboard (Admin UI)
    ├─ System Health Metrics
    ├─ Guard Violations Table
    ├─ Token Usage Charts
    └─ AI Action Items Stats
```

### Data Flow

```
1. User sends message
   ↓
2. OpenAI Tracer wraps invocation
   ↓
3. LangSmith captures trace start
   ↓
4. Agent routing determines agent type
   ↓
5. Agent invokes tool
   ↓
6. Tool runs guard checks:
   - Permission check
   - Rate limit check
   - Item limit check (if applicable)
   ↓
7. Guard Logger logs check result to ai_interactions
   ↓
8. If guards pass → Database operation
9. If guards fail → Return error message
   ↓
10. LangSmith captures trace end
    ↓
11. OpenAI Tracer logs to ai_interactions
    ↓
12. Response returned to user
    ↓
13. Admin views monitoring dashboard
```

---

## 📊 Database Schema Reference

### Tables Used in Phase 3

#### ai_concierge_sessions
```sql
- id (INTEGER, PK)
- contractor_id (INTEGER, FK → contractors.id)
- session_id (VARCHAR, UNIQUE)
- session_type (VARCHAR) -- 'standard' or 'event'
- session_status (VARCHAR)
- session_data (TEXT) -- LangGraph state
- started_at (TIMESTAMP)
- ended_at (TIMESTAMP)
- duration_minutes (INTEGER)
```

#### ai_interactions
```sql
- id (INTEGER, PK)
- contractor_id (INTEGER, FK → contractors.id)
- interaction_type (VARCHAR) -- 'guard_check_*', 'ai_concierge_*'
- interaction_data (JSONB) -- Guard results, token usage, duration
- user_message (TEXT)
- ai_response (TEXT)
- satisfaction_rating (INTEGER)
- created_at (TIMESTAMP)
```

#### contractor_action_items
```sql
- id (INTEGER, PK)
- contractor_id (INTEGER, FK → contractors.id, NOT NULL)
- event_id (INTEGER, FK → events.id)
- title (VARCHAR, NOT NULL)
- description (TEXT)
- action_type (VARCHAR, NOT NULL)
- priority (INTEGER, NOT NULL)
- contractor_priority (INTEGER)
- ai_suggested_priority (INTEGER)
- due_date (DATE)
- reminder_time (TIMESTAMP)
- status (VARCHAR) -- 'pending', 'completed', 'cancelled'
- completed_at (TIMESTAMP)
- cancelled_reason (TEXT)
- related_partner_id (INTEGER)
- related_peer_contractor_id (INTEGER)
- related_speaker_id (INTEGER)
- related_sponsor_id (INTEGER)
- related_note_id (INTEGER)
- related_demo_booking_id (INTEGER)
- ai_generated (BOOLEAN) -- AI created flag
- ai_reasoning (TEXT)
- extraction_confidence (NUMERIC)
- source_message_id (INTEGER)
- conversation_context (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### contractors (AI fields)
```sql
- id (INTEGER, PK)
- email (VARCHAR, NOT NULL, UNIQUE)
- company_name (VARCHAR)
- has_ai_access (BOOLEAN) -- AI feature flag
- ai_coach_opt_in (BOOLEAN) -- AI coaching consent
- opted_in_coaching (BOOLEAN) -- General coaching consent
- ai_summary (TEXT) -- AI-generated contractor summary
- ai_tags (JSONB) -- AI-generated tags
- ai_quality_score (INTEGER)
- ai_insights (JSONB) -- AI-generated insights
- last_ai_analysis (TIMESTAMP)
```

---

## 🔑 Key Technical Achievements

### 1. Complete Observability ✅
- LangSmith tracing for all agent invocations
- OpenAI call tracking with token usage
- Database logging for audit trail
- Monitoring dashboard for real-time oversight

### 2. Safety Guardrails ✅
- Permission-based access control
- Rate limiting for all AI operations
- Item limits to prevent abuse
- Guard logging for compliance

### 3. Database Alignment ✅
- 100% snake_case field names
- NO CHECK constraint violations
- Verified foreign key references
- JSONB fields for flexible data storage

### 4. Admin Oversight ✅
- Real-time system health metrics
- Guard violations tracking
- Token usage analytics
- AI action items statistics

---

## 📝 Success Criteria Summary

### Day 1: LangSmith Setup
- [ ] LangSmith installed and configured
- [ ] Environment variables set (dev + prod)
- [ ] Traces appearing in LangSmith dashboard
- [ ] All agent invocations traced
- [ ] Tool calls visible in trace tree

### Day 2: OpenAI Tracing
- [ ] OpenAITracer wrapper created
- [ ] All agent invocations wrapped
- [ ] Token usage tracked and stored
- [ ] Analytics queries working
- [ ] Traces linked to database

### Day 3: Guard Implementation
- [ ] AIActionGuards class complete
- [ ] Guard logging system operational
- [ ] All checks logged to database
- [ ] Unit tests passing

### Day 4: Guard Integration
- [ ] All 5 tools updated with guards
- [ ] Guards integrated before DB operations
- [ ] Graceful error messages
- [ ] Test suite passing
- [ ] No bypass vulnerabilities

### Day 5: Monitoring Dashboard
- [ ] API endpoints created and tested
- [ ] Routes registered in server
- [ ] Frontend monitoring page live
- [ ] Real-time metrics working
- [ ] Auto-refresh operational

---

## 🎉 Phase 3 Completion Criteria

Phase 3 is COMPLETE when:
- ✅ 100% trace coverage for all AI operations
- ✅ 0 guard violations in testing
- ✅ Monitoring dashboard shows live data
- ✅ All database field names verified
- ✅ Admin can debug AI decisions in < 5 minutes
- ✅ Production deployment successful
- ✅ Documentation complete

---

## 🚀 Next Steps (Post-Phase 3)

1. **Phase 4: Multi-Modal Inputs** (if defined in hybrid architecture)
2. **Performance Optimization**: Cache frequently accessed guard checks
3. **Advanced Analytics**: Trend analysis for AI behavior
4. **Alert System**: Notify admins of guard violations
5. **Audit Reports**: Monthly AI operations compliance reports

---

**Phase 3 Timeline:** 5 days (October 15-19, 2025 estimated)
**Status:** Ready for Implementation
**Database Schema:** Verified October 14, 2025
**Next Review:** After Day 1 completion

---

## 📚 Key Files Reference

### Backend Files (To Be Created)
- `tpe-backend/src/services/openai/openaiTracer.js` - OpenAI tracing wrapper
- `tpe-backend/src/services/guards/aiActionGuards.js` - Guard framework
- `tpe-backend/src/services/guards/guardLogger.js` - Guard logging
- `tpe-backend/src/services/guards/test-guards.js` - Guard test suite
- `tpe-backend/src/services/analytics/tokenUsageAnalytics.js` - Token analytics
- `tpe-backend/src/controllers/aiMonitoringController.js` - Monitoring API
- `tpe-backend/src/routes/aiMonitoringRoutes.js` - Monitoring routes

### Backend Files (To Be Updated)
- `tpe-backend/src/services/agents/aiConciergeStandardAgent.js` - Add LangSmith
- `tpe-backend/src/services/agents/aiConciergeEventAgent.js` - Add LangSmith
- `tpe-backend/src/services/agents/tools/actionItemsTool.js` - Add guards
- `tpe-backend/src/services/agents/tools/partnerMatchTool.js` - Add guards
- `tpe-backend/src/services/agents/tools/bookRecommendationTool.js` - Add guards
- `tpe-backend/src/services/agents/tools/podcastRecommendationTool.js` - Add guards
- `tpe-backend/src/services/agents/tools/eventRecommendationTool.js` - Add guards
- `tpe-backend/src/controllers/aiConciergeController.js` - Wrap with tracer
- `tpe-backend/server.js` - Register monitoring routes

### Frontend Files (To Be Created)
- `tpe-front-end/src/app/admindashboard/ai-monitoring/page.tsx` - Monitoring dashboard

### Frontend Files (To Be Updated)
- `tpe-front-end/src/app/admindashboard/page.tsx` - Add monitoring link

### Environment Files (To Be Updated)
- `tpe-backend/.env` - Add LangSmith keys
- Production environment variables (AWS) - Add LangSmith keys

---

**Last Updated:** October 14, 2025
**Created By:** AI Concierge Development Team
**Status:** ✅ Ready for Implementation
