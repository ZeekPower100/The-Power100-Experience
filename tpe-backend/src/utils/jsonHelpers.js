/**
 * JSON Helper Utilities for Backend
 * Prevents JSON parsing errors and provides safe fallbacks
 * 
 * This is the JavaScript version for Node.js backend
 */

/**
 * Safely parse JSON with fallback
 * Handles: null/undefined, already parsed objects, malformed JSON
 */
function safeJsonParse(data, fallback = null) {
  try {
    // Check if data exists
    if (data === null || data === undefined || data === '') {
      return fallback;
    }
    
    // Check if already parsed (is an object/array)
    if (typeof data === 'object') {
      return data;
    }
    
    // Only parse strings
    if (typeof data === 'string') {
      // Handle special case: "[object Object]" string
      if (data === '[object Object]') {
        return fallback;
      }
      
      // Handle boolean strings
      if (data === 'true') return true;
      if (data === 'false') return false;
      
      // Handle comma-separated values that aren't JSON
      if (!data.startsWith('[') && !data.startsWith('{') && data.includes(',')) {
        // Return as array of trimmed values
        return data.split(',').map(item => item.trim());
      }
      
      // Try to parse as JSON
      return JSON.parse(data);
    }
    
    // If it's not a string or object, return as-is
    return data;
  } catch (error) {
    console.error('JSON Parse Error:', error.message, 'Data preview:', 
                  typeof data === 'string' ? data.substring(0, 100) : 'non-string');
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
 * Handle API response with proper JSON parsing
 * For backend, this is typically used with fetch responses
 */
async function handleApiResponse(response) {
  try {
    // Check response exists
    if (!response) return null;
    
    // For backend, check if response has json method
    if (typeof response.json === 'function') {
      const text = await response.text();
      return safeJsonParse(text, null);
    }
    
    // If it's already data, parse it safely
    return safeJsonParse(response, null);
  } catch (error) {
    console.error('Response parsing failed:', error);
    return null;
  }
}

/**
 * Parse JSON fields from database records
 * Common for handling JSON columns from PostgreSQL
 */
function parseJsonFields(record, jsonFields = []) {
  if (!record) return record;
  
  const parsed = { ...record };
  
  for (const field of jsonFields) {
    if (field in parsed) {
      parsed[field] = safeJsonParse(parsed[field], Array.isArray(parsed[field]) ? [] : null);
    }
  }
  
  return parsed;
}

/**
 * Validate and parse array fields
 * Ensures data is always an array
 */
function ensureArray(data) {
  // Already an array
  if (Array.isArray(data)) return data;
  
  // Null/undefined/empty
  if (!data || data === null || data === undefined || data === '') return [];
  
  // String that looks like JSON array
  if (typeof data === 'string') {
    if (data.startsWith('[')) {
      return safeJsonParse(data, []);
    }
    // Comma-separated string
    if (data.includes(',')) {
      return data.split(',').map(item => item.trim());
    }
    // Single value
    return [data];
  }
  
  // Wrap single item in array
  return [data];
}

/**
 * Safe JSON parsing for request body
 * Commonly used in Express middleware
 */
function parseRequestBody(body) {
  if (!body) return {};
  
  // If it's a string, try to parse it
  if (typeof body === 'string') {
    return safeJsonParse(body, {});
  }
  
  // Already an object
  return body;
}

// For CommonJS compatibility (Node.js)
module.exports = {
  safeJsonParse,
  safeJsonStringify,
  handleApiResponse,
  parseJsonFields,
  ensureArray,
  parseRequestBody,
  
  // Compatibility aliases for migration
  getFromStorage: safeJsonParse,  // Backend doesn't use localStorage
  setToStorage: safeJsonStringify  // But migration script might add these
};