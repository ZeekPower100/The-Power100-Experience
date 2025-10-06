# N8N to Backend Migration Plan
**Date Created:** October 4, 2025
**Purpose:** Migrate all event orchestration logic from n8n workflows to backend, leaving n8n + GHL as simple message transport layer

## 🎯 Migration Vision

**Current Architecture:**
- n8n workflows contain routing logic, personalization, data processing
- Data flows: GHL → n8n → Backend → n8n → GHL
- Issues: Data loss, debugging complexity, scattered logic

**Target Architecture:**
- **Backend = Brain:** All logic, AI routing, personalization, event orchestration
- **n8n + GHL = Messenger:** Only send/receive SMS, no logic
- **Unified AI System:** Event Orchestrator + AI Concierge share same knowledge base
- Data flows: GHL → Backend (routes & processes) → GHL

## 📊 Current N8N Event Orchestration Workflows (DEV)

### Category 1: SMS Routing & Response Handlers
1. **TPX SMS Router - DEV** (Xx8OJ6zQclCZayX8) - 15 nodes
2. **TPX Speaker Details Response - DEV** (hshQfIsiLJT8iKiP) - 11 nodes
3. **TPX Speaker Response - DEV** (IEbbg7LVy9YX7gSx) - 12 nodes [Speaker Feedback]
4. **TPX Sponsor Response - DEV** (auUATKX6Ht4OK2s9) - 11 nodes
5. **TPX PCR Response - DEV** (hTyeWDSEEsal59Ad) - 13 nodes

### Category 2: Outbound Message Triggers
6. **TPX Speaker Alerts - DEV** (gffEeV17lOSNVxmk) - 8 nodes
7. **TPX PCR Request - DEV** (itGKPHi5zo5DuH6V) - 8 nodes
8. **TPX Sponsor Recommendations - DEV** (4OEp5R9TB2CwHuaV) - 8 nodes

### Category 3: Advanced Event Features
9. **TPX Peer Matching - DEV** (wQAb4hfgYS1DAluu) - 12 nodes
10. **TPX Event Check-In & Welcome - DEV** (DR9Id3JZ9WkOkr9y) - 8 nodes
11. **TPX Admin SMS Command Router - DEV** (NBzm7tMQPbPTNsPG) - 17 nodes

**Total:** 11 workflows to migrate

## 🗺️ Migration Phases

### Phase 0: Documentation & Planning ✅ IN PROGRESS
- [x] Identify all n8n event orchestration workflows
- [ ] Document each workflow's logic and data flow
- [ ] Map database schema requirements
- [ ] Create migration timeline

### Phase 1: Core SMS Routing Infrastructure 🎯 NEXT
**Priority:** CRITICAL - Foundation for all other phases
**Estimated Time:** 1-2 days

**Workflows to Migrate:**
1. TPX SMS Router - DEV

**Backend Components to Build:**
- `/api/sms/inbound` - Receives all SMS from GHL webhook
- `/api/sms/route` - AI-powered intent classification and routing
- AI Router Service - Uses AI Concierge brain for intent detection
- Message handler registry - Routes to specific handlers

**Database Updates:**
- Add `routing_logs` table for debugging
- Add `ai_routing_confidence` field to event_messages

**n8n Simplification:**
- Replace 15-node router with single "Receive & Forward" workflow
- Webhook → POST to backend → Done

**Success Criteria:**
- All inbound SMS route correctly via backend
- No data loss in personalization_data
- AI routing confidence >85% accuracy

---

### Phase 2: Speaker Interaction Flows
**Priority:** HIGH - Currently broken (personalization_data null)
**Estimated Time:** 1 day

**Workflows to Migrate:**
2. TPX Speaker Details Response - DEV
3. TPX Speaker Response - DEV (Feedback)
4. TPX Speaker Alerts - DEV

**Backend Components to Build:**
- `/api/event-orchestrator/speaker/details` - Session details handler
- `/api/event-orchestrator/speaker/feedback` - Rating handler with sentiment analysis
- `/api/event-orchestrator/speaker/send-recommendations` - Outbound alerts
- Speaker service layer with AI-generated session summaries

**Database Updates:**
- Ensure `personalization_data` JSONB saved correctly
- Add speaker interaction analytics

**n8n Simplification:**
- Speaker workflows become simple SMS send/receive pipes

