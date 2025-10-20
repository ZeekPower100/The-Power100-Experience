# Event Orchestration Complete Visual Flow

**Last Updated:** 2025-10-19
**Version:** 1.1
**Status:** Production Ready - Complete Automation

This document provides a comprehensive visual representation of the entire event orchestration flow from contractor registration through post-event wrap-up.

**Important Context**: The Power100 Experience (TPX) is an enhancement layer that provides personalized, AI-driven experiences for contractors attending events. TPX does not own or host these events - we enhance the attendee experience through intelligent orchestration, personalized recommendations, and real-time engagement.

---

## 📋 Complete Event Orchestration Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTRACTOR REGISTERS FOR EVENT                        │
│                         (Admin adds attendee)                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE: Registration Confirmation                                    │
│  • Email confirmation sent                                               │
│  • SMS confirmation sent (if opted in)                                   │
│  • "You're registered for [Event Name]! Get ready for a personalized    │
│    experience powered by The Power100."                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE: Schedule Check-In Reminders (6 messages)                     │
│  • Night before (8 PM): Email + SMS                                      │
│  • 1 hour before event: Email + SMS                                      │
│  • Event start time: Email + SMS                                         │
│  BullMQ schedules all with exact timing                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                        ┌────────┴────────┐
                        │ Profile Status? │
                        └────────┬────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌───────────────────────┐       ┌───────────────────────┐
    │ Profile COMPLETE      │       │ Profile INCOMPLETE    │
    │ (All fields filled)   │       │ (Missing data)        │
    └───────┬───────────────┘       └───────┬───────────────┘
            │                               │
            │                               ▼
            │               ┌─────────────────────────────────────────┐
            │               │ SCHEDULE Profile Completion Reminders   │
            │               │                                         │
            │               │ IF Event > 3 Days Away:                 │
            │               │  • Phase 1: Day 1, 2, 3 (3 reminders)   │
            │               │  • Pause period                         │
            │               │  • Phase 2: 3, 2, 1 days before event   │
            │               │  • Total: Up to 12 messages (6+6)       │
            │               │                                         │
            │               │ IF Event ≤ 3 Days Away:                 │
            │               │  • Daily reminders until event          │
            │               │                                         │
            │               │ Smart Auto-Skip: If profile completed   │
            │               │ before send time, skip all remaining    │
            │               └───────┬─────────────────────────────────┘
            │                       │
            │                       ▼
            │               ┌─────────────────────────────────────────┐
            │               │ Contractor Completes Profile            │
            │               │ (Anytime before event)                  │
            │               └───────┬─────────────────────────────────┘
            │                       │
            └───────────────────────┴─────────────────────────────────┐
                                    │                                 │
                                    ▼                                 ▼
            ┌─────────────────────────────────────────────────────────────┐
            │  PRE-EVENT: Check-In Reminders Sent (BullMQ Scheduled)      │
            │  • Night before (8 PM): "[Event Name] is tomorrow! Tap to   │
            │    check in and get your personalized agenda."               │
            │  • 1 hour before: "[Event Name] starts in 1 hour! Check in  │
            │    now to unlock your personalized experience."              │
            │  • Event start: "[Event Name] is starting! Tap to check in  │
            │    and see your custom recommendations."                     │
            │  Each message includes one-click check-in button             │
            └─────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
            ┌─────────────────────────────────────────────────────────────┐
            │              CONTRACTOR CHECKS IN (Online/QR)                │
            │  PRIMARY: One-click button from email/SMS reminder           │
            │  SECONDARY: QR code scan at venue (if provided)              │
            │  • Backend receives check-in request                         │
            │  • Can check in before arriving (unlock agenda early!)       │
            └─────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
                             ┌────────┴────────┐
                             │ Profile Status? │
                             └────────┬────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
                     ▼                                 ▼
         ┌───────────────────────┐       ┌───────────────────────────┐
         │ Profile COMPLETE      │       │ Profile INCOMPLETE        │
         │ Proceed to AI         │       │ Prompt to complete now    │
         │ orchestration         │       │ or complete later         │
         └───────┬───────────────┘       └───────┬───────────────────┘
                 │                               │
                 │                ┌──────────────┘
                 │                │
                 ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE: Check-In Confirmation SMS                                    │
