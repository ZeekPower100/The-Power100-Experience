import React from 'react';
import {
  Map,
  Target,
  Users,
  Award,
  UserPlus,
  Zap,
  Heart,
  Settings,
  Cpu,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Focus Area Icon Mapping Component
 *
 * Maps each focus area to its corresponding icon from Lucide React library
 * Provides consistent visual language across all partner landing pages
 *
 * Focus Areas List:
 * 1. greenfield_growth - Market Expansion
 * 2. closing_higher_percentage - Sales Conversion
 * 3. controlling_lead_flow - Lead Generation & Management
 * 4. installation_quality - Service Delivery Excellence
 * 5. hiring_sales_leadership - Talent Acquisition
 * 6. marketing_automation - Marketing Systems
 * 7. customer_retention - Customer Success
 * 8. operational_efficiency - Operations Optimization
 * 9. technology_integration - Technology Solutions
 * 10. financial_management - Financial Performance
 */

// Icon mapping for each focus area
const FOCUS_AREA_ICONS: Record<string, LucideIcon> = {
  // Market Expansion - Map icon represents geographic growth and new territories
  greenfield_growth: Map,

  // Sales Conversion - Target icon represents hitting sales goals and closing deals
  closing_higher_percentage: Target,

  // Lead Generation & Management - Users icon represents building customer pipeline
  controlling_lead_flow: Users,

  // Service Delivery Excellence - Award icon represents quality and excellence
  installation_quality: Award,

  // Talent Acquisition - UserPlus icon represents hiring and team building
  hiring_sales_leadership: UserPlus,

  // Marketing Systems - Zap icon represents automation and efficiency
  marketing_automation: Zap,

  // Customer Success - Heart icon represents loyalty and retention
  customer_retention: Heart,

  // Operations Optimization - Settings icon represents process improvement
  operational_efficiency: Settings,

  // Technology Solutions - Cpu icon represents tech and digital transformation
  technology_integration: Cpu,

  // Financial Performance - DollarSign icon represents profitability and cash flow
  financial_management: DollarSign
};

// Default fallback icon if focus area not found
const DEFAULT_ICON = TrendingUp;

interface FocusAreaIconProps {
  focusArea: string;
  className?: string;
}

/**
 * FocusAreaIcon Component
 *
 * @param focusArea - The focus area value (e.g., 'greenfield_growth')
 * @param className - Optional CSS classes for styling the icon
 * @returns The appropriate Lucide icon component
 */
export default function FocusAreaIcon({ focusArea, className = "h-7 w-7" }: FocusAreaIconProps) {
  const IconComponent = FOCUS_AREA_ICONS[focusArea] || DEFAULT_ICON;
  return <IconComponent className={className} />;
}

/**
 * Hook to get icon component for a focus area
 * Useful when you need the icon component itself, not rendered
 */
export function useFocusAreaIcon(focusArea: string): LucideIcon {
  return FOCUS_AREA_ICONS[focusArea] || DEFAULT_ICON;
}

/**
 * Get all available focus area icons
 * Useful for documentation or displaying all options
 */
export function getAllFocusAreaIcons(): Record<string, LucideIcon> {
  return FOCUS_AREA_ICONS;
}
