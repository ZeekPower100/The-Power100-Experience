export interface Podcast {
  id?: string;
  
  // Existing database fields
  title?: string;
  host?: string;
  frequency?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  focus_areas_covered?: string;
  topics?: string;
  target_audience?: string;
  is_active?: boolean;
  
  // New fields to enhance matching
  episode_count?: number;
  average_episode_length?: string;
  format?: string; // Interview, Solo, Panel, Educational
  
  // Host information
  host_email?: string;
  host_phone?: string;
  host_linkedin?: string;
  host_company?: string;
  host_bio?: string;
  
  // Podcast platforms
  spotify_url?: string;
  apple_podcasts_url?: string;
  youtube_url?: string;
  other_platform_urls?: string;
  
  // Guest opportunities
  accepts_guest_requests?: boolean;
  guest_requirements?: string;
  typical_guest_profile?: string;
  booking_link?: string;
  
  // Success metrics
  subscriber_count?: string;
  download_average?: string;
  notable_guests?: string;
  testimonials?: string;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  submission_type?: 'host' | 'team_member';
  status?: 'draft' | 'published';
}