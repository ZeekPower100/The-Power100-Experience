# Event Email Architecture - GHL + n8n Integration Strategy
*How TPX Event Orchestrator uses GHL for email delivery while maintaining backend intelligence*

---

## 🎯 Architecture Overview - Matching SMS Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     TPX BACKEND (Brain)                          │
│  - Event Logic & Email Orchestration                            │
│  - AI Personalization & Content Generation                      │
│  - Email Queue Management (event_messages table)                │
│  - Inbound Email Parsing & Routing                              │
│  - Template Selection & Context Building                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Simple Webhook (2 nodes each)
┌─────────────────────────────────────────────────────────────────┐
│              N8N (Simple Email Transport)                        │
│  Workflow 1: GHL Inbound Email → Backend /api/email/inbound    │
│  Workflow 2: Backend → GHL Outbound Email                       │
│  - NO LOGIC, just pass-through                                  │
│  - Dev: /webhook/email-*-dev | Prod: /webhook/email-*          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Email via SMTP
┌─────────────────────────────────────────────────────────────────┐
│                    GHL (Delivery Only)                           │
│  - Email Infrastructure (SMTP)                                   │
│  - Contact Database Sync                                         │
│  - Delivery Tracking                                             │
│  - Inbound Email Webhooks                                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Email
┌─────────────────────────────────────────────────────────────────┐
│                  CONTRACTOR EMAIL                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓ Reply
┌─────────────────────────────────────────────────────────────────┐
│         BACKEND HANDLES ALL PROCESSING                           │
│  - Parse email replies (extract body, strip signatures)          │
│  - Route to AI Concierge for conversational responses            │
│  - Track engagement (opens, clicks, replies)                     │
│  - Context-aware follow-ups                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📧 Event Orchestrator Email Touchpoints (10 Total)

### **Pre-Event (4 Emails)**

#### 1. Registration Confirmation
**Trigger:** Immediate upon event registration
**Template:** `registration_confirmation`
**Personalization:**
- Contractor name
- Event name, date, location
- Registration confirmation number
- Link to event portal

**Example:**
```
Subject: You're registered for Power100 Summit 2025! 🎉

Hi {first_name},

Welcome to Power100 Summit 2025!

Event Details:
📅 Date: {event_date}
📍 Location: {event_location}
🎫 Confirmation: {registration_id}

Next Steps:
1. Complete your profile for a personalized agenda
2. Review our speaker lineup
3. Mark your calendar

See you there!
Power100 Team
```

#### 2. Profile Completion Reminder
**Trigger:** 24 hours after registration if profile incomplete
**Template:** `profile_completion_reminder`
**Personalization:**
- Progress indicator (% complete)
- Missing fields list
- Benefits of completion

**Example:**
```
Subject: {first_name}, unlock your personalized Power100 experience

Hi {first_name},

You're 60% done! Complete your profile to unlock:

✅ Custom agenda based on YOUR goals
✅ Top 3 speaker recommendations with WHY
✅ Pre-matched sponsor booth visits
✅ AI concierge access during the event

Complete now → [Link]

Only takes 2 minutes!
```

#### 3. Personalized Agenda Delivery
**Trigger:** Immediately after profile completion
**Template:** `personalized_agenda`
**Personalization:**
- Custom agenda based on focus areas
- Top 3 speakers with AI-generated WHY
- Top 3 sponsors with booth numbers and talking points
- Downloadable PDF agenda

**Example:**
```
Subject: Your personalized Power100 Summit agenda is ready!

Hi {first_name},

Based on your focus on {focus_area_1}, {focus_area_2}, we've built your custom agenda:

🎤 TOP 3 SPEAKERS FOR YOU:
1. {speaker_1} - {session_title}
   WHY: {ai_generated_reason}
   📅 {session_time}

2. {speaker_2} - {session_title}
   WHY: {ai_generated_reason}
   📅 {session_time}

3. {speaker_3} - {session_title}
   WHY: {ai_generated_reason}
   📅 {session_time}

🤝 TOP 3 SPONSORS TO VISIT:
1. {sponsor_1} - Booth #{booth_number}
   Contact: {rep_name}, {rep_title}
   Talking Point: "{ai_talking_point}"

2. {sponsor_2} - Booth #{booth_number}
   Contact: {rep_name}, {rep_title}
   Talking Point: "{ai_talking_point}"

3. {sponsor_3} - Booth #{booth_number}
   Contact: {rep_name}, {rep_title}
   Talking Point: "{ai_talking_point}"

📥 Download Full Agenda → [PDF Link]

See you at the event!
```

