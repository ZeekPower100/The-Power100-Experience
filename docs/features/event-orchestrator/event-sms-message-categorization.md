# 📱 Event Orchestration SMS Message Type Categorization

**Complete categorization of all SMS message types in the Event Orchestrator system**

*Last Updated: September 30, 2025*
*Status: In Progress - SMS Router + Response Workflows COMPLETE*
*Phase: Active n8n Workflow Development*

---

## 📋 Overview

This document categorizes ALL SMS message types across the Event Orchestrator system (Phases 1-5), including:
- Event Registration & Onboarding
- Event Check-In & Welcome
- Speaker Alerts & Session Notifications
- Sponsor Recommendations & Booth Guidance
- Peer Matching & Networking (Phase 5)
- PCR Scoring & Feedback (Phase 4)
- CEO Override & Admin Controls
- Post-Event Wrap-Up
- **SMS Router & Response System** ✅ COMPLETE (Sept 30, 2025)

**Purpose**: Serve as the master reference for building individual n8n workflows for each message category.

## 🎯 SMS Router Architecture (COMPLETED)

### Centralized Router System
**Workflow ID**: `Xx8OJ6zQclCZayX8` (TPX SMS Router - DEV)
**Status**: ✅ COMPLETE (Sept 30, 2025)

The SMS Router is a centralized n8n workflow that receives ALL incoming SMS replies from contractors and intelligently routes them to the appropriate response workflow.

### 3-Layer Routing Intelligence

#### Layer 1: Database State (90% confidence - PRIMARY)
- Queries `/api/event-messaging/pending-context?contractor_id=X`
- Checks for pending messages sent in last 48 hours
- Routes based on `message_type` from most recent pending message
- **Skips messages with null personalization_data** to avoid errors

#### Layer 2: Keyword Detection (60-70% confidence - SECONDARY)
- PCR responses: Numeric patterns `1-5`
- Sponsor responses: Keywords like "sponsor", "booth", "info", "talk"
- Speaker responses: Keywords like "speaker", "session", "presentation"

#### Layer 3: Fallback (clarification needed)
- Routes to clarification workflow when confidence < 0.5

### Response Workflows Built

| Workflow | Status | ID | Features |
|----------|--------|-----|----------|
| **Sponsor Response** | ✅ COMPLETE | `auUATKX6Ht4OK2s9` | Natural language parsing, full talking points, GHL integration, backend logging |
| **PCR Response** | ✅ COMPLETE | `hTyeWDSEEsal59Ad` | Backend intelligent parsing, sentiment analysis, 1-5 scoring |
| **Speaker Response** | ⏳ PENDING | TBD | Planned for Phase 3 completion |

### Backend Integration Points

#### New API Endpoints (Sept 30, 2025)
```javascript
// GET /api/event-messaging/pending-context
// Returns pending messages for contractor in last 48 hours
// Used by SMS Router for Layer 1 routing

// POST /api/event-messaging/routing-log
// Logs routing decisions for analytics
// Tracks route_to, confidence, routing_method
```

#### Enhanced Backend Services
- **pcrScoringService.js**: Updated with intelligent natural language parsing (`/\b([1-5])\b/`)
- **eventMessagingController.js**: Added `getPendingContext()` and `logRoutingDecision()` methods

### Natural Language Support
Both Sponsor and PCR response workflows now support conversational replies:
- ✅ "I want to know about 3 as well" → Extracts 3
- ✅ "My score is 4 for sure" → Extracts 4
- ✅ "Tell me about sponsor 2" → Extracts 2
- ✅ "I'd rate it a 5" → Extracts 5

---

## 📊 Quick Statistics

| Metric | Count | Completion |
|--------|-------|------------|
| **Total Message Types** | 28 | - |
| **Categories** | 9 (added SMS Router) | - |
| **Response-Required Messages** | 11 of 11 | ✅ 100% |
| **Automated/Scheduled Messages** | 11 of 17 | 65% |
| **AI-Generated Content Messages** | 6 of 10 | 60% |
| **n8n Workflows Completed** | 7 of 9 | 78% |

---

## 🗂️ CATEGORY 1: EVENT REGISTRATION & ONBOARDING

**Purpose**: Pre-event communication, profile completion, agenda delivery

