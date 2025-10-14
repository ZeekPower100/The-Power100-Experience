# Phase 2: Code Deprecation & Cleanup Plan

**Document Version:** 1.0
**Date:** October 13, 2025
**Status:** Tracking - DO NOT DELETE Until Verified

---

## 🎯 Philosophy

**PROVE FIRST, THEN DELETE**

1. ✅ Build new agent-based system
2. ✅ Test thoroughly (unit + integration + production)
3. ✅ Run both systems in parallel for 1-2 weeks
4. ✅ Confirm new system is more efficient and reliable
5. ✅ **THEN** delete old code

**Goal:** More efficient, more reliable, less code to maintain

---

## 📊 Expected Code Reduction

| Component | Current Size | Target Size | Reduction |
|-----------|-------------|-------------|-----------|
| AI Concierge Controller | ~500 lines | ~150 lines | **70%** |
| Event Orchestrator Files | ~2,000 lines | ~500 lines | **75%** |
| Context Assembly Logic | ~800 lines | ~200 lines | **75%** |
| **Total** | **~3,300 lines** | **~850 lines** | **74%** |

---

## 🗑️ Code to Deprecate (After Verification)

### 1. Event Sponsor Recommendation Logic (After eventSponsorMatchTool Proven)

**File:** `tpe-backend/src/services/eventAIRecommendationService.js`

**Lines to Deprecate:**
```javascript
// Lines 288-379: async recommendSponsors(eventId, contractorId, limit = 3)
// Lines 384-465: async scoreSponsors(sponsors, contractorProfile, focusAreas)
// Lines 470-604: async generateSponsorTalkingPoints(sponsors, contractorProfile)
```

**Replacement:** `eventSponsorMatchTool.js` (already created)

**Verification Steps:**
- [ ] eventSponsorMatchTool returns same sponsor recommendations
- [ ] Match scores are equivalent or better
- [ ] Talking points quality is maintained
- [ ] Learning events are logged correctly
- [ ] Performance is equal or faster

**Notes:**
- Keep `recommendSpeakers` method (lines 15-109) - NOT duplicated in tools yet
- Keep scoring helper methods (lines 610-667) - May be useful for other features

---

### 2. Direct OpenAI Calls in Controller (After Agent Routing Proven)

**File:** `tpe-backend/src/controllers/aiConciergeController.js`

**Lines to Deprecate:**
```javascript
// Lines 623-1062: async generateAIResponse(userInput, contractor, contractorId, eventContext)
```

**Replacement:** Agent routing via LangGraph agents

**What Changes:**
```javascript
// OLD (lines 623-1062):
async generateAIResponse(userInput, contractor, contractorId, eventContext = null) {
  // 400+ lines of context assembly
  // Direct OpenAI call
  // Manual tool selection
}

// NEW (target ~50 lines):
async generateAIResponse(userInput, contractor, contractorId, eventContext = null) {
  // Determine agent mode (Standard vs Event)
  const agent = this.selectAgent(contractorId, eventContext);

  // Pass to agent (agent handles tools, memory, etc.)
  const response = await agent.invoke({
    input: userInput,
    contractorId,
    eventContext
  });

  return response;
}
```

**Verification Steps:**
- [ ] Agent responses are equal or better quality
- [ ] Agent correctly selects tools
- [ ] Agent memory persists across conversations
- [ ] Response time is equal or faster
- [ ] No loss of functionality

**Notes:**
- Keep helper methods (lines 528-621) for now - may be useful
- Legacy context assembly (lines 632-1009) will be replaced by contextAssembler service

---

### 3. Monolithic Context Assembly (After Context Assembler Service Proven)

**File:** `tpe-backend/src/controllers/aiConciergeController.js`

**Lines to Deprecate:**
```javascript
// Lines 632-651: Event context from materialized views
// Lines 654-674: Knowledge base assembly
// Lines 707-1009: Legacy fallback queries (partners, books, podcasts, events, videos)
```

**Replacement:** `contextAssembler.js` service (Phase 1 - already exists)

**What Gets Simplified:**
- No more loading 89 tables on every request
- No more legacy fallback queries
- contextAssembler already provides clean bundles

**Verification Steps:**
- [ ] Context Assembler provides all needed data
- [ ] Agent has access to same information
- [ ] No regression in AI response quality
- [ ] Performance improvement verified

---

### 4. Event Orchestrator Duplication (After Agent Tools Proven)

**File:** `tpe-backend/src/services/eventOrchestrator/sponsorHandlers.js`

**Lines to Potentially Deprecate:**
```javascript
// Lines 11-257: handleSponsorDetails() - Duplicates agent tool logic
```

**Current Usage:** SMS router for contractor replies "1", "2", "3"

**Decision Point:**
- If SMS router migrates to agents → Delete this
- If SMS router stays separate → Keep this, but simplify to call eventSponsorMatchTool

**Verification Steps:**
- [ ] Determine SMS router architecture (agents vs standalone)
- [ ] If standalone: Refactor to use eventSponsorMatchTool instead of duplicating logic
- [ ] If agent-based: Deprecate entire file

**Notes:**
- Don't touch until SMS architecture decision made
- This is Phase 3 or 4 work, not Phase 2

---

### 5. Direct Database Queries in Controller (After Tools Handle Data Access)

**File:** `tpe-backend/src/controllers/aiConciergeController.js`

**Lines to Deprecate:**
```javascript
// Lines 711-770: Direct strategic_partners query
// Lines 773-786: Direct contractors stats query
// Lines 789-830: Direct books query
// Lines 833-873: Direct podcasts query
// Lines 876-930: Direct events query
// Lines 933-969: Direct videos query
// Lines 972-981: Direct feedback_responses query
```

