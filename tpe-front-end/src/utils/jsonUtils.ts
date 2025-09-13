import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from './jsonHelpers';

/**
 * JSON Field Utilities for SQLite JSON String Parsing
 * 
 * SQLite stores JSON arrays as strings, but frontend components expect actual arrays.
 * These utilities provide safe, consistent parsing for all JSON fields.
 */

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
      return safeJsonParse(field);
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
      return safeJsonParse(field);
    } else if (typeof field === 'object' && field !== null) {
      return field as T;
    }
  } catch (e) {
    console.warn('Failed to parse JSON object field:', field, e);
  }
  
  return null;
}

/**
 * Get array items for mapping in components
 * @param field - The JSON field to process
 * @returns Array of items ready for mapping/rendering
 */
export function getJsonArrayForMapping(field: unknown): string[] {
  return parseJsonArray(field);
}

/**
 * Get parsed JSON array items safely for rendering
 * @param field - The JSON field to parse
 * @returns Array of items or empty array if parsing fails
 */
export function getSafeJsonArrayItems(field: unknown): string[] {
  try {
    return parseJsonArray(field);
  } catch (e) {
    console.error('SafeJsonArray parse error:', e);
    return [];
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
 * Get focus areas as a clean array for rendering
 * @param field - The JSON field containing focus areas
 * @returns Array of focus area strings
 */
export function getFocusAreas(field: unknown): string[] {
  return getSafeJsonArrayItems(field);
}

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