│  "You're checked in for [Event Name]! 🎯 Your personalized experience   │
│  is being prepared..."                                                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE: AI Orchestration Begins                                      │
│  orchestrateEventExperience(contractor_id, event_id)                     │
│                                                                          │
│  AI analyzes contractor:                                                 │
│  • Focus areas (staffing, operations, marketing, etc.)                   │
│  • Company size & revenue tier                                           │
│  • Business challenges                                                   │
│  • Past event interactions                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AI GENERATES Personalized Agenda                                        │
│  • Top 3 speakers (matched to focus areas)                               │
│  • Top 3 sponsors (matched to business needs)                            │
│  • Top 3 peer matches (similar businesses for networking)                │
│  • Personalized talking points for each                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SCHEDULES All During-Event Messages (Inserted into event_messages)      │
│                                                                          │
│  1. Speaker Alerts (15 min before each session)                          │
│     • For each agenda item where type = 'session'                        │
│     • "Brian's session on [topic] starts in 15 min!"                     │
│                                                                          │
│  2. Sponsor Recommendations (During breaks/intermissions)                │
│     • Scheduled 2 min after each break/lunch starts                      │
│     • Intelligently finds break periods from agenda                      │
│     • "While you're on break, check out [Sponsor] at Booth 12"          │
│                                                                          │
│  3. Peer Introductions (5 min after lunch time)                          │
│     • Batch peer matching runs 15 min before lunch                       │
│     • Introductions sent at lunch + 5 minutes                            │
│     • "Meet John from ABC Plumbing - you're both scaling ops!"          │
│                                                                          │
│  4. Speaker PCR Requests (7 min after each session)                      │
│     • Rate speaker performance (1-5)                                     │
│     • AI analyzes sentiment of response                                  │
│                                                                          │
│  5. Peer Match Attendance (20 min after peer introduction)               │
│     • "Did you get to meet John? (YES/NO)"                               │
│     • If YES → Schedule PCR request                                      │
│     • If NO → Offer alternative connection                               │
│                                                                          │
│  6. Sponsor Batch Check (Event end time)                                 │
│     • "Which sponsors did you visit? (Reply with numbers)"               │
│     • Prioritized list of recommended sponsors                           │
│                                                                          │
│  7. Overall Event PCR (1 hour after event ends)                          │
│     • "Rate your overall experience (1-5)"                               │
│     • Includes event stats (peers met, sessions attended, etc.)          │
│                                                                          │
│  All messages scheduled in BullMQ with exact timing                      │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE: Agenda Ready Notification                                    │
│  • Email sent with full personalized agenda                              │
│  • SMS sent: "Your personalized agenda is ready! Check your email"       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DURING EVENT: Message Delivery                        │
│                  (eventMessageWorker + BullMQ Process)                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ 15 MIN BEFORE       │ │ 2 MIN AFTER      │ │ LUNCH + 5 MIN        │
│ Speaker Session     │ │ Break Starts     │ │ Peer Introduction    │
└─────────┬───────────┘ └────────┬─────────┘ └──────────┬───────────┘
          │                      │                       │
          ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Speaker Alert SMS                                                       │
│  "Hey John! Brian's session on scaling operations starts in 15 min      │
│  at Main Stage. Here's what to ask about: [talking points]"             │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼ (Session ends)
                          │
                          ▼ (7 min after session ends)
┌─────────────────────────────────────────────────────────────────────────┐
│  Speaker PCR Request (AI-Driven)                                         │
│  "How would you rate Brian's session? (1-5)"                             │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Contractor Responds: "5 - Great practical examples!"                    │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AI Sentiment Analysis                                                   │
│  • Extract explicit score: 5                                             │
│  • Analyze sentiment: 0.85 (very positive)                               │
│  • Extract keywords: ["great", "practical", "examples"]                  │
│  • Normalize sentiment to 1-5 scale: 4.63                                │
│  • Calculate final weighted score: 4.89 (70% explicit + 30% sentiment)   │
│  • Save to event_pcr_scores table                                        │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Thank You + Follow-Up                                                   │
│  "Thanks for the feedback! Want to connect with Brian after the event?"  │
└──────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  Sponsor Recommendation SMS (AI-Driven)                                  │
│  "While you're on break, check out Destination Motivation at Booth 12!  │
│  They specialize in [matching contractor focus areas]. Ask about:       │
│  [personalized talking points]"                                          │
└──────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  Peer Introduction SMS (Template-Based)                                  │
│  "Meet John Smith from ABC Plumbing! You're both focused on scaling     │
│  operations. He's at Table 7. Here's what you have in common:           │
│  [AI-generated connection points]"                                       │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼ (20 min after introduction)
┌─────────────────────────────────────────────────────────────────────────┐
│  Peer Match Attendance Check (AI-Driven)                                 │
│  "Did you get to meet John Smith? (YES/NO)"                              │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
    ┌───────────────┐         ┌─────────────────┐
    │ Response: YES │         │ Response: NO    │
    └───────┬───────┘         └────────┬────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│ Schedule Peer PCR       │  │ AI: Offer Alternative        │
