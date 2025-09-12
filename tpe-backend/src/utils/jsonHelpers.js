/**
 * JSON Helper Utilities
 * Prevents 90% of JSON parsing errors in the application
 */

/**
 * Safely parse JSON with fallback
 * Handles: null/undefined, already parsed objects, malformed JSON
 */
function safeJsonParse(data, fallback = null) {
  try {
    // Category 4: Check if data exists
    if (data === null || data === undefined || data === '') {
      return fallback;
    }
    
    // Category 3: Check if already parsed (is an object/array)
    if (typeof data === 'object') {
      return data;
    }
    
    // Category 2: Only parse strings
    if (typeof data === 'string') {
      // Handle special case: "[object Object]" string
      if (data === '[object Object]') {
        return fallback;
      }
      
      // Handle boolean strings that sometimes come from forms
      if (data === 'true') return true;
      if (data === 'false') return false;
      
      // Try to parse
      return JSON.parse(data);
    }
    
    // If it's not a string or object, return as-is
    return data;
  } catch (error) {
    // Category 1: Catches malformed JSON
    console.error('JSON Parse Error:', error.message, 'Data:', data?.substring?.(0, 100));
    return fallback;
  }
}

/**
 * Safely stringify JSON
 * Handles: null/undefined, circular references, already stringified
 */
function safeJsonStringify(data, fallback = '{}') {
  try {
    // Already a string? Check if it's valid JSON
    if (typeof data === 'string') {
      try {
        JSON.parse(data); // Validate it's proper JSON
        return data;
      } catch {
        // Not valid JSON, stringify it
        return JSON.stringify(data);
      }
    }
    
    // Null/undefined? Return fallback
    if (data === null || data === undefined) {
      return fallback;
    }
    
    // Object/Array? Stringify it
    return JSON.stringify(data);
  } catch (error) {
    console.error('JSON Stringify Error:', error.message);
    return fallback;
  }
}

/**
 * Parse JSON fields from database records
 * Common for contractor/partner JSON fields
 */
function parseJsonFields(record, jsonFields = []) {
  const parsed = { ...record };
  
  for (const field of jsonFields) {
    if (field in parsed) {
      parsed[field] = safeJsonParse(parsed[field], Array.isArray(parsed[field]) ? [] : {});
    }
  }
  
  return parsed;
}

/**
 * Prepare JSON fields for database storage
 */
function stringifyJsonFields(record, jsonFields = []) {
  const prepared = { ...record };
  
  for (const field of jsonFields) {
    if (field in prepared && prepared[field] !== null) {
      prepared[field] = safeJsonStringify(prepared[field]);
    }
  }
  
  return prepared;
}

/**
 * Common JSON fields in our database
 */
const CONTRACTOR_JSON_FIELDS = [
  'focus_areas',
  'readiness_indicators',
  'tech_stack',
  'ai_preferences',
  'communication_preferences',
  'learning_preferences'
];

const PARTNER_JSON_FIELDS = [
  'focus_areas_served',
  'target_revenue_range',
  'geographic_regions',
  'service_categories',
  'manufacturer_partners',
  'testimonials'
];

/**
 * Validate JSON structure against expected schema
 */
function validateJsonStructure(data, expectedType = 'array') {
  const parsed = safeJsonParse(data, null);
  
  if (parsed === null) return false;
  
  if (expectedType === 'array') {
    return Array.isArray(parsed);
  }
  
  if (expectedType === 'object') {
    return typeof parsed === 'object' && !Array.isArray(parsed);
  }
  
  return true;
}

module.exports = {
  safeJsonParse,
  safeJsonStringify,
  parseJsonFields,
  stringifyJsonFields,
  validateJsonStructure,
  CONTRACTOR_JSON_FIELDS,
  PARTNER_JSON_FIELDS
};