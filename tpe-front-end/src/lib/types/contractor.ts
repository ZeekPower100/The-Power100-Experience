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

// The list of possible revenue ranges (matching partner form)
export type RevenueRange =
  | "0_5_million"
  | "5_10_million"
  | "11_20_million"
  | "21_30_million"
  | "31_50_million"
  | "51_75_million"
  | "76_150_million"
  | "151_300_million"
  | "300_plus_million";

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
  current_stage?: "verification" | "focus_selection" | "profiling" | "tech_stack" | "matching" | "demo_booked" | "completed";
  assigned_partner_id?: string;
  demo_scheduled_date?: string;
  opted_in_coaching: boolean;
  
  // Tech Stack Fields
  tech_stack_sales?: string[];
  tech_stack_operations?: string[];
  tech_stack_marketing?: string[];
  tech_stack_customer_experience?: string[];
  tech_stack_project_management?: string[];
  tech_stack_accounting_finance?: string[];
  
  // Tech Stack Other Fields
  tech_stack_sales_other?: string;
  tech_stack_operations_other?: string;
  tech_stack_marketing_other?: string;
  tech_stack_customer_experience_other?: string;
  tech_stack_project_management_other?: string;
  tech_stack_accounting_finance_other?: string;
}