**n8n Workflow Name Suggestion**: `Event Registration & Onboarding Messaging`

### Message Types

#### 1.1 Registration Confirmation
- **Trigger**: Contractor registers for event
- **Data Required**: Event details, dates, location, contractor name
- **Response Expected**: None
- **GHL Integration**: Confirmation webhook
- **Backend Reference**: N/A (handled by registration system)
- **Priority**: HIGH

**Example Message**:
```
Hey John! 🎉

You're registered for Operation Lead Surge 2025!

📅 October 15-17, 2025
📍 Marriott Convention Center, Phoenix AZ

Check your email for full details. See you there!
```

---

#### 1.2 Profile Completion Reminder
- **Trigger**: Incomplete profile 48 hours before event
- **Data Required**: Contractor name, missing fields, completion link
- **Response Expected**: Profile completion action
- **GHL Integration**: Reminder webhook with tracking
- **Backend Reference**: Profile completion status check
- **Priority**: HIGH

**Example Message**:
```
Hi Sarah! 👋

Your profile for Operation Lead Surge is 60% complete.

Complete it now to get:
✅ Personalized agenda
✅ Top speaker recommendations
✅ Sponsor booth matches

Takes 5 minutes: [link]
```

---

#### 1.3 Personalized Agenda Delivery
- **Trigger**: Profile completion OR 24 hours before event
- **Data Required**:
  - Top 3 speakers (with WHY explanations)
  - Top 3 sponsors (with booth info)
  - Custom schedule based on focus areas
- **Response Expected**: None
- **GHL Integration**: AI-generated content webhook
- **Backend Reference**: `eventMessagingController.js` - lines 11-55 (scheduleMessage)
- **Priority**: CRITICAL (AI-generated content)

**Example Message**:
```
Your personalized agenda is ready, John! 📋

🎤 TOP SPEAKERS FOR YOU:
1. Brian Smith - "Scaling Operations"
   WHY: Matches your focus on hiring & operations
2. Sarah Lee - "Sales Team Building"
   WHY: Aligns with your $2M-$5M revenue stage
3. Mike Chen - "Tech Stack Optimization"
   WHY: Relevant to your greenfield growth goals

🤝 TOP SPONSORS TO VISIT:
1. Destination Motivation (Booth 12)
   Contact: Jennifer Clark, VP Sales
   WHY: Hiring & recruiting solutions

Full agenda: [link]
```

---

## 🗂️ CATEGORY 2: EVENT CHECK-IN & WELCOME

**Purpose**: Day-of arrival, check-in confirmation, immediate guidance

**n8n Workflow Name Suggestion**: `Event Check-In & Welcome Flow`

### Message Types

#### 2.1 Check-In Welcome
- **Trigger**: QR code scan OR manual check-in
- **Data Required**: Contractor name, company, first session info, networking area location
- **Response Expected**: None
- **GHL Integration**: Check-in webhook
- **Backend Reference**: `eventCheckInController.js` - check-in endpoint
- **Priority**: CRITICAL

**Example Message**:
```
Welcome, John! 🎉

You're checked in to Operation Lead Surge!

🎤 First session starts in 30 min (Hall A)
☕ Networking area: Lobby Level 2
📱 Reply HELP anytime for assistance

Let's make this amazing!
```

---

#### 2.2 Mass Check-In (Stage Coordination)
- **Trigger**: CEO/admin triggers mass check-in for all attendees
- **Data Required**: Personalized welcome with name/company for each attendee
- **Response Expected**: None
- **GHL Integration**: Bulk SMS webhook
- **Backend Reference**: `eventMessagingController.js` - lines 57-123 (massScheduleMessages)
- **Priority**: CRITICAL (CEO feature)

**Example Message** (personalized for each attendee):
```
Welcome to Operation Lead Surge, Sarah! 🎉

ABC Contractors is in the house!

Opening keynote starts in 15 minutes. Head to Main Hall.

Let's grow your business this weekend! 💪
```

---

#### 2.3 First Session Countdown
- **Trigger**: 10 minutes after check-in
- **Data Required**: First relevant session based on focus areas
- **Response Expected**: None
- **GHL Integration**: Scheduled message webhook
- **Backend Reference**: Session scheduling logic
- **Priority**: MEDIUM