#### 4. Pre-Event Prep Email
**Trigger:** 24 hours before event start
**Template:** `pre_event_prep`
**Personalization:**
- Event logistics
- What to bring
- QR code for check-in
- Parking instructions

---

### **During-Event (2 Emails)**

#### 5. Check-In Confirmation
**Trigger:** Upon QR code scan at check-in
**Template:** `check_in_confirmation`
**Personalization:**
- Welcome message
- Link to digital agenda
- AI Concierge SMS number
- First session reminder

#### 6. Session Handout/Resources
**Trigger:** After attending a session (optional, speaker-dependent)
**Template:** `session_resources`
**Personalization:**
- Speaker name and session title
- Slide deck download
- Additional resources mentioned
- Related content recommendations

---

### **Post-Event (4 Emails)**

#### 7. Event Summary Email
**Trigger:** 4 hours after event ends
**Template:** `event_summary`
**Personalization:**
- Sessions attended (with titles and speakers)
- PCR scores given (speakers, sponsors, peers)
- Notes captured during event
- Top connections made
- Overall event rating

**Example:**
```
Subject: Your Power100 Summit 2025 Experience Summary

Hi {first_name},

What an incredible event! Here's your personalized summary:

📊 YOUR EVENT STATS:
- {session_count} sessions attended
- {speaker_count} speakers rated
- {sponsor_count} sponsors visited
- {peer_count} connections made

🎤 SESSIONS YOU ATTENDED:
1. {session_1} by {speaker_1} - Rated {pcr_score}/5
2. {session_2} by {speaker_2} - Rated {pcr_score}/5

🤝 YOUR TOP CONNECTIONS:
- {peer_1} ({company_1}) - Rated {pcr_score}/5
- {peer_2} ({company_2}) - Rated {pcr_score}/5

📝 YOUR NOTES:
{captured_notes_summary}

🎯 RECOMMENDED NEXT STEPS:
Based on your ratings and interests:
- Book demo with {sponsor_1}
- Connect with {peer_1} about {topic}
- Read: {book_recommendation}
- Listen: {podcast_recommendation}

Thanks for making Power100 Summit amazing!
```

#### 8. Demo Booking Reminders
**Trigger:** Multiple (confirmation, 24hr reminder, post-demo)
**Template:** `demo_booking_*`
**Personalization:**
- Sponsor/partner name
- Demo date/time
- Meeting link
- Calendar invite (.ics attachment)

#### 9. Peer Connection Exchange
**Trigger:** Post-event for matched peers
**Template:** `peer_connection_exchange`
**Personalization:**
- Peer name, company, contact info
- Where they met (session, break, booth)
- Mutual interests/focus areas
- Suggested collaboration topics

#### 10. Content Recommendations
**Trigger:** 48 hours post-event
**Template:** `content_recommendations`
**Personalization:**
- Books based on sessions attended
- Podcasts based on expressed interests
- Partners for ongoing support
- Next event recommendations

---

## 🛠️ Backend API Endpoints (Matching SMS Pattern)

### **Outbound Email Endpoint**
```javascript
POST /api/email/send
{
  "contractor_id": 123,
  "event_id": 45,
  "email_type": "personalized_agenda",
  "personalization_data": {
    "speakers": [...],
    "sponsors": [...],
    "agenda_pdf_url": "..."
  }
}
```

**Backend Process:**
1. Load contractor data from database
2. Select email template based on `email_type`
3. Generate personalized content (AI if needed)
4. Save to `event_messages` table
5. Call n8n webhook → GHL → Send email
6. Track delivery status

### **Inbound Email Endpoint**
```javascript
POST /api/email/inbound
{
  "from": "contractor@email.com",
  "to": "concierge@power100.io",
  "subject": "Re: Your personalized agenda",
  "body": "This is great! Can I change my session choices?",
  "ghl_contact_id": "abc123",
  "message_id": "msg_xyz"
}
```

**Backend Process:**
1. Identify contractor by email
2. Parse email body (strip signatures, quoted text)
3. Route to AI Concierge for conversational response
4. Generate reply email
5. Save to `event_messages` table
6. Call n8n webhook → GHL → Send reply

---

## 📊 Database Integration

### **event_messages Table (Existing)**
Used for BOTH SMS and Email tracking:

