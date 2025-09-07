export interface Event {
  id?: string;
  
  // Existing database fields
  name?: string;
  date?: string;
  registration_deadline?: string;
  focus_areas_covered?: string;
  is_active?: boolean;
  location?: string;
  format?: string;
  description?: string;
  expected_attendees?: string;
  website?: string;
  logo_url?: string;
  
  // New fields to be added (from AI requirements)
  target_audience?: string;
  topics?: string;
  price_range?: string;
  registration_url?: string;
  
  // Organizer contact info
  organizer_name?: string;
  organizer_email?: string;
  organizer_phone?: string;
  organizer_company?: string;
  
  // Event details
  event_type?: string; // Conference, Workshop, Summit, Bootcamp, etc.
  duration?: string; // "1 day", "3 days", "1 week"
  
  // Success metrics (post-event)
  past_attendee_testimonials?: string;
  success_metrics?: string;
  speaker_profiles?: string;
  networking_quality_score?: number;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  submission_type?: 'organizer' | 'team_member';
  status?: 'draft' | 'published';
}