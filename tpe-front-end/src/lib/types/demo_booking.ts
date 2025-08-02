// src/lib/types/DemoBooking.ts

export interface DemoBooking {
  id: string; // Will be assigned by the backend
  contractor_id: string;
  partner_id: string;
  scheduled_date?: string;
  focus_area: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  demo_type: "initial_demo" | "follow_up" | "refresher";
  meeting_notes?: string;
  contractor_feedback?: {
    rating: number;
    comments?: string;
    likelihood_to_proceed: "very_likely" | "likely" | "neutral" | "unlikely" | "very_unlikely";
  };
  follow_up_needed: boolean;
  next_steps?: string;
}