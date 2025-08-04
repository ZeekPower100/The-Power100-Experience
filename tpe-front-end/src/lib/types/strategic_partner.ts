// src/lib/types/StrategicPartner.ts

// This is the correct TypeScript interface format.
// It defines the "shape" of a StrategicPartner object for our components.
export interface StrategicPartner {
  id: string; // Essential for mapping and keys
  company_name: string;
  description: string;
  logo_url?: string; // Optional fields are marked with a '?'
  website?: string;
  contact_email: string;
  contact_phone?: string;
  power100_subdomain?: string;
  focus_areas_served: string[];
  target_revenue_range: string[];
  geographic_regions?: string[];
  power_confidence_score: number;
  pricing_model: string;
  onboarding_process?: string;
  key_differentiators: string[];
  client_testimonials: {
    client_name: string;
    testimonial: string;
    rating?: number;
  }[];
  is_active: boolean;
  last_quarterly_report?: string;
}