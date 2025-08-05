/**
 * JSON Field Utilities for SQLite JSON String Parsing
 * 
 * SQLite stores JSON arrays as strings, but frontend components expect actual arrays.
 * These utilities provide safe, consistent parsing for all JSON fields.
 */

import React from 'react';

/**
 * Safely parse a JSON field that might be a string or already parsed array
 * @param field - The field to parse (could be string, array, null, undefined)
 * @returns Parsed array or empty array if parsing fails
 */
export function parseJsonArray<T = string>(field: unknown): T[] {
  if (!field) return [];
  
  try {
    if (typeof field === 'string') {
      // Handle empty string case
      if (field.trim() === '') return [];
      return JSON.parse(field);
    } else if (Array.isArray(field)) {
      return field;
    }
  } catch (e) {
    console.warn('Failed to parse JSON array field:', field, e);
  }
  
  return [];
}

/**
 * Safely parse a JSON object field that might be a string or already parsed
 * @param field - The field to parse (could be string, object, null, undefined)  
 * @returns Parsed object or null if parsing fails
 */
export function parseJsonObject<T = Record<string, any>>(field: unknown): T | null {
  if (!field) return null;
  
  try {
    if (typeof field === 'string') {
      // Handle empty string case
      if (field.trim() === '') return null;
      return JSON.parse(field);
    } else if (typeof field === 'object' && field !== null) {
      return field as T;
    }
  } catch (e) {
    console.warn('Failed to parse JSON object field:', field, e);
  }
  
  return null;
}

/**
 * Component helper for safely rendering JSON arrays
 * @param field - The JSON field to render
 * @param renderItem - Function to render each item
 * @returns React nodes or null if no items
 */
export function renderJsonArray(
  field: unknown,
  renderItem: (item: string, index: number) => React.ReactNode
): React.ReactNode {
  const items = parseJsonArray(field);
  return items.length > 0 ? items.map(renderItem) : null;
}

/**
 * Safe wrapper component for JSON array rendering with error boundary
 * @param field - The JSON field to render
 * @param renderItem - Function to render each item
 * @param fallback - Optional fallback content if parsing fails
 * @returns React component
 */
export function SafeJsonArray({ 
  field, 
  renderItem, 
  fallback = null 
}: {
  field: unknown;
  renderItem: (item: string, index: number) => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  try {
    const items = parseJsonArray(field);
    if (items.length === 0) return fallback;
    return <>{items.map(renderItem)}</>;
  } catch (e) {
    console.error('SafeJsonArray render error:', e);
    return fallback;
  }
}

/**
 * Get safe length of JSON array field
 * @param field - The JSON field
 * @returns Length of array or 0 if not parseable
 */
export function getJsonArrayLength(field: unknown): number {
  return parseJsonArray(field).length;
}

/**
 * Check if JSON field has any items
 * @param field - The JSON field to check
 * @returns True if field has items, false otherwise
 */
export function hasJsonArrayItems(field: unknown): boolean {
  return getJsonArrayLength(field) > 0;
}

/**
 * Standardized pattern for rendering JSON arrays in components
 * Use this as a template for consistent JSON field handling
 */
export const JsonArrayRenderer = {
  /**
   * Focus Areas renderer (most common use case)
   */
  focusAreas: (field: unknown, BadgeComponent: React.ComponentType<any>) => (
    <>
      {(() => {
        const items = parseJsonArray(field);
        return items.length > 0 && (
          <div className="mb-4">
            <span className="text-gray-500 text-sm">Focus Areas:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {items.map((item: string, index: number) => (
                <BadgeComponent key={index} variant="outline" className="text-xs">
                  {item}
                </BadgeComponent>
              ))}
            </div>
          </div>
        );
      })()}
    </>
  ),

  /**
   * Generic list renderer
   */
  list: (field: unknown, title: string, BadgeComponent: React.ComponentType<any>) => (
    <>
      {(() => {
        const items = parseJsonArray(field);
        return items.length > 0 && (
          <div className="mb-4">
            <span className="text-gray-500 text-sm">{title}:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {items.map((item: string, index: number) => (
                <BadgeComponent key={index} variant="outline" className="text-xs">
                  {item}
                </BadgeComponent>
              ))}
            </div>
          </div>
        );
      })()}
    </>
  )
};

/**
 * Debug utilities for JSON fields
 */
export const JsonDebugUtils = {
  /**
   * Log detailed information about a JSON field
   */
  logField: (fieldName: string, field: unknown) => {
    console.group(`🔍 JSON Field Debug: ${fieldName}`);
    console.log('Type:', typeof field);
    console.log('Value:', field);
    console.log('Is Array:', Array.isArray(field));
    console.log('Is String:', typeof field === 'string');
    console.log('Parsed Result:', parseJsonArray(field));
    console.groupEnd();
  },

  /**
   * Validate all JSON fields in an object
   */
  validateObject: (obj: Record<string, unknown>, jsonFields: string[]) => {
    console.group('🔍 JSON Fields Validation');
    jsonFields.forEach(fieldName => {
      const field = obj[fieldName];
      const parsed = parseJsonArray(field);
      console.log(`${fieldName}:`, {
        original: field,
        type: typeof field,
        parsed,
        isValid: Array.isArray(parsed)
      });
    });
    console.groupEnd();
  }
};

// Type definitions for common JSON field structures
export interface ContractorJsonFields {
  focus_areas: string[];
  services_offered: string[];
  readiness_indicators: string[];
}

export interface PartnerJsonFields {
  focus_areas_served: string[];
  target_revenue_range: string[];
  geographic_regions: string[];
  key_differentiators: string[];
  client_testimonials: any[];
}