**Example Message**:
```
Heads up, John! ⏰

Your first session starts in 10 minutes:

"Scaling Operations Without Losing Quality"
📍 Hall A
🎤 Brian Smith

Don't miss it!
```

---

## 🗂️ CATEGORY 3: SPEAKER ALERTS & SESSION NOTIFICATIONS

**Purpose**: Real-time session coordination, 15-minute pre-session alerts

**n8n Workflow Name Suggestion**: `Speaker Alerts & Session Notifications`

### Message Types

#### 3.1 15-Minute Speaker Alert (Focus Area Match)
- **Trigger**: 15 minutes before session start for contractors with matching focus areas
- **Data Required**:
  - Speaker name
  - Session topic
  - Why relevant (AI-generated)
  - Session location
  - Focus area match
- **Response Expected**: Optional attendance confirmation
- **GHL Integration**: Speaker alert webhook with scheduling
- **Backend Reference**: Speaker alert service (automated cron-ready)
- **Priority**: CRITICAL (Phase 2 feature)

**Example Message**:
```
Hey John! 🎤

Brian is about to speak in 15 minutes!

📋 "Scaling Operations Without Losing Quality"
📍 Hall A
💡 MATCHES YOUR FOCUS: Operations & hiring

Don't miss this one!
```

---

#### 3.2 Session Reminder (General)
- **Trigger**: 5 minutes before any bookmarked session
- **Data Required**: Session title, speaker, room
- **Response Expected**: None
- **GHL Integration**: Session reminder webhook
- **Backend Reference**: Bookmarked sessions tracking
- **Priority**: MEDIUM

**Example Message**:
```
⏰ 5 MINUTE WARNING

Your bookmarked session is starting:
"Tech Stack Optimization"
Hall B - Mike Chen

See you there!
```

---

## 🗂️ CATEGORY 4: SPONSOR RECOMMENDATIONS & BOOTH GUIDANCE

**Purpose**: AI-driven sponsor matching, conversation starters, demo booking

**n8n Workflow Name Suggestion**: `Sponsor Recommendations & Booth Guidance`

### Message Types

#### 4.1 Top 3 Sponsor Recommendations
- **Trigger**: After check-in OR during first break
- **Data Required**:
  - 3 sponsors with booth numbers
  - Contact names/titles from booth_representatives
  - AI-generated talking points personalized to contractor
  - WHY each sponsor is recommended
- **Response Expected**: Optional "interested" reply
- **GHL Integration**: Sponsor recommendation webhook
- **Backend Reference**: Event AI recommendations service
- **Priority**: CRITICAL (Phase 3 AI feature)

**Example Message**:
```
Top sponsors for you, Sarah! 🤝

1️⃣ Destination Motivation (Booth 12)
   Contact: Jennifer Clark, VP Sales
   SAY: "I'm looking for greenfield growth support in hiring"
   WHY: 94% match for hiring challenges

2️⃣ ServiceTitan (Booth 8)
   Contact: Mike Johnson, Solutions Engineer
   SAY: "Tell me about your operations automation"
   WHY: Perfect for your tech stack needs

3️⃣ Scorpion (Booth 15)
   Contact: Lisa Martinez, Marketing Director
   SAY: "Show me marketing ROI for $2M-$5M companies"
   WHY: Matches your revenue tier

Reply with 1, 2, or 3 to learn more!
```

---

#### 4.2 Break-Time Sponsor Prompt
- **Trigger**: 5 minutes before scheduled breaks
- **Data Required**: Next recommended sponsor, booth location
- **Response Expected**: None
- **GHL Integration**: Break-time webhook
- **Backend Reference**: Break schedule tracking
- **Priority**: MEDIUM

**Example Message**:
```
☕ Break time in 5 minutes!

Perfect time to visit Destination Motivation at Booth 12.

Ask for Jennifer Clark - she's expecting Power100 contractors!
```

---

#### 4.3 Demo Booking Confirmation
- **Trigger**: Contractor books demo with sponsor
- **Data Required**: Sponsor name, demo details, calendar link, confirmation number
- **Response Expected**: None
- **GHL Integration**: Booking confirmation webhook
- **Backend Reference**: Demo booking system
- **Priority**: HIGH

**Example Message**:
```
✅ Demo Booked!

Destination Motivation
📅 October 22, 2025 @ 2:00 PM
📧 Confirmation sent to john@company.com

Add to calendar: [link]
```

