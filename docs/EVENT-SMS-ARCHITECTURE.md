# Event SMS Architecture - GHL Integration Strategy
*How TPX Event Orchestrator uses GHL for SMS delivery while maintaining control*

---

## 🎉 NEW VERSION - Current Implementation (October 2025)
**Status:** ✅ PRODUCTION - All 11 workflows migrated to backend

### Architecture Overview - Post N8N Migration

```
┌─────────────────────────────────────────────────────────────────┐
│                     TPX BACKEND (Brain)                          │
│  - ALL Event Orchestration Logic                                │
│  - AI-Powered SMS Router (4-layer routing)                      │
│  - 8 Inbound Message Handlers:                                  │
│    • speaker_details, speaker_feedback                          │
│    • sponsor_details                                            │
│    • pcr_response, attendance_confirmation                      │
│    • peer_match_response                                        │
│    • event_checkin                                              │
│    • admin_command, general_question (AI Concierge)             │
│  - 3 Outbound Message Schedulers:                               │
│    • sendSpeakerAlert (15 min before sessions)                  │
│    • sendSponsorRecommendation (during breaks)                  │
│    • sendPCRRequest (after sessions)                            │
│  - Real-time Context Loading (last 5 messages + contractor)     │
│  - AI Personalization & PCR Scoring                             │
│  - Message Queue Management (event_messages table)              │
│  - Routing Metrics & Performance Monitoring                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Simple Webhook (2 nodes)
┌─────────────────────────────────────────────────────────────────┐
│              N8N (Simple Message Transport)                      │
│  Workflow 1: GHL Inbound → Backend /api/sms/inbound            │
│  Workflow 2: Backend → GHL Outbound SMS                         │
│  - NO LOGIC, just pass-through                                  │
│  - Dev: /webhook/*-dev | Prod: /webhook/*                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ SMS via Twilio
┌─────────────────────────────────────────────────────────────────┐
│                    GHL (Delivery Only)                           │
│  - SMS Infrastructure (Twilio)                                   │
│  - Contact Database Sync                                         │
│  - Delivery Tracking                                             │
│  - Two-way Messaging                                             │
│  - Response Webhooks to n8n → Backend                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ SMS
┌─────────────────────────────────────────────────────────────────┐
│                  CONTRACTOR PHONE                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Response
┌─────────────────────────────────────────────────────────────────┐
│         BACKEND HANDLES ALL PROCESSING                           │
│  - AI Intent Classification (95% accuracy)                       │
│  - Sentiment Analysis                                            │
│  - PCR Score Calculation                                         │
│  - Context-aware Next Actions                                    │
│  - Conversation History Tracking                                 │
│  - AI Concierge Integration                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Key Improvements in New Version

**Backend Services:**
- `aiRouter.js` - 4-layer routing (database → AI → keyword → fallback)
- `aiRoutingClassifier.js` - GPT-4 Turbo context-aware classification
- `conversationContext.js` - Loads last 5 messages + contractor/event data
- `messageHandlerRegistry.js` - Routes to 8 specialized handlers
- `routingMetrics.js` - Performance monitoring dashboard
- `outboundScheduler.js` - Automated message triggers
- Handler files: `speakerHandlers.js`, `sponsorHandlers.js`, `pcrHandlers.js`, `peerMatchingHandlers.js`, `checkInHandlers.js`, `attendanceHandlers.js`, `adminCommandHandlers.js`

**Testing:**
- ✅ 21/21 inbound handler tests passing (100%)
- ✅ 6/6 outbound scheduler tests passing (100%)
- ✅ Total: 27/27 tests passing

**Data Flow:**
1. SMS arrives at GHL → n8n webhook (2 nodes) → Backend `/api/sms/inbound`
2. Backend AI Router classifies intent with full context
3. Backend handler processes message, generates response
4. Backend saves to `event_messages` + `routing_logs`
5. Backend calls n8n webhook → GHL sends SMS
6. Complete audit trail in database

**Benefits Achieved:**
- ✅ Zero data loss (personalization_data saved correctly)
- ✅ Single codebase for debugging
- ✅ AI Concierge shares knowledge base with Event Orchestrator
- ✅ Full visibility into peer matching progress
- ✅ Easy to add new handlers (just add to registry)
- ✅ Complete test coverage

---

## 📜 OLD VERSION - Original Plan (Pre-Migration)

### 🎯 Architecture Overview (Historical)

```
┌─────────────────────────────────────────────────────────────────┐
│                     TPX BACKEND (Brain)                          │
│  - Event Logic & Scheduling                                      │
│  - Real-time Triggers (check-in, speaker alerts)                 │
│  - CEO Override Controls                                         │
│  - AI Personalization & Context                                  │
│  - PCR Scoring & Analytics                                       │
│  - Message Queue Management (event_messages table)               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ API Call/Webhook
┌─────────────────────────────────────────────────────────────────┐
│                    GHL (Delivery Pipe)                           │
│  - SMS Infrastructure (Twilio)                                   │
│  - Contact Database Sync                                         │
│  - Message Templates                                             │
│  - Delivery Tracking                                             │
│  - Two-way Messaging                                             │
│  - Response Webhooks                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ SMS
┌─────────────────────────────────────────────────────────────────┐
│                  CONTRACTOR PHONE                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Response
┌─────────────────────────────────────────────────────────────────┐
│              GHL → TPX WEBHOOK PROCESSING                        │
│  - Sentiment Analysis                                            │
│  - PCR Score Calculation                                         │
│  - Context-aware Next Actions                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Tables & GHL Mapping