**Success Criteria:**
- Speaker details work end-to-end (reply 1-3 gets session info)
- Speaker feedback with AI sentiment analysis
- Personalization data flows correctly

---

### Phase 3: Sponsor Interaction Flows
**Priority:** HIGH - Similar to speaker flows
**Estimated Time:** 0.5 days

**Workflows to Migrate:**
5. TPX Sponsor Response - DEV
6. TPX Sponsor Recommendations - DEV

**Backend Components to Build:**
- `/api/event-orchestrator/sponsor/details` - Booth/talking points handler
- `/api/event-orchestrator/sponsor/send-recommendations` - Outbound sponsor alerts

**Database Updates:**
- Sponsor interaction tracking

**n8n Simplification:**
- Sponsor workflows become SMS pipes

**Success Criteria:**
- Sponsor details flow works (reply 1-3 gets info)
- Recommendations sent correctly

---

### Phase 4: PCR (Personal Connection Rating) Flows
**Priority:** MEDIUM - Less frequently used
**Estimated Time:** 0.5 days

**Workflows to Migrate:**
7. TPX PCR Response - DEV
8. TPX PCR Request - DEV

**Backend Components to Build:**
- `/api/event-orchestrator/pcr/request` - Send PCR survey
- `/api/event-orchestrator/pcr/process` - Handle 1-5 rating responses
- PCR scoring analytics service

**Database Updates:**
- PCR analytics and trending

**n8n Simplification:**
- PCR workflows become SMS pipes

**Success Criteria:**
- PCR requests sent correctly
- Ratings processed and stored
- Analytics dashboard updated

---

### Phase 5: Peer Matching System
**Priority:** MEDIUM - Advanced feature
**Estimated Time:** 1 day

**Workflows to Migrate:**
9. TPX Peer Matching - DEV

**Backend Components to Build:**
- `/api/event-orchestrator/peer-matching/find-matches` - AI matching algorithm
- `/api/event-orchestrator/peer-matching/send-introduction` - Outbound intros
- `/api/event-orchestrator/peer-matching/track-response` - Connection tracking

**Database Updates:**
- Peer matching analytics
- Connection success tracking

**n8n Simplification:**
- Peer matching becomes SMS pipe

**Success Criteria:**
- AI matches contractors based on goals/industry
- Introductions sent
- Connections tracked

---

### Phase 6: Event Check-In & Welcome
**Priority:** LOW - Simple workflow
**Estimated Time:** 0.5 days

**Workflows to Migrate:**
10. TPX Event Check-In & Welcome - DEV

**Backend Components to Build:**
- `/api/event-orchestrator/check-in/welcome` - Send welcome message
- Event check-in tracking service

**Database Updates:**
- Check-in timestamps and analytics

**n8n Simplification:**
- Check-in becomes SMS pipe

**Success Criteria:**
- Welcome messages sent on check-in
- Check-in tracked in database

---

### Phase 7: Admin SMS Command Router
**Priority:** LOW - Admin-only feature
**Estimated Time:** 1 day

**Workflows to Migrate:**
11. TPX Admin SMS Command Router - DEV

**Backend Components to Build:**
- `/api/admin/sms-commands/route` - Admin command parser
- Admin command handlers (status checks, overrides, etc.)

**Database Updates:**
- Admin command audit log

**n8n Simplification:**
- Admin router becomes SMS pipe

**Success Criteria:**
- Admin SMS commands work
- Audit trail maintained

---

### Phase 8: Final n8n Simplification & Testing
**Priority:** CRITICAL - Cleanup
**Estimated Time:** 1 day

**Tasks:**
- Replace all 11 workflows with 2 simple workflows:
  1. **"GHL Inbound to Backend"** - Receive SMS → POST to `/api/sms/inbound`
  2. **"Backend to GHL Outbound"** - Receive backend request → Send via GHL API
- Complete end-to-end testing of all flows
- Performance testing and optimization
- Documentation updates
- Production deployment

**Success Criteria:**
- All event orchestration logic runs in backend
- n8n only handles SMS transport
- Zero data loss
- Performance maintained or improved
- Full test coverage

---

## 📈 Migration Timeline

**Total Estimated Time:** 6-8 days