│ Request (3 min later)   │  │ "Want me to introduce you    │
│ "Rate your connection   │  │  to someone else in ops?"    │
│  with John (1-5)"       │  │                              │
└─────────────────────────┘  └──────────────────────────────┘


            ┌────────────────────────────────────────┐
            │         EVENT ENDS                     │
            └────────────────┬───────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  IMMEDIATE: Sponsor Batch Check (AI-Driven)                              │
│  "That's a wrap on Day 1! Which sponsors did you visit today?           │
│  Reply with numbers:                                                     │
│  1. Destination Motivation                                               │
│  2. ServiceTitan                                                         │
│  3. Jobber"                                                              │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Contractor Responds: "1,3"                                              │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AI: Schedule PCR Requests for Each Sponsor Visited                      │
│  • "Rate your conversation with Destination Motivation (1-5)"            │
│  • "Rate your conversation with Jobber (1-5)"                            │
│  Sent immediately after response                                         │
└──────────────────────────────────────────────────────────────────────────┘


                          │
                          ▼ (1 hour after event ends)
┌─────────────────────────────────────────────────────────────────────────┐
│  Overall Event PCR Request (AI-Driven)                                   │
│  "How was your experience at [Event Name]? Rate 1-5                     │
│                                                                          │
│  Your Power100 stats:                                                    │
│  • 3 speakers attended                                                   │
│  • 2 sponsors visited                                                    │
│  • 3 peer connections made                                               │
│  • 8 sessions completed                                                  │
│                                                                          │
│  We'd love your feedback!"                                               │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Contractor Responds with Overall Rating                                 │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AI: Sentiment Analysis + Final Score Calculation                        │
│  • Saves to event_pcr_scores table                                       │
│  • Updates contractor event experience record                            │
│  • Flags for follow-up if score < 7                                      │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POST-EVENT: Ongoing AI Concierge Engagement                             │
│  • Contractor can text anytime for:                                      │
│    - Speaker contact information                                         │
│    - Sponsor introductions                                               │
│    - Peer follow-up                                                      │
│    - Session materials/resources                                         │
│    - Future event recommendations                                        │
│  • AI Concierge knows entire event history                               │
│  • Proactive check-ins based on engagement patterns                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Decision Points in the Flow

### 1. Profile Completion Branch (Pre-Event)

```
Registration → Check Profile Status
                      │
    ┌─────────────────┴─────────────────┐
    │                                   │
Complete: Skip reminders          Incomplete: Send reminders
    │                                   │
    └───────────────┬───────────────────┘
                    │
             Both paths converge at
              check-in orchestration
```

**Rationale**: Even if profile completed late (or at check-in), AI orchestration handles it seamlessly.

---

### 2. Peer Match Response Branch (During Event)

```
Peer Introduction Sent (lunch + 5 min)
           │
           ▼ (Wait 20 minutes)
"Did you meet John?"
           │
    ┌──────┴──────┐
    │             │
   YES            NO
    │             │
    ▼             ▼
Request PCR   Offer Alternative
  Rating      Connection
```

**Rationale**: If contractors don't connect, we intervene immediately to create value.

---

### 3. Event PCR Scoring Flow (Post-Session)

```
Session Ends
     │
     ▼ (7 min delay)
PCR Request Sent
     │
     ▼
Contractor Response
     │
     ▼
AI Sentiment Analysis
     │
     ├─ Extract explicit score (1-5)
     ├─ Analyze sentiment (-1 to 1)
     ├─ Extract keywords
     └─ Calculate final weighted score
     │
     ▼
Save to Database
     │
     ▼
Thank You + Follow-Up
```

**Rationale**: 7-minute delay allows contractors to process and reflect on session before rating.

---

## 🎯 Online Check-In: The Pre-Arrival Advantage

### Why Online Check-In is Primary

**One-Click Button from Reminders**:
- Every check-in reminder (night before, 1 hour, event start) includes a one-click check-in button
- No app download required
- No QR scanning needed (though available as backup at venue)
- Works from anywhere: home, office, car, hotel

### The Early Check-In Benefit