---

## 🗂️ CATEGORY 5: PEER MATCHING & NETWORKING

**Purpose**: Facilitate non-competing peer connections (Phase 5)

**n8n Workflow Name Suggestion**: `Peer Matching & Networking System`

### Message Types

#### 5.1 Peer Introduction Prompt
- **Trigger**: Matching algorithm finds ideal peer (0.8+ score)
- **Data Required**:
  - Peer name, company, location
  - Common focus areas
  - Match explanation (from algorithm)
  - Match score
- **Response Expected**: YES/NO/LATER
- **GHL Integration**: Peer introduction webhook
- **Backend Reference**: `peerMatchingService.js` - lines 559-582 (generatePeerIntroductionSMS)
- **Priority**: CRITICAL (Phase 5 feature)

**Example Message**:
```
Hey John! 👋

🤝 Find Your Peer: I found someone perfect for you to meet!

Sarah Johnson from ABC Contractors (Dallas, TX) - you're both focused on hiring and operations.

They're in a non-competing market, so this is a great chance to share strategies!

Reply YES to get an intro, or LATER if you want to connect during a break.
```

---

#### 5.2 Break-Time Peer Coordination
- **Trigger**: 5 minutes before break (after both parties say YES)
- **Data Required**: Peer name, meeting location, break time
- **Response Expected**: YES/SKIP confirmation
- **GHL Integration**: Break coordination webhook
- **Backend Reference**: `peerMatchingService.js` - lines 612-632 (generateBreakTimePrompt)
- **Priority**: HIGH

**Example Message**:
```
Hey John!

☕ Break time in 5 minutes!

Want to meet Sarah at the networking area? They're waiting to connect with you.

Reply YES to confirm or SKIP if you need this break.
```

---

#### 5.3 Contact Exchange
- **Trigger**: Both contractors respond YES to introduction
- **Data Required**: Peer's phone, email, company
- **Response Expected**: None
- **GHL Integration**: Contact exchange webhook
- **Backend Reference**: `peerMatchingService.js` - lines 634-647 (generateContactExchangeSMS)
- **Priority**: HIGH

**Example Message**:
```
Great news, John! 🎉

Sarah Johnson (ABC Contractors) also wants to connect!

📱 555-123-4567
✉️ sarah@abccontractors.com

I've sent them your info too. Enjoy the conversation!
```

---

#### 5.4 Post-Connection Follow-Up
- **Trigger**: 2-3 hours after contact exchange
- **Data Required**: Peer name, company
- **Response Expected**: 1-10 rating
- **GHL Integration**: Follow-up webhook
- **Backend Reference**: `peerMatchingService.js` - lines 649-666 (generatePostConnectionFollowUp)
- **Priority**: MEDIUM

**Example Message**:
```
Hey John!

How was your chat with Sarah from ABC Contractors?

Reply with a quick rating (1-10) to help us make better peer matches in the future!
```

---

## 🗂️ CATEGORY 6: PCR SCORING & FEEDBACK

**Purpose**: Real-time conversational feedback collection (Phase 4)

**n8n Workflow Name Suggestion**: `PCR Scoring & Feedback Collection`

### Message Types

#### 6.1 Speaker PCR Request
- **Trigger**: Immediately after speaker session ends
- **Data Required**: Speaker name, session topic
- **Response Expected**: Number (1-10) + optional text feedback
- **GHL Integration**: PCR request webhook
- **Backend Reference**: PCR Scoring service
- **Priority**: CRITICAL (Phase 4 feature)

**Example Message**:
```
Hey John! 🎤

Brian's session on "Scaling Operations" just wrapped.

How would you rate it? (1-10)

Reply with a number and any quick thoughts!
```

---

#### 6.2 Sponsor PCR Request
- **Trigger**: After booth visit OR demo booking
- **Data Required**: Sponsor name, booth number
- **Response Expected**: Number (1-10) + optional text feedback
- **GHL Integration**: PCR request webhook
- **Backend Reference**: PCR Scoring service
- **Priority**: HIGH

**Example Message**:
```
Hi Sarah! 💼

How was your conversation with Destination Motivation at Booth 12? (1-10)

Your feedback helps us connect you with the right partners!
```

---

