# Event Check-In System Documentation

## Overview
The Power100 Experience Event Check-In System is a comprehensive solution for managing event attendees, from registration through check-in and personalized communication. The system integrates with n8n and Go High Level (GHL) for automated SMS messaging.

## Real-World Scenario: A Day at the Power100 Winter Summit

### The Story of Sarah's Event Experience

#### 8:00 AM - Registration Opens
Sarah Martinez, owner of Martinez Construction (a Power100 contractor), arrives at the Miami Convention Center for the Power100 Winter Summit. She received her registration confirmation email last week.

**[Component: event_attendees table]**
- Sarah's registration was already stored when she signed up online
- Her `contractor_id: 142` links to her existing TPX profile
- `registration_date: 2025-02-01` (two weeks ago)
- `profile_completion_status: 'pending'`

#### 8:15 AM - QR Code Check-In
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

#### 8:16 AM - Welcome SMS Received
Sarah's phone buzzes with a text message.

**[Component: n8n → GHL → SMS]**
- n8n workflow receives the webhook
- Passes to GHL for SMS delivery
- GHL sends personalized message:
  > "Welcome Sarah Martinez from Martinez Construction! 🎉 You're checked in. Reply 'SAVE' to save our number, then we'll send your personalized event experience link."

#### 8:17 AM - Profile Completion Kiosk
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

#### 9:00 AM - Keynote Running Late (CEO Override)
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

#### 11:00 AM - AI-Powered Peer Introduction
The system identifies another contractor with similar challenges but in a different market.

**[Component: Peer Matching Algorithm]**
- Queries `event_peer_matches` table
- Finds match: Tom Wilson from Wilson Plumbing (Chicago)
- Both struggling with "project management at scale"
- Different markets (Miami vs Chicago) = no competition

**[SMS to Both]**
> "🤝 Networking Match! Sarah Martinez (Miami) meet Tom Wilson (Chicago). You both face similar scaling challenges. Tom is at Table 6 in the networking lounge."

#### 2:00 PM - Mass Check-In for Afternoon Keynote
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
2. **[Mass SMS via n8n]** Message sent to all 247 attendees

#### 3:30 PM - Real-Time Feedback Processing
After the announcement, Sarah texts back: "This AI concierge will save me 10 hours a week! Can't wait. PCR 9/10"

**[Component: n8nEventWebhookController.receiveInboundSMS()]**
- `sentiment_score: 0.95` (extremely positive)
- `pcr_score: 90` (9/10 converted)
- `action_taken: 'strong_interest'`

### Event Day Metrics

By end of day, the system has orchestrated:
- **247 check-ins** processed in average 1.2 seconds
- **1,482 SMS messages** sent with 50.1% response rate
- **156 partner contacts** captured with 89 demos scheduled
- **123 peer connections** made with 8.4/10 quality score
- **Average sentiment**: 0.76 (positive)
- **Average PCR score**: 82/100

This real scenario demonstrates how every component works together to create a seamless, personalized experience for each attendee while giving organizers real-time control and comprehensive analytics.

> **📖 Want more details?** See [EVENT-CHECK-IN-SCENARIO.md](./EVENT-CHECK-IN-SCENARIO.md) for the complete story with additional interactions, technical performance metrics, and comprehensive system analytics from Sarah's full day at the summit.

## Architecture

### System Flow
```
TPX Backend → n8n Webhooks → GHL → Attendee Phone
     ↑                           ↓
     └──── Response Processing ←─┘
```

### Environment URLs

#### Production
- **TPX System**: `https://tpx.power100.io`
- **n8n Instance**: `https://n8n.srv918843.hstgr.cloud`
- **Database**: AWS RDS PostgreSQL

#### Local Development
- **TPX System**: `http://localhost:5000`
- **n8n Instance**: `http://localhost:5678` (or ngrok tunnel)
- **Database**: Local PostgreSQL

## Database Tables

### 1. event_attendees
Primary table for tracking event registration and check-in
```sql
- id (SERIAL PRIMARY KEY)
- event_id (INTEGER) - Links to events table
- contractor_id (INTEGER) - Links to contractors table
- registration_date (TIMESTAMP)
- check_in_time (TIMESTAMP)
- check_in_method (VARCHAR) - 'qr_code', 'manual', 'mass_trigger'
- profile_completion_status (VARCHAR) - 'pending', 'complete'
- profile_completion_time (TIMESTAMP)
- sms_opt_in (BOOLEAN)
- real_email (VARCHAR) - Actual contact email (vs database email)
- real_phone (VARCHAR) - Actual phone for SMS (vs database phone)
- pre_filled_data (JSONB) - Dietary restrictions, interests, etc.
- custom_responses (JSONB) - Event-specific survey responses
- qr_code_data (VARCHAR) - Unique QR code for check-in
```

