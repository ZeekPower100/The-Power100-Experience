# Event Check-In System: A Day at the Power100 Winter Summit

## The Story of Sarah's Event Experience

### 8:00 AM - Registration Opens
Sarah Martinez, owner of Martinez Construction (a Power100 contractor), arrives at the Miami Convention Center for the Power100 Winter Summit. She received her registration confirmation email last week.

**[Component: event_attendees table]**
- Sarah's registration was already stored when she signed up online
- Her `contractor_id: 142` links to her existing TPX profile
- `registration_date: 2025-02-01` (two weeks ago)
- `profile_completion_status: 'pending'`

### 8:15 AM - QR Code Check-In
Sarah approaches the registration desk and shows her email with the QR code to the staff member, who scans it with an iPad.

**[Component: eventCheckInController.checkInAttendee()]**
```
POST /api/event-check-in/check-in
{
  "event_id": 33,
  "qr_code_data": "95ac5b1f1c13e3fc",
  "check_in_method": "qr_code"
}
```

The system instantly:
1. **[Database Update]** Updates `event_attendees` table:
   - `check_in_time: 2025-02-15 08:15:23`
   - `check_in_method: 'qr_code'`

2. **[Contractor Lookup]** Queries `contractors` table for Sarah's details:
   - Retrieves her name, company, and phone number

3. **[n8n Webhook Trigger]** Calls `triggerCheckInSMS()`:
   ```
   POST https://n8n.srv918843.hstgr.cloud/webhook/event-check-in-sms
   {
     "event_type": "check_in",
     "attendee": {
       "contractor_id": 142,
       "check_in_time": "2025-02-15T08:15:23Z",
       "real_phone": null  // Not captured yet
     },
     "contractor": {
       "name": "Sarah Martinez",
       "company_name": "Martinez Construction",
       "phone": "305-555-7890"
     },
     "message_template": "Welcome {{name}} from {{company_name}}! 🎉"
   }
   ```

### 8:16 AM - Welcome SMS Received
Sarah's phone buzzes with a text message.

**[Component: n8n → GHL → SMS]**
- n8n workflow receives the webhook
- Passes to GHL for SMS delivery
- GHL sends personalized message:
  > "Welcome Sarah Martinez from Martinez Construction! 🎉 You're checked in. Reply 'SAVE' to save our number, then we'll send your personalized event experience link."

### 8:17 AM - Profile Completion Kiosk
Sarah is directed to a profile completion kiosk where she can provide her real contact info and preferences.

**[Component: eventCheckInController.completeProfile()]**
```
POST /api/event-check-in/complete-profile
{
  "event_id": 33,
  "contractor_id": 142,
  "real_email": "sarah@martinezbuilds.com",  // Her actual business email
  "real_phone": "305-555-0001",  // Her personal cell for today
  "custom_responses": {
    "interested_in": "AI automation tools",
    "biggest_challenge": "Project management at scale",
    "dietary": "gluten-free",
    "sessions_interested": ["AI in Construction", "Scaling Operations"]
  },
  "sms_opt_in": true
}
```