```sql
-- Email-specific fields (already exist):
- direction: 'inbound' | 'outbound'
- message_type: 'registration_confirmation', 'personalized_agenda', etc.
- message_content: Full email HTML
- personalization_data: JSONB with template variables
- actual_send_time: When email was sent
- response_received: Reply email body
- response_time: When reply received
- ghl_contact_id: GHL contact reference
```

**No new tables needed!** Email uses same infrastructure as SMS.

---

## 🔧 GHL Email Configuration

### **Required GHL Setup:**

1. **Custom Email Domain**
   - Domain: `power100.io`
   - From address: `concierge@power100.io`
   - Reply-to: `concierge@power100.io`

2. **Inbound Email Webhook**
   - Configure GHL to forward inbound emails to n8n webhook
   - n8n routes to TPX backend `/api/email/inbound`

3. **Email Templates in GHL** (Optional - we generate in backend)
   - Basic wrapper template with Power100 branding
   - Backend generates content, GHL just delivers

4. **Contact Custom Fields** (Same as SMS)
   - event_id
   - contractor_id
   - focus_areas (JSON)
   - registration_status

---

## 🚀 Implementation Plan (Matching SMS)

### **Phase 1: Backend Email Service** (1-2 hours)
1. Create `/api/email/send` endpoint
2. Create `/api/email/inbound` endpoint
3. Email template system (HTML generation)
4. GHL webhook caller (reuse SMS pattern)

### **Phase 2: n8n Workflows** (30 minutes)
1. **Outbound Email Workflow:**
   - Webhook trigger from backend
   - Call GHL Email API
   - Return delivery status to backend

2. **Inbound Email Workflow:**
   - GHL inbound email webhook
   - Parse email body
   - Forward to backend `/api/email/inbound`

### **Phase 3: Event Orchestrator Integration** (1 hour)
1. Add email triggers to registration flow
2. Add email triggers to profile completion
3. Add email triggers to post-event summary
4. Add email triggers to demo bookings

### **Phase 4: Testing** (30 minutes)
1. Test registration confirmation email
2. Test inbound email reply routing to AI Concierge
3. Test personalized agenda generation
4. Test event summary email

---

## 🎯 Key Design Principles

### **Same as SMS:**
✅ Backend has ALL the intelligence
✅ n8n is ONLY a transport layer (2 simple workflows)
✅ GHL is ONLY delivery infrastructure
✅ All emails saved to `event_messages` table
✅ AI Concierge handles inbound email replies

### **Email-Specific:**
✅ HTML email templates with Power100 branding
✅ Attachment support (PDFs, calendar invites)
✅ Link tracking (opens, clicks)
✅ Signature stripping for inbound replies
✅ Multi-email conversations (threading)

---

## 📝 Email vs SMS Decision Matrix

| Use Case | Channel | Why |
|----------|---------|-----|
| Registration confirmation | Email + SMS | Email for details, SMS for immediate notification |
| Profile reminder | Email | Longer message, links to forms |
| Personalized agenda | Email | Rich formatting, PDF attachment |
| Pre-event prep | Email | Logistics, QR code, parking map |
| Check-in confirmation | SMS | Immediate, on-site |
| Speaker alerts | SMS | Real-time, during event |
| Sponsor recommendations | SMS | Real-time, during event |
| PCR requests | SMS | Quick 1-5 rating, conversational |
| Event summary | Email | Comprehensive, rich data, links |
| Demo reminders | Email + SMS | Email for details, SMS for 24hr reminder |
| Peer connections | Email | Full contact exchange, professional |
| Content recommendations | Email | Rich content, multiple links |

**Principle:** SMS for real-time, short, conversational. Email for comprehensive, rich, reference material.

---

## ✅ Success Criteria

- [ ] Registration confirmation email sends within 5 seconds
- [ ] Personalized agenda generates in <30 seconds
- [ ] Inbound email replies route to AI Concierge correctly
- [ ] Event summary email contains all captured data
- [ ] Demo booking emails include calendar invites
- [ ] Email open/click tracking functional
- [ ] All emails saved to `event_messages` table
- [ ] Email + SMS coordination works seamlessly

---

## 🔗 Related Documentation

- `EVENT-SMS-ARCHITECTURE.md` - SMS integration (same pattern)
- `AI-FIRST-STRATEGY.md` - Overall event orchestrator vision
- `BULL-WORKER-DEPLOYMENT.md` - Background job processing

---

*Last Updated: October 8, 2025*
*Status: Ready for Implementation*