### 2. event_messages
Tracks all SMS messages sent/received for events
```sql
- id (SERIAL PRIMARY KEY)
- event_id (INTEGER)
- contractor_id (INTEGER)
- message_type (VARCHAR) - 'welcome', 'reminder', 'speaker_alert', etc.
- message_category (VARCHAR) - 'automated', 'manual', 'response'
- message_content (TEXT)
- personalization_data (JSONB)
- scheduled_send_time (TIMESTAMP)
- actual_send_time (TIMESTAMP)
- response_received (TEXT)
- response_time (TIMESTAMP)
- sentiment_score (DECIMAL) - AI-analyzed sentiment
- pcr_score (INTEGER) - Power Confidence Rating from response
- action_taken (VARCHAR) - 'demo_booked', 'interest_expressed', etc.
- status (VARCHAR) - 'pending', 'sent', 'failed', 'responded'
- error_message (TEXT)
- can_send (BOOLEAN) - CEO override flag
```

### 3. event_speakers
Speaker profiles and session information
```sql
- id (SERIAL PRIMARY KEY)
- event_id (INTEGER)
- name (VARCHAR)
- title (VARCHAR)
- company (VARCHAR)
- bio (TEXT)
- session_title (VARCHAR)
- session_time (TIMESTAMP)
- session_description (TEXT)
- speaker_photo_url (VARCHAR)
- linkedin_url (VARCHAR)
- expertise_areas (TEXT[])
- speaker_rating (DECIMAL)
```

### 4. event_sponsors
Sponsor and partner information for events
```sql
- id (SERIAL PRIMARY KEY)
- event_id (INTEGER)
- partner_id (INTEGER)
- sponsor_level (VARCHAR) - 'platinum', 'gold', 'silver', 'bronze'
- booth_location (VARCHAR)
- demo_schedule (JSONB)
- special_offers (TEXT)
- contact_captured (INTEGER) - Number of contacts collected
- follow_up_scheduled (INTEGER)
```

### 5. event_peer_matches
AI-generated peer matching for networking
```sql
- id (SERIAL PRIMARY KEY)
- event_id (INTEGER)
- contractor1_id (INTEGER)
- contractor2_id (INTEGER)
- match_score (DECIMAL)
- match_reasons (JSONB)
- introduction_sent (BOOLEAN)
- connection_made (BOOLEAN)
- feedback_score (INTEGER)
```

### 6. event_timeline
Real-time event schedule and updates
```sql
- id (SERIAL PRIMARY KEY)
- event_id (INTEGER)
- scheduled_time (TIMESTAMP)
- actual_time (TIMESTAMP)
- event_type (VARCHAR) - 'keynote', 'break', 'networking', 'demo'
- title (VARCHAR)
- description (TEXT)
- speaker_id (INTEGER)
- delay_minutes (INTEGER) - CEO override delays
- notification_sent (BOOLEAN)
```

## API Endpoints

### Check-In Routes (`/api/event-check-in`)

#### 1. Register Attendee
`POST /api/event-check-in/register`
```json
{
  "event_id": 33,
  "contractor_id": 1,
  "pre_filled_data": {
    "dietary": "vegetarian",
    "interests": ["networking", "ai"]
  }
}
```
**Response**: Attendee object with QR code

#### 2. Check In Attendee
`POST /api/event-check-in/check-in` (Public - no auth required)
```json
{
  "event_id": 33,
  "qr_code_data": "95ac5b1f1c13e3fc",
  "check_in_method": "qr_code"
}
```
**Triggers**: Welcome SMS via n8n/GHL

#### 3. Mass Check-In
`POST /api/event-check-in/mass-check-in` (Admin only)
```json
{
  "event_id": 33
}
```
**Used for**: Stage coordination, checking in all attendees at once

#### 4. Complete Profile
`POST /api/event-check-in/complete-profile`
```json
{
  "event_id": 33,
  "contractor_id": 1,
  "real_email": "actual@email.com",
  "real_phone": "305-555-1234",
  "custom_responses": {
    "interested_in": "Partner demos",
    "biggest_challenge": "Scaling operations"
  },
  "sms_opt_in": true
}
```

#### 5. Get Event Attendees
`GET /api/event-check-in/event/:eventId/attendees`
Query params:
- `checked_in_only=true` - Filter to only checked-in attendees

### Messaging Routes (`/api/event-messaging`)

#### 1. Schedule Message
`POST /api/event-messaging/schedule`
```json
{
  "event_id": 33,
  "contractor_id": 1,
  "message_type": "speaker_alert",
  "message_content": "Your recommended session starts in 15 minutes",
  "scheduled_send_time": "2025-02-15T14:45:00Z"
}
```

#### 2. CEO Delay Override
`POST /api/event-messaging/delay-override`
```json
{
  "event_id": 33,
  "delay_minutes": 15,
  "reason": "Keynote running long"
}
```
**Effect**: Delays all pending messages by specified minutes

## n8n Webhook Integration

### Webhook Endpoints
The system sends data to these n8n webhook endpoints:

#### 1. Check-In SMS
`POST {N8N_BASE}/webhook/event-check-in-sms`
```json
{
  "event_type": "check_in",
  "attendee": {
    "event_id": 33,
    "contractor_id": 1,
    "check_in_time": "2025-02-15T09:00:00Z",
    "real_phone": "305-555-1234",
    "sms_opt_in": true
  },
  "contractor": {
    "name": "John Doe",
    "company_name": "Acme Corp",
    "phone": "305-555-1234"
  },
  "message_template": "Welcome {{name}} from {{company_name}}!",
  "use_phone": "305-555-1234"
}
```

