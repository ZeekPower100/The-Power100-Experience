// src/lib/types/Contractor.ts

// The list of possible focus areas, useful for type safety
export type FocusArea = 
  | "greenfield_growth"
  | "controlling_lead_flow"
  | "closing_higher_percentage"
  | "installation_quality"
  | "hiring_sales_leadership"
  | "marketing_automation"
  | "customer_retention"
  | "operational_efficiency"
  | "technology_integration"
  | "financial_management";

// The list of possible revenue ranges
export type RevenueRange =
  | "under_500k"
  | "500k_1m"
  | "1m_5m"
  | "5m_10m"
  | "over_10m";

// The main Contractor interface
export interface Contractor {
  id: string; // Will be assigned by the backend
  name: string;
  email: string;
  phone: string;
  company_name: string;
  company_website?: string;
  service_area: string;
  services_offered: string[];
  verification_status: "pending" | "verified" | "failed";
  verification_code?: string;
  focus_areas: FocusArea[];
  primary_focus_area: FocusArea | string; // Can be a defined type or a general string
  annual_revenue: RevenueRange | string;
  team_size: number;
  readiness_indicators: {
    increased_tools: boolean;
    increased_people: boolean;
    increased_activity: boolean;
  };
  current_stage?: "verification" | "focus_selection" | "profiling" | "matching" | "demo_booked" | "completed";
  assigned_partner_id?: string;
  demo_scheduled_date?: string;
  opted_in_coaching: boolean;
}