**Replacement:** Tools query data as needed, controller doesn't pre-load

**Verification Steps:**
- [ ] Agents retrieve data via tools when needed
- [ ] No functionality lost
- [ ] Performance improvement verified (don't load unused data)

---

## 🔄 Migration Strategy

### Phase 2A: Build & Test in Parallel (Weeks 1-2)

**Action:** Build all agent tools alongside existing system

**Status:**
- ✅ Dependencies installed
- ✅ partnerMatchTool created and tested
- ✅ eventSponsorMatchTool created
- ⏳ eventSessionsTool (pending)
- ⏳ captureNoteTool (pending)
- ⏳ scheduleFollowupTool (pending)

**Verification:**
- Unit tests for each tool
- Integration tests comparing tool output vs current system output
- Performance benchmarks

---

### Phase 2B: Agent Creation & Integration (Week 3)

**Action:** Create agents, route controller to agents

**New Code:**
- `aiConciergeStandardAgent.js`
- `aiConciergeEventAgent.js`
- Updated `aiConciergeController.js` (agent routing)

**Verification:**
- Agents work correctly with tools
- Memory persists across conversations
- Response quality maintained or improved

---

### Phase 2C: Parallel Operation (Weeks 4-5)

**Action:** Run both systems side-by-side in production

**Implementation:**
```javascript
// Add feature flag
if (process.env.USE_AGENT_SYSTEM === 'true') {
  // Route to new agent-based system
  return await this.generateAgentResponse(userInput, contractor, contractorId);
} else {
  // Route to old system
  return await this.generateAIResponse(userInput, contractor, contractorId);
}
```

**Monitoring:**
- Response time comparison
- Quality comparison (manual review sample)
- Error rates
- Token usage / cost
- Learning event completeness

---

### Phase 2D: Deprecation & Cleanup (Week 6)

**Action:** After 1-2 weeks of successful parallel operation, delete old code

**Checklist Before Deletion:**
- [ ] New system runs for 2 weeks without critical issues
- [ ] Response quality is equal or better (manual review of 50+ conversations)
- [ ] Performance is equal or better (avg response time < 2s)
- [ ] Cost is equal or lower (token usage tracking)
- [ ] No regression in user satisfaction metrics
- [ ] Team approves deletion
- [ ] Backup of old code created (Git tag: `pre-agent-cleanup`)

**Deletion Process:**
1. Create Git tag: `pre-agent-cleanup`
2. Create backup branch: `backup/pre-agent-system`
3. Delete deprecated code in feature branch
4. Test thoroughly
5. Code review
6. Merge to master

---

## 📈 Success Metrics

### Performance Improvements (Target)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Avg Response Time** | 2-3s | < 2s | Response latency tracking |
| **Controller Code Size** | ~500 lines | ~150 lines | Line count |
| **Context Assembly Time** | Variable | < 100ms | Timing logs |
| **Token Usage per Request** | ~10k tokens | ~2k tokens | OpenAI API tracking |
| **Code Maintainability** | Complex | Simple | Code review assessment |

### Quality Metrics (Must Not Regress)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Response Quality** | Baseline | ≥ Baseline | Manual review (sample 50) |
| **Tool Selection Accuracy** | N/A | > 90% | Agent decision tracking |
| **Learning Event Coverage** | ~60% | 100% | Event logging verification |
| **Memory Persistence** | None | 100% | Conversation continuity tests |

---

## 🚨 Rollback Plan

**If new system underperforms:**

1. **Immediate Rollback** (< 5 minutes)
   ```bash
   # Set environment variable
   export USE_AGENT_SYSTEM=false
   # Restart backend
   pm2 restart tpe-backend
   ```

2. **Code Rollback** (if needed)
   ```bash
   git checkout backup/pre-agent-system
   git push origin master --force
   pm2 restart tpe-backend
   ```

3. **Post-Mortem**
   - Document what went wrong
   - Fix issues in development
   - Re-test before trying again

---

## 📝 Code Deletion Checklist (Week 6)

### Before Deletion
- [ ] New system proven in production for 2+ weeks
- [ ] All success metrics met
- [ ] Quality metrics maintained
- [ ] Team approval obtained
- [ ] Git tag created: `pre-agent-cleanup`
- [ ] Backup branch created: `backup/pre-agent-system`

### Files to Modify
- [ ] `aiConciergeController.js` - Remove lines 623-1062 (generateAIResponse old logic)
- [ ] `aiConciergeController.js` - Remove lines 632-1009 (legacy queries)
- [ ] `eventAIRecommendationService.js` - Remove lines 288-604 (sponsor recommendation logic)

### Files to Consider (Later Phases)
- [ ] `sponsorHandlers.js` - Refactor or deprecate (Phase 3)
- [ ] Other event orchestrator files (as agents take over)

### Post-Deletion Verification
- [ ] All tests pass
- [ ] No broken imports
- [ ] Production deployment successful
- [ ] Monitor for 48 hours post-deletion
- [ ] Document code size reduction achieved

---

## 📚 Related Documents

- **Architecture:** `AI-CONCIERGE-HYBRID-ARCHITECTURE-RECOMMENDATION.md`
- **Phase 2 Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md`
- **Current System:** `AI-CONCIERGE-COMPLETE-GUIDE.md`

---

**Last Updated:** October 13, 2025
**Next Review:** After Phase 2C completion (Week 5)
**Status:** Tracking - Code marked for deprecation, awaiting verification