#### 2. Mass SMS
`POST {N8N_BASE}/webhook/event-mass-sms`
```json
{
  "event_type": "mass_send",
  "event_id": 33,
  "message_type": "mass_check_in",
  "message_template": "Welcome to TPX!",
  "recipients": [
    {
      "contractor_id": 1,
      "name": "John Doe",
      "company_name": "Acme Corp",
      "phone": "305-555-1234"
    }
  ]
}
```

#### 3. Scheduled Messages
`POST {N8N_BASE}/webhook/event-scheduled-sms`
```json
{
  "event_type": "scheduled_batch",
  "messages": [
    {
      "message_id": 1,
      "event_id": 33,
      "contractor_id": 1,
      "message_type": "speaker_alert",
      "message_content": "Session starting soon",
      "phone_number": "305-555-1234"
    }
  ]
}
```

### Inbound Webhook (from n8n/GHL)
`POST /api/n8n/webhook/inbound-sms`
```json
{
  "phone": "305-555-1234",
  "message": "Yes, I'm interested in the demo",
  "contractor_id": 1,
  "event_id": 33,
  "timestamp": "2025-02-15T10:30:00Z"
}
```
**Processing**:
- Sentiment analysis
- PCR score extraction
- Action detection
- Update original message record

## Features

### 1. QR Code Check-In
- Unique QR codes generated for each attendee
- Scan via mobile app or kiosk
- Instant check-in with SMS confirmation

### 2. Mass Check-In
- CEO/Admin can check in all attendees at once
- Used for stage coordination
- Triggers mass welcome SMS

### 3. Profile Completion
- Capture real contact info at event
- Custom survey responses
- Unlocks personalized features

### 4. CEO Override System
- Delay all pending messages
- Adjust timeline for schedule changes
- Maintain message flow despite delays

### 5. Smart SMS Integration
- Personalized message templates
- Response tracking and sentiment analysis
- PCR score capture from responses
- Action detection (demo booking, interest)

### 6. Peer Matching (Future)
- AI-powered networking suggestions
- Match contractors with similar roles
- Different markets to avoid competition
- Facilitate introductions via SMS

## Testing

### Local Development Testing
1. Start n8n locally: `cd n8n && npm run start`
2. Start TPX backend: `node dev-manager.js start all`
3. Create test event via API
4. Register test attendees
5. Test check-in flow
6. Verify n8n webhook triggers

### Using ngrok for Local Webhooks
```bash
# Terminal 1: Start ngrok tunnel
ngrok http 5678

# Terminal 2: Update .env.development
N8N_DEV_WEBHOOK_URL=https://your-ngrok-url.ngrok.io

# Terminal 3: Start servers
node dev-manager.js start all
```

### Test Commands
```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@power100.io","password":"admin123"}' \
  | jq -r '.token')

# Register attendee
curl -X POST http://localhost:5000/api/event-check-in/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 33,
    "contractor_id": 1,
    "pre_filled_data": {"dietary": "none"}
  }'

# Check in with QR
curl -X POST http://localhost:5000/api/event-check-in/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 33,
    "qr_code_data": "YOUR_QR_CODE"
  }'
```

## Production Deployment

### Environment Variables
```env
# Production (.env.production)
NODE_ENV=production
N8N_WEBHOOK_URL=https://n8n.srv918843.hstgr.cloud

# Development (.env.development)
NODE_ENV=development
N8N_DEV_WEBHOOK_URL=http://localhost:5678
```

### Database Migration
Both local and production databases must have identical schemas:
```bash
# Apply to production
psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com \
     -U tpeadmin -d tpedb < create-event-tables.sql

# Apply to local
psql -U postgres -d tpedb < create-event-tables.sql
```

## Future Enhancements

### Phase 1 (Current)
✅ Basic check-in system
✅ QR code generation
✅ SMS integration framework
✅ Database schema

### Phase 2 (Next)
- [ ] Mobile check-in app
- [ ] Kiosk mode for iPads
- [ ] Real-time dashboard
- [ ] Badge printing integration

### Phase 3 (Future)
- [ ] AI peer matching algorithm
- [ ] Speaker recommendation engine
- [ ] Real-time schedule updates
- [ ] Post-event follow-up automation

## Troubleshooting

### Common Issues

1. **n8n webhooks not triggering**
   - Check N8N_WEBHOOK_URL in environment
   - Verify n8n instance is running
   - Check webhook path matches n8n workflow

2. **Check-in fails**
   - Verify attendee is registered
   - Check QR code format
   - Ensure not already checked in

3. **SMS not sending**
   - Verify n8n → GHL connection
   - Check SMS opt-in status
   - Verify phone number format

## Support
For issues or questions, check:
- `docs/EVENT-DATABASE-SCHEMA.md` - Database field reference
- `docs/EVENT-SMS-ARCHITECTURE.md` - SMS flow details
- n8n workflows in `n8n-workflows/` directory