```
Contractor receives "1 hour before" reminder
           ↓
Clicks check-in button from email/SMS
           ↓
IMMEDIATELY receives personalized agenda
           ↓
Reviews agenda before arriving at venue
           ↓
Arrives prepared: knows which speakers to see, which sponsors to visit, who to network with
```

**Value Proposition**:
- Check in from home → Review personalized recommendations → Arrive with a plan
- No need to wait until physical arrival to unlock their experience
- Can plan their day strategically before stepping foot in venue

**QR Code Fallback**:
- Available at venue check-in desk
- For contractors who didn't check in online
- Same experience, just later timing

**Result**: Most contractors check in online before arrival, unlocking their personalized experience early and arriving better prepared.

---

## ⏱️ Critical Timing Breakdown

### Pre-Event Timeline

```
Registration Day
    │
    ├─ Immediate: Registration confirmation (Email + SMS)
    ├─ Immediate: Schedule 6 check-in reminders
    └─ IF profile incomplete:
           ├─ Day 1 after: First reminder
           ├─ Day 2 after: Second reminder
           ├─ Day 3 after: Third reminder
           ├─ [Pause Period]
           ├─ 3 days before event: Resume reminders
           ├─ 2 days before event: Reminder
           └─ 1 day before event: Final reminder

Event Day - 1
    └─ 8:00 PM: Check-in reminder (Email + SMS)

Event Day
    ├─ Event start - 1 hour: Check-in reminder (Email + SMS)
    └─ Event start time: Final check-in reminder (Email + SMS)
```

---

### Event Day Timeline

```
Contractor Checks In
    │
    ├─ Immediate: Check-in confirmation SMS
    ├─ Immediate: AI orchestration (personalized agenda generation)
    └─ Immediate: Agenda ready notification (Email + SMS)

Throughout Event (BullMQ Scheduled):
    │
    ├─ Session start - 15 min: Speaker alert
    │   └─ Session end + 7 min: Speaker PCR request
    │
    ├─ Break start + 2 min: Sponsor recommendation
    │
    ├─ Lunch start + 5 min: Peer introduction
    │   └─ Peer intro + 20 min: Attendance check
    │       ├─ If YES: Peer intro + 23 min: Peer PCR request
    │       └─ If NO: Immediate alternative offer
    │
    ├─ Event end: Sponsor batch check
    │   └─ Response received: Immediate sponsor PCR requests
    │
    └─ Event end + 1 hour: Overall event PCR request
```

---

## 🔄 Message Type Summary

| Message Type | Trigger | Timing | Channel | AI-Driven |
|--------------|---------|--------|---------|-----------|
| Registration Confirmation | Attendee added | Immediate | Email + SMS | No |
| Profile Completion Reminder | Profile incomplete | Tiered (3+3 or daily) | Email + SMS | No |
| Check-In Reminder | Scheduled | Night before, -1hr, start | Email + SMS | No |
| Check-In Confirmation | Check-in action | Immediate | SMS | No |
| Agenda Ready | AI orchestration complete | Immediate after check-in | Email + SMS | Yes |
| Speaker Alert | Agenda schedule | -15 min before session | SMS | No |
| Speaker PCR Request | Session ends | +7 min after session | SMS | Yes |
| Sponsor Recommendation | Break/lunch schedule | +2 min after break starts | SMS | Yes |
| Peer Introduction | Lunch time | Lunch + 5 min | SMS | Yes |
| Peer Attendance Check | Peer intro sent | +20 min after intro | SMS | Yes |
| Peer PCR Request | YES to attendance | +3 min after YES | SMS | Yes |
| Sponsor Batch Check | Event ends | Event end time | SMS | Yes |
| Sponsor PCR Request | Sponsor batch response | Immediate after response | SMS | Yes |
| Overall Event PCR | Event ends | +1 hour after end | SMS | Yes |

---

## 🎨 Message Personalization Levels

### Template-Based (Fast, Consistent)
- Registration confirmation
- Check-in reminders
- Check-in confirmation
- Speaker alerts
- Peer introductions

### AI-Driven (Personalized, Conversational)
- Personalized agenda (matches to focus areas)
- Sponsor recommendations (business need matching)
- All PCR requests (sentiment analysis on responses)
- Peer attendance checks
- Sponsor batch checks
- Overall event PCR

### Hybrid (Template + AI Enhancement)
- Agenda ready notification (template structure + AI content)
- Follow-up messages (template structure + AI personalized actions)

---

## 💾 Data Storage Journey

