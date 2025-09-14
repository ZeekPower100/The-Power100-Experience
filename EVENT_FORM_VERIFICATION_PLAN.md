# Event Form Verification Plan - Batch Approach

## Total Fields to Verify: ~45 fields

### Batch 1: Basic Event Information
1. **name** - Event name
2. **date** - Event date
3. **location** - Event location
4. **format** - Virtual/In-Person/Hybrid
5. **event_type** - Type of event

### Batch 2: Organizer Information
1. **organizer_name** - Event owner name
2. **organizer_email** - Owner email
3. **organizer_phone** - Owner phone
4. **organizer_company** - Owner company
5. **website** - Event URL

### Batch 3: POC Customer Experience (NEW)
1. **poc_customer_name** - Customer experience POC name
2. **poc_customer_email** - Customer experience POC email
3. **poc_customer_phone** - Customer experience POC phone
4. **poc_media_name** - Media/promotion POC name
5. **poc_media_email** - Media/promotion POC email

### Batch 4: POC Media & Event Links (NEW)
1. **poc_media_phone** - Media POC phone
2. **hotel_block_url** - Hotel block link
3. **registration_url** - Registration link
4. **registration_deadline** - Registration deadline
5. **price_range** - Event pricing

### Batch 5: Event Details
1. **description** - Summary/history/purpose
2. **duration** - Event duration
3. **expected_attendees** - Expected attendance
4. **focus_areas_covered** - Event specialty (same categories)
5. **target_revenue** - Target audience (revenue ranges)

### Batch 6: Content & Speakers
1. **speaker_profiles** - Speaker list with contact info
2. **agenda_highlights** - Event agenda
3. **topics** - Event topics
4. **past_attendee_testimonials** - Testimonials
5. **success_metrics** - Success metrics

### Batch 7: Sponsors & Attendees (NEW)
1. **sponsors** - Sponsors with contact info (JSON)
2. **pre_registered_attendees** - Pre-registration list (JSON)
3. **networking_quality_score** - Networking score
4. **networking_opportunities** - Networking JSON
5. **session_recordings** - Recording availability

### Batch 8: Support & Resources
1. **post_event_support** - Post-event support
2. **implementation_support** - Implementation support
3. **follow_up_resources** - Follow-up resources
4. **target_audience** - Additional audience description
5. **logo_url** - Event logo

## Verification Criteria (Same as Podcast/Book forms):
For each batch, verify:
1. ✅ Input field exists for database column
2. ✅ Field value aligns with database expectation
3. ✅ Field exists on both admin and public forms
4. ✅ Format type matches between forms
5. ✅ Submit/save functions align with database

## Current Status:
- ✅ Database columns added (9 new fields from Greg's requirements)
- ⏳ Need to verify existing fields
- ⏳ Need to add new fields to forms
- ⏳ Need to ensure field alignment