#### 6.3 Session PCR Request
- **Trigger**: After specific breakout sessions
- **Data Required**: Session name
- **Response Expected**: Number (1-10) + optional text feedback
- **GHL Integration**: PCR request webhook
- **Backend Reference**: PCR Scoring service
- **Priority**: MEDIUM

**Example Message**:
```
Rate the "Tech Stack Optimization" session (1-10)

Quick feedback helps us improve future events!
```

---

#### 6.4 Peer Match PCR Request
- **Trigger**: After peer connection made
- **Data Required**: Peer name
- **Response Expected**: Number (1-10) + optional text feedback
- **GHL Integration**: PCR request webhook
- **Backend Reference**: PCR Scoring service
- **Priority**: HIGH (Phase 5 integration)

**Example Message**:
```
How valuable was your connection with Sarah Johnson? (1-10)

Your feedback improves our peer matching!
```

---

#### 6.5 Overall Event PCR
- **Trigger**: End of event OR next morning
- **Data Required**: Event name
- **Response Expected**: Number (1-10) + optional text feedback
- **GHL Integration**: PCR request webhook
- **Backend Reference**: PCR Scoring service
- **Priority**: HIGH

**Example Message**:
```
Overall, how would you rate your experience at Operation Lead Surge 2025? (1-10)

We value your honest feedback!
```

---

#### 6.6 PCR Thank You + Follow-Up
- **Trigger**: After contractor responds with rating
- **Data Required**:
  - Contractor's rating
  - Entity rated (speaker/sponsor/session/peer/event)
  - Dynamic follow-up based on score
- **Response Expected**: Optional further engagement
- **GHL Integration**: Thank you webhook with conditional logic
- **Backend Reference**: PCR Scoring service - response handler
- **Priority**: HIGH

**Example Messages** (conditional based on score):

**Score 8-10 (High)**:
```
Thanks for the feedback! 🎯

Glad you loved Brian's session! Want me to connect you with him for a follow-up conversation?

Reply YES or NO
```

**Score 5-7 (Medium)**:
```
Thanks for the honest feedback.

Here's another session you might like:
"Sales Team Building" - Tomorrow 2pm, Hall B

See you there!
```

**Score 1-4 (Low)**:
```
We hear you.

Let me recommend something more relevant to your focus areas.

Checking our schedule now...
```

---

## 🗂️ CATEGORY 7: CEO OVERRIDE & ADMIN CONTROLS

**Purpose**: Manual timing adjustments, custom messages

**n8n Workflow Name Suggestion**: `Admin Controls & Custom Messaging`

### Message Types

#### 7.1 CEO Delay Override
- **Trigger**: Admin manually delays all pending messages
- **Data Required**: Delay duration (minutes), reason, event_id
- **Response Expected**: None (admin action)
- **GHL Integration**: N/A (backend only - updates scheduled times)
- **Backend Reference**: `eventMessagingController.js` - lines 125-167 (applyDelayOverride)
- **Priority**: CRITICAL (CEO feature)

**Note**: This is NOT an SMS message sent to contractors. It's an admin action that updates the `scheduled_time` field in the database for all pending messages.

**Backend Behavior**:
```javascript
// All pending messages get delayed by X minutes
UPDATE event_messages
SET scheduled_time = scheduled_time + INTERVAL 'X minutes'
WHERE event_id = Y AND status = 'pending'
```

---

#### 7.2 Custom Admin Message
- **Trigger**: Admin sends custom message to specific contractor or group
- **Data Required**:
  - Custom text (admin-written)
  - Target: single contractor OR group filter
  - Send time (immediate or scheduled)
- **Response Expected**: Optional based on message content
- **GHL Integration**: Custom message webhook
- **Backend Reference**: Admin messaging endpoint
- **Priority**: MEDIUM

**Example Use Case**:
Admin sends emergency message to all attendees:
```
VENUE CHANGE ALERT 🚨

Tomorrow's sessions moved to:
Ballroom C (was Hall A)

Updated agenda: [link]

- The Power100 Team
```

---

## 🗂️ CATEGORY 8: POST-EVENT WRAP-UP

**Purpose**: Event summary, follow-ups, next steps

**n8n Workflow Name Suggestion**: `Post-Event Follow-Up & Engagement`

### Message Types

