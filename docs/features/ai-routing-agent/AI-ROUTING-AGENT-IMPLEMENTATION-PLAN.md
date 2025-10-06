# AI-Powered Routing Agent - Implementation Plan

**Created**: 2025-10-05
**Estimated Duration**: 4-6 hours
**Priority**: CRITICAL

---

## 📅 Implementation Sub-Phases

### **Phase 1: Fix Message Content Storage** (30 minutes)
**Problem**: Database stores "SMS delivery log from n8n workflow" instead of actual message content
**Impact**: Router is blind to conversation context

#### Tasks:
1. ✅ **Update Speaker Handlers** - Save actual message content
   - File: `tpe-backend/src/services/eventOrchestrator/speakerHandlers.js`
   - Function: `saveOutboundMessage()`
   - Change: Pass actual message content, not generic string

2. ✅ **Update SMS Controller** - Pass message to n8n with save request
   - File: `tpe-backend/src/controllers/smsController.js`
   - Location: Step 6 (Send SMS)
   - Add: `actual_message_content` to payload

3. ✅ **Verify Database Column** - Ensure message_content accepts text
   - Check: `event_messages.message_content` column type
   - Should be: TEXT or VARCHAR(unlimited)

4. ✅ **Test Message Storage** - Verify actual content is saved
   - Send test SMS
   - Query database: `SELECT message_content FROM event_messages WHERE id = X`
   - Verify: Actual AI-generated message is stored

**Success Criteria**: Database shows actual message content like "At Power100 Summit, check out Mike Davis..." instead of "SMS delivery log from n8n workflow"

---

### **Phase 2: Build Conversation Context Loader** (45 minutes)
**Goal**: Provide AI with full conversation history and context

#### Tasks:
1. ✅ **Create Context Builder Service**
   - File: `tpe-backend/src/services/conversationContext.js` (NEW)
   - Function: `buildConversationContext(contractorId, eventId)`
   - Returns:
     ```javascript
     {
       contractor: { id, name, company, goals },
       event: { id, name, date, speakers, sponsors },
       conversationHistory: [
         {
           direction: 'outbound',
           message_content: 'actual message',
           message_type: 'speaker_general_inquiry',
           sent_at: timestamp,
           personalization_data: {...}
         },
         {
           direction: 'inbound',
           message_content: 'user reply',
           received_at: timestamp
         }
       ],
       lastOutboundMessage: { ... },
       expectedResponseType: 'speaker_selection' // derived from last message
     }
     ```

2. ✅ **Query Recent Messages** - Last 5 messages (inbound + outbound)
   - Query both directions ordered by timestamp
   - Include message_content, message_type, personalization_data
   - Parse personalization_data for recommendations

3. ✅ **Extract Expected Response Type**
   - If last message was speaker_recommendation → expect numeric 1-3
   - If last message was pcr_request → expect numeric 1-5
   - If last message was speaker_feedback_request → expect numeric 1-10
   - Build this from message_type + personalization_data

4. ✅ **Add Caching** - Cache context for 30 seconds
   - Key: `conversation_context:${contractorId}`
   - TTL: 30 seconds
   - Avoids DB queries for rapid-fire messages

**Success Criteria**: Context object contains full conversation with actual message content and expected response types

---

### **Phase 3: Build AI Classification Service** (60 minutes)
**Goal**: AI analyzes context and makes intelligent routing decisions

#### Tasks:
1. ✅ **Create AI Classifier**
   - File: `tpe-backend/src/services/aiRoutingClassifier.js` (NEW)
   - Function: `classifyWithContext(inboundMessage, conversationContext)`
   - Uses: OpenAI GPT-4 Turbo

2. ✅ **Build Classification Prompt**
   - Include conversation history with timestamps
   - Include last message sent with full content
   - Include expected response type hints
   - List all available handlers dynamically
   - Request: intent, route, confidence (0-1), reasoning

3. ✅ **Prompt Template**:
   ```
   You are an SMS routing system for event orchestration.

   CONVERSATION HISTORY (last 5 messages):
   [timestamp] SYSTEM: "At Power100 Summit, check out Mike Davis on Revenue Growth (reply 1) or Sarah Johnson on Building Teams (reply 2)"
   [timestamp] USER: "1"

   CONTRACTOR CONTEXT:
   - Name: Zeek Test
   - Company: Test Construction Co
   - Current Event: Power100 Summit 2025
   - Business Goals: Revenue growth, team building

   EXPECTED RESPONSE:
   Based on last outbound message, we expect:
   - Numeric response 1-3 for speaker selection
   - Or natural language question about speakers

   AVAILABLE HANDLERS:
   - speaker_details: User wants details about a specific speaker
   - speaker_feedback: User providing rating/feedback (1-10)
   - sponsor_details: User wants sponsor booth info
   - pcr_response: Personal Connection Rating (1-5)
   - peer_match_response: Response to peer introduction
   - event_checkin: Check-in related
   - general_question: General event question (AI Concierge fallback)

   USER JUST REPLIED: "1"

   Analyze the conversation context and classify this reply.

   Return JSON:
   {
     "intent": "speaker_session_details",
     "route": "speaker_details",
     "confidence": 0.95,
     "reasoning": "User replied '1' to speaker recommendation sent 2 minutes ago. Context clearly indicates speaker selection, not PCR rating."
   }
   ```