### Our Tables (Source of Truth):
1. **event_messages** - Message queue, scheduling, personalization
2. **event_attendees** - Check-in status, profile completion
3. **event_timeline** - Schedule with CEO override delays
4. **event_speakers** - Session times for alerts
5. **event_sponsors** - Booth info for recommendations

### GHL Integration Points:

| Our System | GHL Component | Integration Method |
|------------|---------------|-------------------|
| event_messages.message_content | SMS Campaign Body | API: Create & Send |
| event_messages.personalization_data | Merge Fields | Map to GHL contact fields |
| event_messages.scheduled_time | Campaign Schedule | API: Schedule campaign |
| event_messages.status | Delivery Status | Webhook: Delivery notification |
| event_messages.response_received | Inbound SMS | Webhook: Message received |
| contractor.phone / real_phone | Contact Phone | API: Create/Update contact |

## 🔄 Message Flow Examples

### 1. Check-in Triggered Welcome SMS
```javascript
// TPX Backend Process:
1. Attendee checks in → eventCheckInController.checkInAttendee()
2. Create event_message record with personalization
3. Call GHL API to send immediate SMS
4. GHL sends: "Welcome {{name}} from {{company}}! Your custom agenda..."
5. Update event_messages.status = 'sent'
```

### 2. Speaker Alert (15 min before)
```javascript
// Scheduled Job in TPX:
1. Query: Find sessions starting in 15 minutes
2. Match attendee focus_areas with session focus_areas
3. Create personalized message in event_messages
4. Call GHL API with attendee list and template
5. Track delivery via webhook
```

### 3. CEO Override (Delay All Messages)
```javascript
// Admin Action:
1. Greg texts: "Delay 10 minutes"
2. TPX updates event_messages.scheduled_time += 10 minutes
3. TPX updates event_timeline.delay_minutes
4. Cancel pending GHL campaigns
5. Reschedule with new times
```

### 4. Conversational PCR Scoring
```javascript
// Two-way conversation:
1. GHL receives response: "The speaker was amazing! 9/10"
2. Webhook to TPX with message
3. TPX analyzes sentiment (positive = 0.9)
4. Extract PCR score (9/10 = 90)
5. Update event_messages.pcr_score
6. Trigger follow-up via GHL
```

## 🛠️ Implementation Requirements

### GHL Setup Needed:
1. **Custom Fields** in GHL contacts:
   - event_id
   - contractor_id
   - focus_areas (JSON)
   - real_phone (event-specific)
   - qr_code_data

2. **Workflows** to create:
   - Event Check-in Welcome
   - Speaker Alert Template
   - Sponsor Recommendation
   - Peer Introduction
   - Feedback Request

3. **Webhooks** to configure:
   - Inbound SMS → TPX Backend
   - Delivery Status → TPX Backend
   - Contact Updates → TPX Backend

### TPX Backend Needs:
1. **GHL API Service** (new file: ghlService.js)
   - Send SMS via GHL API
   - Create/Update contacts
   - Schedule campaigns
   - Cancel campaigns

2. **Webhook Receivers** (new routes: /api/webhooks/ghl/*)
   - Process inbound SMS
   - Update delivery status
   - Handle contact changes

3. **Message Processor** (background job)
   - Check event_messages for pending
   - Batch send via GHL
   - Handle failures/retries

## 🔑 Key Design Decisions

### Why Not Pure GHL?
1. **Complex Event Logic** - GHL can't handle "if speaker matches focus_area"
2. **Real-time Adaptability** - CEO overrides, dynamic delays
3. **AI Integration** - Our GPT-4 generates talking points, not GHL
4. **PCR Scoring** - Custom algorithm, not simple rating
5. **Peer Matching** - Complex algorithm (same role, different market)

### Why Not Pure TPX?
1. **SMS Infrastructure** - Don't rebuild what GHL/Twilio provides
2. **Delivery Reliability** - GHL handles retries, carrier issues
3. **Compliance** - GHL manages opt-outs, TCPA compliance
4. **Cost** - GHL's Twilio rates better than direct
5. **Existing Investment** - Already paying for GHL

## 📝 Configuration Notes

### Environment Variables Needed:
```env
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id
GHL_WEBHOOK_SECRET=webhook_verification_secret
GHL_SMS_CAMPAIGN_ID=default_campaign_id
```

### GHL API Endpoints We'll Use:
- `POST /contacts` - Create/update attendee
- `POST /campaigns/sms` - Send message
- `PUT /campaigns/{id}/schedule` - Update timing
- `DELETE /campaigns/{id}` - Cancel (for overrides)
- `GET /conversations/{id}` - Get responses

## ⚠️ Critical Considerations

1. **Rate Limits** - GHL has API limits, batch accordingly
2. **Phone Format** - Ensure +1 prefix for US numbers
3. **Message Length** - 160 chars per segment, plan accordingly
4. **Opt-out Handling** - Respect GHL's opt-out list
5. **Testing** - Use GHL sandbox for development

## 🚀 Next Steps

1. Build GHL API service layer
2. Create webhook endpoints
3. Set up message processor job
4. Configure GHL workflows
5. Test with small event
6. Scale to full implementation

---

*This architecture gives us the best of both worlds: TPX's intelligent orchestration with GHL's reliable delivery.*