#### 8.1 Event Summary Delivery
- **Trigger**: Day after event (morning, 9am local time)
- **Data Required**:
  - Personal highlights
  - Connections made (peer matches)
  - Demos booked
  - Overall PCR score
  - Top sessions attended
- **Response Expected**: None
- **GHL Integration**: Summary webhook
- **Backend Reference**: Post-event analytics aggregation
- **Priority**: HIGH

**Example Message**:
```
Your Operation Lead Surge wrap-up! 📊

🎤 Sessions Attended: 5
⭐ Your Average Rating: 8.7/10
🤝 Peer Connections: 2 (Sarah, Mike)
💼 Demos Booked: 1 (Destination Motivation)

Top Highlight: "Scaling Operations" by Brian Smith (your rating: 10/10)

Full summary: [link]

See you at the next one! 🚀
```

---

#### 8.2 Demo Follow-Up Reminder
- **Trigger**: 3 days before booked demo
- **Data Required**:
  - Sponsor name
  - Demo date/time
  - Preparation tips
  - Demo confirmation link
- **Response Expected**: None
- **GHL Integration**: Reminder webhook
- **Backend Reference**: Demo booking calendar integration
- **Priority**: HIGH

**Example Message**:
```
Reminder: Demo in 3 days! 📅

Destination Motivation
October 22, 2025 @ 2:00 PM

Prep Tips:
✅ Review your hiring challenges
✅ Have team size/goals ready
✅ Prepare 3-5 questions

Reschedule if needed: [link]
```

---

#### 8.3 Peer Connection Check-In
- **Trigger**: 1 week after event
- **Data Required**:
  - Peer contacts from event
  - Connection names/companies
- **Response Expected**: Optional status update
- **GHL Integration**: Follow-up webhook
- **Backend Reference**: Peer match tracking
- **Priority**: MEDIUM

**Example Message**:
```
Hey John! 👋

Have you followed up with your Power100 peer connections?

Sarah Johnson (ABC Contractors)
Mike Davis (XYZ Services)

These relationships are gold - don't let them go cold! 💎

Need their contact info again? Reply YES
```

---

#### 8.4 Next Event Invitation
- **Trigger**: 2 weeks after event OR when next event announced
- **Data Required**:
  - Next event name, date, location
  - Early bird discount (if available)
  - What's new/different
- **Response Expected**: Optional interest confirmation
- **GHL Integration**: Event invitation webhook
- **Backend Reference**: Events calendar
- **Priority**: MEDIUM

**Example Message**:
```
Miss us already? 😎

Operation Lead Surge: WINTER EDITION
January 20-22, 2026
Denver, CO

Early Bird: $200 off (expires Nov 1)

New this year:
🎤 10 new speakers
🤝 Enhanced peer matching
💼 More sponsor demos

Reserve your spot: [link]
```

---

#### 8.5 Content Recommendation Based on Event
- **Trigger**: 3 days after event
- **Data Required**:
  - Sessions attended
  - Topics of interest (from PCR feedback)
  - Related books/podcasts/resources
- **Response Expected**: Optional engagement
- **GHL Integration**: Recommendation webhook
- **Backend Reference**: AI Concierge recommendation engine
- **Priority**: MEDIUM (AI-powered)

**Example Message**:
```
Loved Brian's session on operations? 📚

Here are 3 resources to dive deeper:

1. 🎧 Podcast: "Wealthy Contractor Ep 247"
   Topic: Scaling operations (15 min)

2. 📖 Book: "Beyond the Hammer" Ch. 4
   Systemizing for growth

3. 🤝 Partner: ServiceTitan demo
   Operations automation tools

Reply 1, 2, or 3 to learn more!
```

---

#### 8.6 Annual Event Recap (End of Year)
- **Trigger**: December (end of year)
- **Data Required**:
  - All events attended in the year
  - Total connections made
  - Total demos booked
  - Favorite speakers (based on PCR)
  - Year-over-year growth
- **Response Expected**: None
- **GHL Integration**: Annual summary webhook
- **Backend Reference**: Full-year analytics
- **Priority**: LOW

**Example Message**:
```
Your 2025 Power100 Year in Review! 🎊

📅 Events Attended: 3
🎤 Sessions: 18
⭐ Avg Rating: 8.4/10
🤝 Connections: 7 peers
💼 Demos: 3 partners

Top Speaker: Brian Smith (9.2/10 across 3 events)

Thanks for being part of our community!

2026 event calendar: [link]
```