4. ✅ **Parse AI Response**
   - Extract intent, route, confidence, reasoning
   - Validate confidence score (0.0 - 1.0)
   - Handle AI errors gracefully

5. ✅ **Add Confidence Thresholds**
   - Confidence >= 0.9 → route directly
   - Confidence 0.7-0.9 → route with logging
   - Confidence < 0.7 → fallback to general_question or clarification

**Success Criteria**: AI correctly routes "1" to speaker_details when context is speaker recommendation, and to pcr_response when context is PCR request

---

### **Phase 4: Integrate AI Router into SMS Flow** (45 minutes)
**Goal**: Replace keyword-based routing with AI routing

#### Tasks:
1. ✅ **Update AIRouter.classifyIntent()**
   - File: `tpe-backend/src/services/aiRouter.js`
   - Keep database context check as LAYER 1 (quick wins)
   - Replace LAYER 2 (current AI) with new context-aware AI
   - Keep keyword fallback as LAYER 4

2. ✅ **New Routing Flow**:
   ```javascript
   // LAYER 1: Database Context (quick patterns)
   const dbRoute = await this.checkDatabaseContext(...)
   if (dbRoute.confidence >= 0.95) return dbRoute

   // LAYER 2: AI Context-Aware Routing (NEW!)
   const conversationContext = await buildConversationContext(contractorId, eventId)
   const aiRoute = await classifyWithContext(inboundMessage, conversationContext)
   if (aiRoute.confidence >= 0.7) return aiRoute

   // LAYER 3: Keyword Fallback
   const keywordRoute = this.classifyByKeywords(inboundMessage)
   if (keywordRoute.route) return keywordRoute

   // LAYER 4: Clarification
   return { route: 'clarification_needed', confidence: 0.3 }
   ```

3. ✅ **Pass Context to Handlers**
   - Update handler signature: `handleSpeakerDetails(smsData, classification, context)`
   - Handlers can access full conversation history
   - Enables smarter handler logic

4. ✅ **Update Logging**
   - Log AI reasoning to routing_logs
   - Log conversation context snapshot
   - Enable debugging of routing decisions

**Success Criteria**: AI routing layer is active and making decisions before keyword fallback

---

### **Phase 5: Testing & Validation** (60 minutes)
**Goal**: Verify AI routing works for all scenarios

#### Test Cases:

1. ✅ **Scenario 1: Speaker Selection After Recommendation**
   ```
   Setup: Send speaker recommendation with "reply 1 or 2"
   Test: Reply "1"
   Expected: Routes to speaker_details
   Current Bug: Routes to pcr_response ❌
   ```

2. ✅ **Scenario 2: PCR After Event**
   ```
   Setup: Send PCR request "Rate 1-5"
   Test: Reply "3"
   Expected: Routes to pcr_response
   ```

3. ✅ **Scenario 3: Natural Language Speaker Question**
   ```
   Setup: Send speaker recommendation
   Test: Reply "Tell me about the revenue growth speaker"
   Expected: Routes to speaker_details (Mike Davis)
   ```

4. ✅ **Scenario 4: Follow-up Speaker**
   ```
   Setup: Get details for speaker 1
   Test: Reply "What about speaker 2?"
   Expected: Routes to speaker_details (speaker 2)
   ```

5. ✅ **Scenario 5: Stale Context**
   ```
   Setup: Send speaker recommendation 25 hours ago
   Test: Reply "1"
   Expected: Routes to clarification_needed
   ```

6. ✅ **Scenario 6: Ambiguous Reply**
   ```
   Setup: Send general event info
   Test: Reply "Thanks"
   Expected: Routes to general_question or acknowledgment (no action)
   ```

#### Validation Steps:
- Run each test case 3 times
- Check routing_logs for correct route
- Verify AI reasoning makes sense
- Ensure confidence scores are appropriate
- Confirm actual SMS responses are correct

**Success Criteria**: 95%+ routing accuracy across all test scenarios

---

### **Phase 6: Performance Optimization** (30 minutes)
**Goal**: Ensure AI routing is fast enough for production

#### Tasks:
1. ✅ **Add Performance Monitoring**
   - Log AI classification time
   - Log total routing time
   - Track 95th percentile latency

