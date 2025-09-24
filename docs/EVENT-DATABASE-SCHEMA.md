# Event Database Schema - SOURCE OF TRUTH
*Generated from actual database - Use THESE EXACT field names in all code*

## event_attendees
```
id                        | integer
event_id                  | integer (FK -> events)
contractor_id             | integer (FK -> contractors)
registration_date         | timestamp
check_in_time             | timestamp
check_in_method           | varchar(50) - 'qr_code', 'manual', 'mass_trigger'
profile_completion_status | varchar(50) - 'pending', 'partial', 'complete'
profile_completion_time   | timestamp
sms_opt_in                | boolean
real_email                | varchar(255)
real_phone                | varchar(50)
pre_filled_data           | jsonb
custom_responses          | jsonb
qr_code_data              | varchar(255)
created_at                | timestamp
updated_at                | timestamp
```

## event_speakers
```
id                        | integer
event_id                  | integer (FK -> events)
name                      | varchar(255)
title                     | varchar(255)
company                   | varchar(255)
bio                       | text
headshot_url              | varchar(255)
session_title             | text
session_description       | text
session_time              | timestamp
session_duration_minutes  | integer
session_location          | varchar(255)
focus_areas               | jsonb
target_audience           | jsonb
pcr_score                 | numeric(5,2)
total_ratings             | integer
average_rating            | numeric(3,1)
ai_summary                | text
ai_key_points             | jsonb
relevance_keywords        | jsonb
created_at                | timestamp
updated_at                | timestamp
```

## event_sponsors
```
id                        | integer
event_id                  | integer (FK -> events)
partner_id                | integer (FK -> strategic_partners)
sponsor_tier              | varchar(50)
booth_number              | varchar(50)
booth_location            | varchar(255)
booth_representatives     | jsonb - [{name, title, phone, email, is_primary}]
focus_areas_served        | jsonb
talking_points            | text
demo_booking_url          | varchar(255)
special_offers            | text
activation_type           | varchar(100)
presentation_time         | timestamp
presentation_title        | text
target_contractor_profile | jsonb
pcr_score                 | numeric(5,2)
total_interactions        | integer
demos_booked              | integer
ai_matching_notes         | text
created_at                | timestamp
updated_at                | timestamp
```

## event_messages
```
id                        | integer
event_id                  | integer (FK -> events)
contractor_id             | integer (FK -> contractors)
message_type              | varchar(50) - 'check_in', 'speaker_alert', 'sponsor_recommendation', 'peer_match', 'mass_send'
message_category          | varchar(50) - 'greeting', 'reminder', 'recommendation', 'feedback_request'
scheduled_time            | timestamp
actual_send_time          | timestamp
message_content           | text
personalization_data      | jsonb
response_received         | text
response_time             | timestamp
sentiment_score           | numeric(3,2)
pcr_score                 | numeric(5,2)
action_taken              | varchar(100)
delay_minutes             | integer
status                    | varchar(50) - 'pending', 'sent', 'failed', 'responded'
error_message             | text
created_at                | timestamp
updated_at                | timestamp
```

## event_peer_matches
```
id                        | integer
event_id                  | integer (FK -> events)
contractor1_id            | integer (FK -> contractors)
contractor2_id            | integer (FK -> contractors)
match_type                | varchar(50)
match_criteria            | jsonb
match_score               | numeric(5,2)
match_reason              | text
introduction_sent_time    | timestamp
introduction_message      | text
contractor1_response      | boolean
contractor2_response      | boolean
connection_made           | boolean
meeting_scheduled         | boolean
meeting_time              | timestamp
meeting_location          | varchar(255)
feedback_contractor1      | text
feedback_contractor2      | text
pcr_score                 | numeric(5,2)
created_at                | timestamp
updated_at                | timestamp
```

## event_timeline
```
id                        | integer
event_id                  | integer (FK -> events)
timeline_type             | varchar(50) - 'session', 'break', 'meal', 'networking', 'keynote'
title                     | varchar(255)
description               | text
scheduled_start           | timestamp
scheduled_end             | timestamp
actual_start              | timestamp
actual_end                | timestamp
delay_minutes             | integer
location                  | varchar(255)
speaker_id                | integer (FK -> event_speakers)
is_mandatory              | boolean
focus_areas               | jsonb
attendee_count            | integer
status                    | varchar(50) - 'scheduled', 'in_progress', 'completed', 'cancelled'
ceo_override_log          | jsonb - [{time, message, delay_applied}]
created_at                | timestamp
updated_at                | timestamp
```

## CRITICAL NAMING RULES:
1. **NEVER** use camelCase in database queries (it's snake_case)
2. **ALWAYS** match these exact column names in:
   - Controllers (req.body destructuring)
   - Routes (validation)
   - Frontend forms
   - API responses
3. **JSONB fields** need safeJsonParse/safeJsonStringify
4. **Foreign Keys** must reference existing records
5. **Timestamps** are stored as PostgreSQL timestamps (not strings)