```
Registration
    ↓
event_attendees table
    ├─ contractor_id
    ├─ event_id
    ├─ registration_date
    └─ profile_completion_status

Check-In
    ↓
event_attendees (updated)
    ├─ checked_in_at
    └─ check_in_status = 'checked_in'

AI Orchestration
    ↓
event_messages table
    ├─ All scheduled messages created
    ├─ scheduled_time calculated
    ├─ personalization_data (AI-generated)
    └─ status = 'scheduled'

BullMQ Processing
    ↓
event_messages (updated)
    ├─ status = 'sent'
    ├─ actual_send_time
    └─ n8n/GHL webhook called

PCR Collection
    ↓
event_pcr_scores table
    ├─ explicit_score (1-5)
    ├─ sentiment_score (-1 to 1)
    ├─ final_pcr_score (weighted)
    ├─ sentiment_analysis (JSON)
    └─ AI conversation context
```

---

## 🚀 Automation Milestones Achieved

✅ **100% Registration Flow Automated**
- Confirmation messages sent automatically
- Check-in reminders scheduled with exact timing
- Profile completion reminders with tiered strategy

✅ **100% Check-In Flow Automated**
- AI orchestration triggers on check-in
- Personalized agenda generated in real-time
- All during-event messages scheduled instantly

✅ **100% During-Event Flow Automated**
- BullMQ processes all scheduled messages at exact times
- No manual intervention required
- Automatic retries on failures (3 attempts)

✅ **100% PCR Collection Automated**
- AI-driven requests based on event triggers
- Sentiment analysis on all responses
- Automatic follow-ups based on scores

✅ **100% Post-Event Flow Automated**
- Sponsor batch check at event end
- Overall event PCR 1 hour after end
- AI Concierge available for ongoing engagement

---

## 📊 System Health Indicators

### Message Delivery Success Metrics
- **Expected**: 95%+ delivery rate
- **Tracked via**: BullMQ job completion stats
- **Alert if**: Delivery rate drops below 90%

### Response Rate Metrics
- **Expected**: 60%+ response to PCR requests
- **Tracked via**: event_pcr_scores table
- **Insight**: Higher during event, lower post-event

### Timing Accuracy
- **Expected**: ±30 seconds of scheduled time
- **Tracked via**: actual_send_time vs scheduled_time
- **Alert if**: Delay exceeds 5 minutes

---

## 🔧 Technical Components

### Core Services
- `eventRegistrationService.js` - Handles registration, schedules initial messages
- `eventOrchestrator/checkInReminderScheduler.js` - Schedules all pre-event reminders
- `eventOrchestratorAutomation.js` - AI orchestration on check-in
- `eventOrchestrator/speakerAlertMessageScheduler.js` - Speaker alerts
- `eventOrchestrator/peerMatchingBatchScheduler.js` - Peer matching logic
- `eventOrchestrator/sponsorRecommendationScheduler.js` - Sponsor recommendations
- `eventOrchestrator/speakerPcrScheduler.js` - Speaker PCR requests
- `eventOrchestrator/peerMatchAttendanceScheduler.js` - Peer attendance checks
- `eventOrchestrator/sponsorBatchScheduler.js` - End-of-day sponsor check
- `eventOrchestrator/overallEventPcrScheduler.js` - Overall event wrap-up

### Infrastructure
- `queues/eventMessageQueue.js` - BullMQ queue management
- `workers/eventMessageWorker.js` - Message processing worker
- Redis - Job queue storage
- PostgreSQL - Event data, messages, PCR scores

### External Integrations
- n8n - Webhook orchestration
- GoHighLevel - SMS delivery
- OpenAI GPT-4 - Sentiment analysis and AI responses

---

## 📌 Important Notes

### TPX Positioning
The Power100 Experience (TPX) is an **enhancement layer** for events, not the event host. We provide:
- Personalized AI-driven recommendations
- Intelligent speaker/sponsor/peer matching
- Real-time engagement orchestration
- Post-event relationship building

All messaging emphasizes that TPX enhances the contractor's experience at events they're already attending, rather than positioning TPX as the event organizer.

### Check-In Method Priority
1. **Primary**: One-click button from email/SMS reminders (online check-in)
2. **Secondary**: QR code at venue check-in desk

Most contractors check in online before arriving, unlocking their personalized agenda early for better event preparation.

---

**Document Version**: 1.1
**Last Updated**: 2025-10-19
**Status**: Production Ready - Complete Visual Reference
**Changes in v1.1**: Updated messaging to reflect TPX as enhancement layer, emphasized online check-in as primary method
**Maintainer**: The Power100 Experience Development Team