2. ✅ **Optimize AI Calls**
   - Use GPT-4 Turbo (faster than GPT-4)
   - Set max_tokens to 150 (just need JSON response)
   - Set temperature to 0.2 (deterministic routing)

3. ✅ **Add Caching Where Possible**
   - Cache conversation context for 30 seconds
   - Cache contractor profile for 5 minutes
   - Cache event context for 5 minutes

4. ✅ **Set Performance Targets**
   - Average routing time: < 1.5 seconds
   - 95th percentile: < 3 seconds
   - If exceeded, fall back to keyword routing

**Success Criteria**: 95% of routing decisions complete in <2 seconds

---

### **Phase 7: Monitoring & Rollout** (30 minutes)
**Goal**: Deploy safely with monitoring

#### Tasks:
1. ✅ **Add Routing Metrics Dashboard**
   - Track routing accuracy (correct vs incorrect)
   - Track confidence score distribution
   - Track routing method used (AI vs keyword vs db)
   - Track average response time

2. ✅ **Set Up Alerts**
   - Alert if routing accuracy drops below 90%
   - Alert if AI service is down
   - Alert if average routing time > 3 seconds

3. ✅ **Gradual Rollout Plan**
   - Phase 1: Test with single contractor (you)
   - Phase 2: Enable for 10 contractors
   - Phase 3: Enable for all contractors
   - Rollback plan: Feature flag to disable AI routing

4. ✅ **Documentation**
   - Document AI routing architecture
   - Create troubleshooting guide
   - Document how to add new handlers

**Success Criteria**: AI routing is in production with monitoring and can be disabled if needed

---

## 📋 Implementation Checklist

### **Phase 1: Fix Message Content Storage**
- [ ] Update saveOutboundMessage() to save actual content
- [ ] Update SMS controller to pass content to n8n
- [ ] Verify database column accepts text
- [ ] Test message storage end-to-end

### **Phase 2: Build Conversation Context Loader**
- [ ] Create conversationContext.js service
- [ ] Build buildConversationContext() function
- [ ] Query last 5 messages with content
- [ ] Extract expected response type
- [ ] Add 30-second caching
- [ ] Test context building

### **Phase 3: Build AI Classification Service**
- [ ] Create aiRoutingClassifier.js
- [ ] Build classification prompt template
- [ ] Implement classifyWithContext() function
- [ ] Parse AI response and validate
- [ ] Add confidence thresholds
- [ ] Test with real conversation data

### **Phase 4: Integrate AI Router**
- [ ] Update AIRouter.classifyIntent()
- [ ] Implement new 4-layer routing flow
- [ ] Pass context to handlers
- [ ] Update routing logs
- [ ] Test integration end-to-end

### **Phase 5: Testing & Validation**
- [ ] Test Scenario 1: Speaker selection
- [ ] Test Scenario 2: PCR rating
- [ ] Test Scenario 3: Natural language
- [ ] Test Scenario 4: Follow-up questions
- [ ] Test Scenario 5: Stale context
- [ ] Test Scenario 6: Ambiguous replies
- [ ] Validate 95%+ accuracy

### **Phase 6: Performance Optimization**
- [ ] Add performance monitoring
- [ ] Optimize AI API calls
- [ ] Add caching layers
- [ ] Verify <2 second routing time

### **Phase 7: Monitoring & Rollout**
- [ ] Create metrics dashboard
- [ ] Set up alerts
- [ ] Test with single contractor
- [ ] Gradual rollout to 10 contractors
- [ ] Full production rollout
- [ ] Document architecture

---

## 🚀 Next Steps After Implementation

1. **Add Learning Loop**: Track routing decisions that led to user corrections
2. **Expand Handlers**: Add sponsor, peer matching, event checkin handlers
3. **Multi-Turn Conversations**: Support complex flows requiring multiple back-and-forth
4. **Proactive Routing**: AI suggests next action based on contractor behavior
5. **A/B Testing**: Compare AI routing vs keyword routing performance

---

## 📊 Success Metrics

- **Routing Accuracy**: >95% (vs current ~60%)
- **Response Time**: <2 seconds average
- **User Confusion**: <5% "I don't understand" responses
- **Scalability**: Add new handlers with 0 routing code changes
- **Debugging**: 100% of routes have clear AI reasoning

---

## 🔧 Rollback Plan

If AI routing has issues:
1. Set feature flag `USE_AI_ROUTING=false` in .env
2. Falls back to database context + keyword routing
3. Fix issues in development
4. Re-enable with `USE_AI_ROUTING=true`

---

## 📝 Notes

- Estimated 4-6 hours total implementation time
- Most time in testing and validation (critical for reliability)
- AI routing is a one-time investment that pays off exponentially
- Once built, adding new message types requires ZERO routing code