**[Database Update: event_attendees]**
- `profile_completion_status: 'complete'`
- `profile_completion_time: 2025-02-15 08:17:45`
- `real_phone: '305-555-0001'` (for today's communications)
- `sms_opt_in: true`

### 8:20 AM - Personalized Schedule SMS
Based on her interests, Sarah receives her personalized agenda.

**[Component: eventMessagingController.scheduleMessage()]**
```
POST /api/event-messaging/schedule
{
  "event_id": 33,
  "contractor_id": 142,
  "message_type": "personalized_agenda",
  "message_content": "Sarah, based on your interests in AI automation:\n⭐ 9:00 AM - 'AI in Construction' (Room A)\n⭐ 11:00 AM - Meet Partner: BuildTech AI (Booth 12)\n⭐ 2:00 PM - 'Scaling Operations' (Main Stage)",
  "scheduled_send_time": "2025-02-15T08:20:00Z"
}
```

**[Database Insert: event_messages]**
- New message record created with personalization data
- `status: 'pending'` → `status: 'sent'`

### 9:00 AM - Keynote Begins (But Running Late!)
The opening keynote is running 15 minutes behind. Greg Salafia (CEO) needs to delay all scheduled messages.

**[Component: eventMessagingController.applyDelayOverride()]**
```
POST /api/event-messaging/delay-override
{
  "event_id": 33,
  "delay_minutes": 15,
  "reason": "Keynote running late - AV issues resolved"
}
```

**[Database Update: event_messages]**
- All `pending` messages get `scheduled_send_time` pushed by 15 minutes
- CEO override logged for audit trail

### 9:45 AM - Smart Speaker Alert
The system knows Sarah is interested in "AI in Construction" starting at 10:00 AM (adjusted from 9:45).

**[Component: Scheduled Message Trigger]**
```
{
  "message_type": "speaker_alert",
  "message_content": "⏰ Reminder: 'AI in Construction' starts in 15 minutes in Room A. Speaker: Jennifer Chen, CTO of BuildTech AI. Don't miss this!"
}
```

Sarah texts back: "On my way! Excited for this one 10/10"

**[Component: n8nEventWebhookController.receiveInboundSMS()]**
```
POST /api/n8n/webhook/inbound-sms
{
  "phone": "305-555-0001",
  "message": "On my way! Excited for this one 10/10",
  "contractor_id": 142,
  "event_id": 33
}
```

**[Sentiment Analysis & PCR Capture]**
- `sentiment_score: 0.9` (very positive - "Excited")
- `pcr_score: 100` (extracted "10/10")
- `action_taken: 'confirmed_attendance'`

### 11:00 AM - AI-Powered Peer Introduction
The system identifies another contractor with similar challenges but in a different market.

**[Component: Peer Matching Algorithm]**
- Queries `event_peer_matches` table
- Finds match: Tom Wilson from Wilson Plumbing (Chicago)
- Both struggling with "project management at scale"
- Different markets (Miami vs Chicago) = no competition

**[SMS to Both]**
> "🤝 Networking Match! Sarah Martinez (Miami) meet Tom Wilson (Chicago). You both face similar scaling challenges. Tom is at Table 6 in the networking lounge."

**[Database Update: event_peer_matches]**
- `introduction_sent: true`
- `match_score: 0.92`
- `match_reasons: {"shared_challenge": "scaling", "compatible_markets": true}`

### 12:30 PM - Sponsor Demo Booking
Sarah visits BuildTech AI's booth (#12) based on her morning session interest.

**[Component: event_sponsors + Demo Booking]**
- Sponsor scans Sarah's QR code
- System logs interaction in `event_sponsors.contact_captured`
- Triggers partner booking flow

**[Automatic SMS Follow-up]**
> "Great meeting you at Booth 12! Your BuildTech AI demo is scheduled for Tuesday 2/20 at 2 PM. We'll send a calendar invite to sarah@martinezbuilds.com"

### 2:00 PM - Mass Check-In for Afternoon Keynote
Greg wants everyone checked into the afternoon session for an important announcement.

**[Component: eventCheckInController.massCheckIn()]**
```
POST /api/event-check-in/mass-check-in
{
  "event_id": 33
}
```

This triggers:
1. **[Database Update]** All attendees not in the session marked as checked in
2. **[Mass SMS via n8n]**
   ```
   POST https://n8n.srv918843.hstgr.cloud/webhook/event-mass-sms
   {
     "event_type": "mass_send",
     "message_template": "🎯 Important announcement starting now in Main Hall!",
     "recipients": [/* all 247 attendees */]
   }
   ```

### 3:30 PM - Real-Time Feedback Request
After the big announcement about the new AI Concierge, a feedback SMS goes out.

Sarah replies: "This AI concierge will save me 10 hours a week! Can't wait. PCR 9/10"

**[Component: Response Processing]**
- `sentiment_score: 0.95` (extremely positive)
- `pcr_score: 90` (9/10 converted)
- `action_taken: 'strong_interest'`
- AI Concierge tags Sarah for early access beta

### 5:00 PM - Event Wrap-Up
As Sarah leaves, she receives a final SMS.

**[Component: Scheduled Wrap-up Message]**
> "Thank you for joining us today, Sarah! Your AI Concierge early access starts Monday. You connected with 3 partners and 2 peer matches. Check your email for session recordings and follow-up materials. Safe travels! 🚗"

**[Database Final Stats for Sarah]**
- `event_messages`: 8 sent, 3 responses
- `sentiment_score` average: 0.88 (very positive)
- `pcr_score` average: 95
- Partners engaged: 3
- Peer connections: 2
- Sessions attended: 4

---

## System Performance Metrics for the Day

### Overall Event Statistics
**[Component: Analytics Dashboard]**

```sql
-- Total Check-ins
SELECT COUNT(*) FROM event_attendees
WHERE event_id = 33 AND check_in_time IS NOT NULL;
-- Result: 247 attendees

-- SMS Engagement
SELECT
  COUNT(*) as total_sent,
  SUM(CASE WHEN response_received IS NOT NULL THEN 1 ELSE 0 END) as responses,
  AVG(sentiment_score) as avg_sentiment,
  AVG(pcr_score) as avg_pcr
FROM event_messages WHERE event_id = 33;
-- Results: 1,482 sent, 743 responses (50.1% rate), 0.76 sentiment, 82 PCR

-- Partner Interactions
SELECT
  partner_id,
  COUNT(*) as contacts_captured,
  COUNT(CASE WHEN follow_up_scheduled > 0 THEN 1 END) as demos_booked
FROM event_sponsors
WHERE event_id = 33
GROUP BY partner_id;
-- Result: 156 contacts, 89 demos scheduled

-- Peer Matching Success
SELECT
  COUNT(*) as matches_made,
  AVG(feedback_score) as match_quality
FROM event_peer_matches
WHERE event_id = 33 AND connection_made = true;
-- Result: 123 connections, 8.4/10 quality score
```

### Technical Infrastructure Performance
**[Component: System Monitoring]**

- **Check-in Processing**: Average 1.2 seconds from scan to SMS
- **n8n Webhook Success Rate**: 99.7% (3 retries needed)
- **GHL SMS Delivery**: 98.9% delivery rate
- **Database Performance**: All queries < 100ms
- **CEO Override Used**: 2 times (15 min + 5 min delays)

---

## Key Takeaways

This scenario demonstrates how every component works together:

1. **Seamless Check-in**: QR codes → Database → n8n → GHL → SMS in seconds
2. **Real-time Adaptability**: CEO overrides keep event flowing smoothly
3. **Personalization at Scale**: 247 attendees, each getting relevant content
4. **Bi-directional Communication**: Not just sending, but processing responses
5. **Intelligence Layer**: Sentiment analysis, PCR scoring, action detection
6. **Partner Integration**: Direct booking flow from event interaction
7. **Peer Networking**: AI matching based on compatible profiles
8. **Data-Driven Insights**: Every interaction tracked for future improvement

The entire system orchestrates a personalized experience for each attendee while giving organizers real-time control and comprehensive analytics. Sarah left with 3 partner meetings scheduled, 2 new peer connections, and early access to the AI Concierge - all facilitated seamlessly by the check-in system.