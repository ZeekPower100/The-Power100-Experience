export interface Book {
  id?: string;
  
  // Existing database fields
  title?: string;
  author?: string;
  description?: string;
  cover_image_url?: string;
  amazon_url?: string;
  publication_year?: number;
  topics?: string;
  focus_areas_covered?: string;
  target_audience?: string;
  key_takeaways?: string;
  reading_time?: string;
  difficulty_level?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // New fields from Greg's requirements (to be added to DB)
  author_email?: string;
  author_phone?: string;
  author_linkedin_url?: string;
  author_website?: string;
  
  // Executive Assistant Info
  has_executive_assistant?: boolean;
  ea_name?: string;
  ea_email?: string;
  ea_phone?: string;
  ea_scheduling_link?: string;
  
  // Key Citations
  key_citations?: string; // JSON stringified array
  
  // Author's Story & Vision
  writing_inspiration?: string;
  problems_addressed?: string;
  next_12_18_months?: string;
  book_goals?: string;
  author_availability?: string;
  
  // Additional purchase links
  barnes_noble_url?: string;
  author_website_purchase_url?: string;
  
  // Metadata
  submission_type?: 'author' | 'team_member';
  status?: 'draft' | 'published';
}