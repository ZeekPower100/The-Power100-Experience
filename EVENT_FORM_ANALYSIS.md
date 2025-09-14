# Event Form Analysis - Greg's Vision vs Current Database

## Greg's Required Fields vs Database Status

| Greg's Requirement | Database Field | Status | Notes |
|-------------------|---------------|--------|-------|
| **1. Name of owner and contact information** | organizer_name, organizer_email, organizer_phone, organizer_company | ✅ Exists | All owner fields present |
| **2. Event POC for customer experience** | ❌ Missing | ⚠️ NEED TO ADD | New fields needed: poc_customer_name, poc_customer_email, poc_customer_phone |
| **3. Event POC for media/promotion/social** | ❌ Missing | ⚠️ NEED TO ADD | New fields needed: poc_media_name, poc_media_email, poc_media_phone |
| **4. Location** | location | ✅ Exists | |
| **5. Name of event** | name | ✅ Exists | |
| **6. Date of event** | date | ✅ Exists | |
| **7. Hotel block link** | ❌ Missing | ⚠️ NEED TO ADD | New field needed: hotel_block_url |
| **8. Speaker list with contact information** | speaker_profiles | ⚠️ Partial | Currently TEXT, needs structure for contact info |
| **9. Summary of history and event purpose** | description | ✅ Exists | |
| **10. Target audience (revenue numbers)** | target_revenue | ✅ Exists | Uses same revenue ranges as contractor flow |
| **11. Event specialty (categories)** | focus_areas_covered | ✅ Exists | Uses same categories |
| **12. Agenda** | agenda_highlights | ✅ Exists | |
| **13. Sponsors with contact information** | ❌ Missing | ⚠️ NEED TO ADD | New field needed: sponsors (JSON) |
| **14. Attendee list for pre-registration** | ❌ Missing | ⚠️ NEED TO ADD | New field needed: pre_registered_attendees (JSON) |
| **15. Event URL** | website | ✅ Exists | |

## Additional Valuable Fields Already in Database (Keep These)
- registration_deadline
- registration_url (separate from main website)
- format (Virtual/In-Person/Hybrid)
- event_type
- expected_attendees
- price_range
- duration
- topics
- target_audience (can be repurposed for descriptive text if needed)
- past_attendee_testimonials
- success_metrics
- networking_quality_score
- session_recordings
- follow_up_resources
- post_event_support
- implementation_support

## Fields to Add to Database
1. **poc_customer_name** - VARCHAR(255)
2. **poc_customer_email** - VARCHAR(255)
3. **poc_customer_phone** - VARCHAR(50)
4. **poc_media_name** - VARCHAR(255)
5. **poc_media_email** - VARCHAR(255)
6. **poc_media_phone** - VARCHAR(50)
7. **hotel_block_url** - VARCHAR(500)
8. **sponsors** - TEXT (JSON array with name, contact, email, phone)
9. **pre_registered_attendees** - TEXT (JSON array)

## Important Notes
- **target_revenue** field should use the SAME revenue range options as contractor flow (e.g., "1-5 Million", "5-10 Million", etc.)
- This ensures consistency across all forms when defining business size/audience
- Should implement as multi-select checkbox or similar to allow events to target multiple revenue ranges

## AI Concierge Capabilities to Extract
(For AI-First Strategy Document)

### Pre-Event AI Features
1. **Profile Completion via SMS** - Text attendees to complete profile after registration
2. **Custom Experience Creation** - AI creates personalized event experience based on attendee's focus areas
3. **Speaker Recommendations** - "Top 3 speakers to pay attention to" based on focus areas
4. **Sponsor Matchmaking** - Suggest which sponsors to speak with and provide questions to ask

### During-Event AI Features
1. **Real-time Speaker Alerts** - Text when relevant speakers are about to speak
2. **Contextual Speaker Introductions** - Explain why speaker is relevant to attendee's goals
3. **Interactive Note-Taking** - Attendees can text notes starting with "notes" for later summary
4. **Session Attendance Tracking** - Ask if attendee made it to recommended sessions
5. **Live Engagement Prompts** - Guide attendees to visit specific sponsors during breaks

### Post-Event AI Features
1. **Speaker Rating System** - Conversational rating system (1-10) for each speaker
2. **Event Summary Generation** - Polished summary emailed after event
3. **Speaker Performance Report** - Annual "Top Speaker Report" with actual data
4. **Power Confidence Report (PCR)** - Speaker evaluation metrics

### Key AI Behaviors
- Conversational and friendly tone ("Hi bud")
- Proactive guidance throughout event
- Context-aware recommendations
- Note consolidation and enhancement
- Performance tracking and reporting