| Phase | Days | Start | Dependencies |
|-------|------|-------|--------------|
| Phase 0: Documentation | 0.5 | Day 1 | None |
| Phase 1: Core Routing | 1-2 | Day 1-2 | Phase 0 |
| Phase 2: Speaker Flows | 1 | Day 3 | Phase 1 |
| Phase 3: Sponsor Flows | 0.5 | Day 4 | Phase 1 |
| Phase 4: PCR Flows | 0.5 | Day 4 | Phase 1 |
| Phase 5: Peer Matching | 1 | Day 5 | Phase 1 |
| Phase 6: Check-In | 0.5 | Day 6 | Phase 1 |
| Phase 7: Admin Router | 1 | Day 6-7 | Phase 1 |
| Phase 8: Final Testing | 1 | Day 8 | All phases |

---

## 🏗️ Backend Architecture

### New Directory Structure
```
tpe-backend/src/
├── services/
│   ├── aiRouter.js              # AI-powered intent classification
│   ├── eventOrchestrator/
│   │   ├── speakerService.js    # Speaker interactions
│   │   ├── sponsorService.js    # Sponsor interactions
│   │   ├── pcrService.js        # PCR surveys
│   │   ├── peerMatchingService.js # Peer matching
│   │   └── checkInService.js    # Event check-in
│   └── smsService.js            # GHL SMS integration
├── controllers/
│   ├── smsController.js         # Inbound SMS handler
│   └── eventOrchestratorController.js # Event-specific handlers
└── routes/
    ├── smsRoutes.js
    └── eventOrchestratorRoutes.js
```

### AI Router Service (Core Component)
```javascript
// services/aiRouter.js
class AIRouter {
  async classifyIntent(sms, contractorContext, eventContext) {
    // Use AI Concierge brain for classification
    // Returns: { intent, confidence, route, contextData }
  }

  async route(classification, smsData) {
    // Route to appropriate handler based on intent
  }
}
```

### Message Handler Registry
```javascript
// services/messageHandlerRegistry.js
const handlers = {
  'speaker_details': speakerService.handleDetailsRequest,
  'speaker_feedback': speakerService.handleFeedback,
  'sponsor_details': sponsorService.handleDetailsRequest,
  'pcr_response': pcrService.handleRating,
  'peer_match_response': peerMatchingService.handleResponse,
  // ... more handlers
};
```

---

## 🔄 Data Flow Comparison

### BEFORE (Current - n8n Heavy)
```
GHL Webhook → n8n SMS Router (15 nodes)
  ├─ Lookup contractor (API call to backend)
  ├─ Lookup pending messages (API call to backend)
  ├─ Analyze intent (n8n JavaScript)
  ├─ Route switch (n8n logic)
  └─ Call sub-workflow
       ├─ Parse data (n8n JavaScript)
       ├─ Format message (n8n JavaScript)
       ├─ Call backend API (partial data)
       ├─ GHL contact upsert
       ├─ Send SMS via GHL
       └─ Log to backend (often loses personalization_data)
```

### AFTER (Target - Backend Heavy)
```
GHL Webhook → n8n (2 nodes: receive → forward to backend)
  └─ POST to /api/sms/inbound
       └─ Backend AI Router
            ├─ Load contractor context (database)
            ├─ Load event context (database)
            ├─ Load pending messages (database)
            ├─ AI intent classification (AI Concierge brain)
            ├─ Route to handler
            ├─ Execute handler logic
            ├─ Save all data (no data loss)
            ├─ POST to /api/sms/outbound
            └─ n8n sends via GHL (2 nodes)
```

---

## ✅ Success Metrics

1. **Zero Data Loss:** All personalization_data saved correctly
2. **Routing Accuracy:** AI classification >90% accuracy
3. **Performance:** Response time <2 seconds end-to-end
4. **Debugging:** Single codebase, easy to trace issues
5. **AI Integration:** Concierge + Orchestrator share knowledge
6. **Maintainability:** Business logic changes = backend only
7. **Testing:** Full unit + integration test coverage

---

## 🚀 Next Steps

1. **Complete Phase 0:** Document remaining workflows in detail
2. **Start Phase 1:** Build core SMS routing infrastructure
3. **Test Phase 1:** Verify routing works before proceeding
4. **Iterate:** Complete phases 2-8 sequentially with testing

---

## 📝 Notes

- Each phase includes full testing before moving to next phase
- Database schema changes validated before implementation
- AI Concierge integration ensures shared knowledge base
- n8n workflows archived (not deleted) for rollback capability
- Production migration happens after all DEV phases complete

