# AI-Powered Routing Agent - Requirements & Specification

**Created**: 2025-10-05
**Status**: Planning → Implementation
**Priority**: CRITICAL (Blocking SMS reliability)

---

## 🎯 Executive Summary

Replace fragile keyword-based SMS routing with intelligent AI-powered routing agent that understands conversation context, disambiguates responses, and scales automatically without code changes for new message types.

### **Current Problem**
- Router doesn't see actual message content (only "SMS delivery log from n8n workflow")
- Keyword matching is fragile ("1" matches PCR before speaker context)
- Not scalable (every new message type requires manual coding)
- **Real Example**: User replies "1" to speaker recommendation → routed to PCR instead of speaker details ❌

### **Solution**
AI Routing Agent that sees full conversation context and makes intelligent routing decisions using GPT-4.

---

## 📋 Functional Requirements

### **1. Full Conversation Context Awareness**
The agent MUST be able to:

- ✅ **See the ACTUAL last message(s) sent** to the contractor (not just message type)
- ✅ **Access last 3-5 messages** in the conversation for deep context
- ✅ **Know what questions were asked** in those messages (e.g., "Reply 1 for Mike or 2 for Sarah")
- ✅ **Understand multi-message conversations** (if we sent 2-3 SMS in a row)
- ✅ **Track conversation state** (are they in the middle of choosing a speaker? Rating something?)

**Technical Implementation**:
- Fix database to save actual message content (not generic placeholder)
- Query last 5 outbound messages with content + personalization_data
- Build conversation context object with full message history

---

### **2. Intelligent Pattern Recognition**
The agent MUST be able to:

- ✅ **Disambiguate numeric responses** based on context:
  - "1" after speaker recommendation = speaker details (NOT PCR)
  - "1" after PCR request = PCR rating
  - "1" after sponsor list = sponsor details

- ✅ **Handle natural language variations**:
  - "Tell me about speaker 2" = speaker details
  - "What about the second one?" = speaker details
  - "More info on Sarah" = speaker details

- ✅ **Recognize follow-up questions**:
  - "What about speaker 2?" after asking about speaker 1 = still speaker details
  - "Thanks" after getting details = acknowledgment (no action needed)

**Technical Implementation**:
- Pass conversation context to AI with message history
- AI analyzes both the reply AND the context
- Returns intent + confidence + reasoning

---

### **3. Context-Driven Decision Making**
The agent MUST:

- ✅ **Prioritize recent message context** over keyword matching
- ✅ **Use message type as a hint**, not a rule:
  - If last message was `speaker_general_inquiry` and they reply "1" → speaker details
  - If last message was `pcr_request` and they reply "1" → PCR rating

- ✅ **Understand expected response formats**:
  - Know when a number 1-3 is expected (speaker selection)
  - Know when a number 1-5 is expected (PCR rating)
  - Know when a number 1-10 is expected (speaker feedback)

**Technical Implementation**:
- Include expected response format in prompt
- AI knows which numeric ranges map to which handlers
- Database context provides hints, AI makes final decision

---

### **4. Event & Contractor Awareness**
The agent MUST:

- ✅ **Know the current event context** (which event are they at?)
- ✅ **Access contractor's business profile** (to understand their goals)
- ✅ **Understand which speakers/sponsors were recommended** to them
- ✅ **Track which speakers they've already asked about** (to detect follow-ups)

**Technical Implementation**:
- Pass event_id and event details to AI
- Include contractor business profile summary
- Parse personalization_data from recent messages for recommendations
- Track conversation history per contractor

---

### **5. Scalability & Flexibility**
The agent MUST:

- ✅ **No hardcoded routing rules** for new message types
- ✅ **Automatically adapt** to new handlers without code changes
- ✅ **Learn from routing decisions** (log what worked/didn't work)
- ✅ **Handle edge cases gracefully**:
  - Ambiguous messages → ask for clarification
  - Unexpected responses → route to AI Concierge for general handling
  - Time delays → don't assume context after 24+ hours

**Technical Implementation**:
- AI prompt includes ALL available handlers dynamically
- Routing logs capture AI reasoning for analysis
- Confidence thresholds determine fallback behavior
- Time-based context expiry (24 hours)

---

### **6. Confidence & Fallback Strategy**
The agent MUST:

- ✅ **Return confidence score** (0.0 - 1.0) for every routing decision
- ✅ **Provide reasoning** for why it chose that route (for debugging)
- ✅ **Fallback to AI Concierge** when confidence is low (<0.7)
- ✅ **Ask for clarification** instead of guessing when truly ambiguous

**Technical Implementation**:
```javascript
{
  route: 'speaker_details',
  confidence: 0.95,
  reasoning: 'User replied "1" to speaker recommendation sent 2 minutes ago',
  fallback_route: 'general_question' // if confidence < 0.7
}
```

---

### **7. Performance Requirements**
The agent MUST:

- ✅ **Fast routing** (< 2 seconds for classification)
- ✅ **Use GPT-4 Turbo** or similar for intelligence without latency
- ✅ **Cache contractor context** to avoid repeated database queries
- ✅ **Log all decisions** to routing_logs table for analysis

**Technical Targets**:
- Average routing time: < 1.5 seconds
- 95th percentile: < 3 seconds
- AI API calls: 1 per inbound message (no retries unless error)

---

### **8. Handler Integration**
The agent MUST:

- ✅ **Support all existing handlers**:
  - speaker_details
  - speaker_feedback
  - sponsor_details
  - pcr_response
  - peer_match_response
  - event_checkin
  - general_question (AI Concierge fallback)

- ✅ **Pass full context to handlers** (not just the inbound message)
- ✅ **Enable handlers to request follow-up routing** if needed

**Technical Implementation**:
- Handlers receive conversation context object
- Handlers can return "expected_next_response" for routing hints
- Router can chain handlers for complex flows

---

### **9. Data Requirements**
The agent MUST have access to:

- ✅ **FIX: Save actual message content** to database (not "SMS delivery log")
- ✅ **Store conversation threads** properly with timestamps
- ✅ **Track which message a reply is responding to** (conversation threading)
- ✅ **Preserve personalization_data** for context reconstruction

**Database Changes Required**:
1. Ensure `message_content` column stores actual SMS text
2. Add `reply_to_message_id` for threading (optional)
3. Fix n8n workflow to pass actual message to database

---

### **10. Error Handling & Recovery**
The agent MUST:

- ✅ **Graceful degradation** if AI service is down → fallback to database context
- ✅ **Handle missing context** (new contractors with no history)
- ✅ **Detect and recover from routing errors** (wrong handler sent wrong response)
- ✅ **Alert on repeated classification failures** for the same contractor

**Technical Implementation**:
- Try/catch around AI calls with fallback to keyword matching
- Default route for first-time users
- Track routing accuracy metrics
- Alert if same contractor gets 3+ misroutes in 24 hours

---

## 🎬 Example Scenarios

### **Scenario 1: Speaker Selection After General Inquiry** ⭐ PRIMARY USE CASE
```
System: "At Power100 Summit, check out Mike Davis on Revenue Growth (reply 1) or Sarah Johnson on Building Teams (reply 2)"
User: "1"

Expected Route: speaker_details (Mike Davis)
Current Bug: Routes to pcr_response ❌
AI Agent Fix: Sees speaker recommendation context, routes to speaker_details ✅
```

### **Scenario 2: Follow-up Speaker Question**
```
System: [Details about Mike Davis - Revenue Growth Strategies]
User: "What about speaker 2?"

Expected Route: speaker_details (Sarah Johnson)
AI Agent: Recognizes follow-up question, accesses original recommendations, routes correctly ✅
```

### **Scenario 3: PCR After Event**
```
System: "How valuable was connecting with John? Rate 1-5"
User: "4"

Expected Route: pcr_response
AI Agent: Sees PCR request context, knows 1-5 range, routes correctly ✅
```

### **Scenario 4: Ambiguous Natural Language**
```
System: [Speaker recommendations including Mike Davis - Revenue Growth]
User: "Tell me more about the revenue growth one"

Expected Route: speaker_details (Mike Davis - match by session title)
AI Agent: Matches "revenue growth" to Mike Davis session, routes correctly ✅
```

### **Scenario 5: Out of Context**
```
System: [24 hours ago: speaker recommendations]
User: "2"

Expected Route: clarification_needed (context too old)
AI Agent: Detects stale context, asks for clarification instead of guessing ✅
```

---

## 🏗️ Architecture Overview

```
Inbound SMS
    ↓
SMS Controller (handleInbound)
    ↓
AI Routing Agent
    ├─→ Load Conversation Context (last 5 messages)
    ├─→ Load Event Context (current event details)
    ├─→ Load Contractor Profile (business goals)
    ├─→ Call AI Classification (GPT-4 with full context)
    ├─→ Validate Confidence Score
    ├─→ Log Routing Decision
    └─→ Return Route + Context
    ↓
Message Handler (speaker_details, pcr_response, etc.)
    ↓
Send Response via n8n/GHL
```

---

## 📊 Success Metrics

- **Routing Accuracy**: >95% correct routes (vs current ~60%)
- **Response Time**: <2 seconds average routing time
- **Scalability**: Add new message types with 0 code changes
- **Debugging**: Every routing decision has clear reasoning
- **User Experience**: Zero "Please reply with speaker number" confusion

---

## 🚀 Implementation Phases

See `AI-ROUTING-AGENT-IMPLEMENTATION-PLAN.md` for detailed sub-phase breakdown.

---

## 📝 Notes

- This is a **critical blocker** for reliable SMS functionality
- Current system is not production-ready due to routing errors
- AI routing enables future features without code changes
- Investment in AI routing pays off exponentially with scale
