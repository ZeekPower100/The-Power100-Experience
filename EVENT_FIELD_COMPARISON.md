# EVENT FORM FIELD COMPARISON

## 1. PUBLIC FORM FIELDS (EventOnboardingForm.tsx)
From lines 76-102 of EventOnboardingForm.tsx:
- name
- organizer (note: different from organizer_name)
- description
- event_type
- format
- start_date (mapped to 'date' on submit)
- end_date (mapped to 'registration_deadline' on submit)
- location
- website_url (mapped to 'website' on submit)
- registration_url
- focus_areas (mapped to 'focus_areas_covered' on submit)
- target_revenue
- speakers (mapped to 'speaker_profiles' on submit)
- agenda_highlights
- past_attendees
- testimonials (mapped to 'past_attendee_testimonials' on submit)
- price_range
- expected_attendance (mapped to 'expected_attendees' on submit)
- event_image_url (mapped to 'logo_url' on submit)
- organizer_name
- organizer_email
- organizer_phone
- organizer_company
- is_organizer
- status

## 2. ADMIN FORM FIELDS (EventForm.tsx)
From lines 48-82 of EventForm.tsx:
- name ✅
- date ✅
- registration_deadline ✅
- location ✅
- format ✅
- description ✅
- expected_attendees ✅
- website ✅
- logo_url ✅
- target_audience
- topics
- price_range ✅
- registration_url ✅
- organizer_name ✅
- organizer_email ✅
- organizer_phone ✅
- organizer_company ✅
- event_type ✅
- duration
- past_attendee_testimonials ✅
- success_metrics
- speaker_profiles ✅
- networking_quality_score
- is_active
- focus_areas_covered (handled separately) ✅
- agenda_highlights (handled separately) ✅

## 3. DATABASE COLUMNS (from check_all_event_columns.bat output)
- id
- name ✅
- date ✅
- registration_deadline ✅
- focus_areas_covered ✅
- is_active ✅
- location ✅
- format ✅
- description ✅
- expected_attendees ✅
- website ✅
- logo_url ✅
- status ✅
- ai_summary
- ai_tags
- historical_attendance
- post_event_support
- implementation_support
- roi_tracking
- networking_opportunities
- speaker_credentials
- session_recordings
- follow_up_resources
- created_at
- speaker_profiles ✅
- agenda_highlights ✅
- past_attendee_testimonials ✅
- organizer_name ✅
- organizer_email ✅
- target_audience ✅

## MISSING FROM DATABASE:
❌ event_type
❌ price_range
❌ organizer_phone
❌ organizer_company
❌ duration
❌ topics
❌ registration_url
❌ success_metrics
❌ networking_quality_score

## FIELD MAPPING ISSUES:
1. Public form has "organizer" but should use "organizer_name"
2. Public form has "website_url" but maps to "website"
3. Public form has "speakers" but maps to "speaker_profiles"
4. Public form has "testimonials" but maps to "past_attendee_testimonials"
5. Public form has "expected_attendance" but maps to "expected_attendees"
6. Public form has "event_image_url" but maps to "logo_url"
7. Public form has "start_date" but maps to "date"
8. Public form has "end_date" but maps to "registration_deadline"

## FIELDS IN PUBLIC FORM BUT NOT IN ADMIN:
- target_revenue
- past_attendees
- is_organizer

## FIELDS IN ADMIN FORM BUT NOT IN PUBLIC:
- target_audience
- topics
- duration
- success_metrics
- networking_quality_score
- is_active