---

## 📋 Implementation Priority Matrix

| # | Category | Priority Level | Complexity | AI Required | Status | Workflow ID |
|---|----------|---------------|------------|-------------|--------|-------------|
| **0** | **SMS Router (Infrastructure)** | CRITICAL | High | No | ✅ COMPLETE | Xx8OJ6zQclCZayX8 |
| **1** | **Registration & Onboarding** | HIGH | Medium | Yes (Agenda) | ⏳ PENDING | TBD |
| **2** | **Check-In & Welcome** | CRITICAL | Low | No | ✅ COMPLETE | Check-In Workflow |
| **3** | **Speaker Alerts** | CRITICAL | Medium | No | ✅ COMPLETE | Speaker Alerts |
| **4** | **Sponsor Recommendations** | CRITICAL | High | Yes | ✅ COMPLETE | Sponsor Rec + auUATKX6Ht4OK2s9 |
| **5** | **Peer Matching** | CRITICAL | High | No | ✅ COMPLETE | Peer Matching |
| **6** | **PCR Scoring** | CRITICAL | High | Yes | ✅ COMPLETE | hTyeWDSEEsal59Ad |
| **7** | **Admin Controls** | CRITICAL | Medium | No | ⏳ PENDING | TBD |
| **8** | **Post-Event** | MEDIUM | Medium | Yes (8.5) | ⏳ PENDING | TBD |

**Total n8n Workflows Needed**: 9 workflows (1 router + 8 categories)
**Completed**: 7 of 9 (78%)
**Response Workflows**: 100% complete (Sponsor, PCR, Peer all operational with Router)

---

## 🔗 Backend Integration Reference

### Controllers & Services

| Category | Backend File | Lines | Methods |
|----------|-------------|-------|---------|
| Registration & Onboarding | `eventMessagingController.js` | 11-55 | scheduleMessage |
| Check-In & Welcome | `eventCheckInController.js`, `eventMessagingController.js` | 57-123 | massScheduleMessages |
| Speaker Alerts | Speaker alert service | TBD | Automated cron |
| Sponsor Recommendations | Event AI service | TBD | AI recommendation engine |
| Peer Matching | `peerMatchingService.js` | 559-666 | 4 SMS generation methods |
| PCR Scoring | PCR service | Documented | Request, response, thank you |
| Admin Controls | `eventMessagingController.js` | 125-167 | applyDelayOverride |
| Post-Event | Analytics service | TBD | Aggregation, summary |

---

## 🎯 Next Steps for n8n Workflow Development

1. **Review Existing n8n Pattern**: Use "TPX SMS Verification - 1" as template
2. **Determine Architecture**: Individual workflows per category OR combined workflows
3. **Build Workflows Sequentially** by priority:
   - Category 2 (Check-In) - CRITICAL, Low complexity
   - Category 3 (Speaker Alerts) - CRITICAL, Medium complexity
   - Category 5 (Peer Matching) - CRITICAL, High complexity
   - Category 6 (PCR Scoring) - CRITICAL, High complexity, AI required
   - Category 4 (Sponsor Recommendations) - CRITICAL, High complexity, AI required
   - Category 1 (Registration) - HIGH, Medium complexity
   - Category 7 (Admin Controls) - CRITICAL, Medium complexity
   - Category 8 (Post-Event) - MEDIUM, Medium complexity

4. **Test Each Workflow**: End-to-end with GHL before moving to next
5. **Document Webhook URLs**: Track all webhook URLs for backend integration
6. **Update Backend**: Replace TODO comments with actual n8n webhook URLs

---

## 📖 Related Documentation

- [PCR Scoring System](./pcr-scoring-system.md)
- [Peer Matching System](./peer-matching-system.md)
- [Event Orchestrator Overview](../../AI-FIRST-STRATEGY.md#event-experience-orchestrator)
- [N8N Workflow Format Requirements](../../N8N-WORKFLOW-FORMAT-REQUIREMENTS.md)

---

**Document Version**: 1.0
**Last Updated**: September 27, 2025
**Status**: Complete - Ready for n8n Implementation
**Maintainer**: The Power100 Experience Development Team