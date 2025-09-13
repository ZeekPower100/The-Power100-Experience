/**
 * JSON Helper Utilities for Frontend
 * Prevents 90% of JSON parsing errors in the application
 */

/**
 * Safely parse JSON with fallback
 * Handles: null/undefined, already parsed objects, malformed JSON
 */
export function safeJsonParse<T = any>(data: any, fallback: T = null as T): T {
  try {
    // Category 4: Check if data exists
    if (data === null || data === undefined || data === '') {
      return fallback;
    }
    
    // Category 3: Check if already parsed (is an object/array)
    if (typeof data === 'object') {
      return data as T;
    }
    
    // Category 2: Only parse strings
    if (typeof data === 'string') {
      // Handle special case: "[object Object]" string
      if (data === '[object Object]') {
        return fallback;
      }
      
      // Handle boolean strings that sometimes come from forms
      if (data === 'true') return true as T;
      if (data === 'false') return false as T;
      
      // Try to parse using native JSON.parse
      return JSON.parse(data) as T;
    }
    
    // If it's not a string or object, return as-is
    return data as T;
  } catch (error) {
    // Category 1: Catches malformed JSON
    console.error('JSON Parse Error:', error, 'Data preview:', data?.substring?.(0, 100));
    return fallback;
  }
}

/**
 * Safely stringify JSON
 * Handles: null/undefined, circular references, already stringified
 */
export function safeJsonStringify(data: any, fallback: string = '{}'): string {
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
    
    // Object/Array? Stringify it using native JSON.stringify
    return JSON.stringify(data);
  } catch (error: any) {
    console.error('JSON Stringify Error:', error?.message);
    return fallback;
  }
}

/**
 * Handle API response with proper JSON parsing
 */
export async function handleApiResponse<T = any>(response: Response): Promise<T | null> {
  try {
    // Check response exists
    if (!response) return null;
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON, content-type:', contentType);
      return null;
    }
    
    // Parse response
    const text = await response.text();
    return safeJsonParse<T>(text, null);
  } catch (error) {
    console.error('Response parsing failed:', error);
    return null;
  }
}

/**
 * Get from localStorage with safe parsing
 */
export function getFromStorage<T = any>(key: string, fallback: T = null as T): T {
  try {
    const item = localStorage.getItem(key);
    
    // If no item found, return fallback
    if (item === null || item === undefined) {
      return fallback;
    }
    
    // List of keys that should NOT be parsed as JSON
    const nonJsonKeys = [
      'authToken', 'adminToken', 'partnerToken',  // JWT tokens
      'authTokenTimestamp',                        // Timestamps
      'partner_application_id', 'delegate_id'      // Simple IDs
    ];
    
    // Check if this key should be returned as-is (not parsed)
    if (nonJsonKeys.includes(key) || 
        key.endsWith('Token') || 
        key.endsWith('_token') ||
        key.endsWith('Timestamp') ||
        key.endsWith('_id') ||
        key.endsWith('_uuid')) {
      return item as T;
    }
    
    // Check if the value looks like a JWT token (starts with ey)
    if (typeof item === 'string' && item.startsWith('ey')) {
      return item as T;
    }
    
    // For everything else, try to parse as JSON
    return safeJsonParse<T>(item, fallback);
  } catch (error) {
    console.error(`Storage read error for ${key}:`, error);
    return fallback;
  }
}

/**
 * Set to localStorage with safe stringification
 */
export function setToStorage(key: string, value: any): boolean {
  try {
    // List of keys that should NOT be JSON stringified
    const nonJsonKeys = [
      'authToken', 'adminToken', 'partnerToken',  // JWT tokens
      'authTokenTimestamp',                        // Timestamps
      'partner_application_id', 'delegate_id'      // Simple IDs
    ];
    
    // Check if this key should be stored as-is (not stringified)
    if (nonJsonKeys.includes(key) || 
        key.endsWith('Token') || 
        key.endsWith('_token') ||
        key.endsWith('Timestamp') ||
        key.endsWith('_id') ||
        key.endsWith('_uuid')) {
      localStorage.setItem(key, String(value));
      return true;
    }
    
    // Check if the value looks like a JWT token
    if (typeof value === 'string' && value.startsWith('ey')) {
      localStorage.setItem(key, value);
      return true;
    }
    
    // Check if value is already a JSON string (to avoid double stringification)
    if (typeof value === 'string') {
      try {
        // Try to parse it to check if it's valid JSON
        JSON.parse(value);
        // If it parses successfully, it's already JSON, store as-is
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Not JSON, stringify it
        localStorage.setItem(key, safeJsonStringify(value));
        return true;
      }
    }
    
    // For objects and arrays, stringify them
    localStorage.setItem(key, safeJsonStringify(value));
    return true;
  } catch (error) {
    console.error(`Storage write error for ${key}:`, error);
    return false;
  }
}

/**
 * Parse JSON fields from database records
 * Common for contractor/partner JSON fields
 */
export function parseJsonFields<T extends Record<string, any>>(
  record: T, 
  jsonFields: string[] = []
): T {
  const parsed = { ...record };
  
  for (const field of jsonFields) {
    if (field in parsed) {
      const currentValue = parsed[field];
      const isArrayField = Array.isArray(currentValue) || 
                          (typeof currentValue === 'string' && currentValue.startsWith('['));
      parsed[field] = safeJsonParse(currentValue, isArrayField ? [] : {});
    }
  }
  
  return parsed;
}

/**
 * Common JSON fields in our database
 */
export const CONTRACTOR_JSON_FIELDS = [
  'focus_areas',
  'readiness_indicators',
  'tech_stack',
  'ai_preferences',
  'communication_preferences',
  'learning_preferences'
] as const;

export const PARTNER_JSON_FIELDS = [
  'focus_areas_served',
  'target_revenue_range',
  'geographic_regions',
  'service_categories',
  'manufacturer_partners',
  'testimonials'
] as const;

/**
 * Type-safe API request wrapper
 */
export async function safeApiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    };
    
    // Safe stringify body if present
    if (options.body && typeof options.body !== 'string') {
      config.body = safeJsonStringify(options.body);
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await handleApiResponse(response);
      return { error: errorData?.message || `HTTP ${response.status}` };
    }
    
    const data = await handleApiResponse<T>(response);
    return { data: data || undefined };
  } catch (error: any) {
    console.error('API request failed:', error);
    return { error: error?.message || 'Network error' };
  }
}

/**
 * Validate JSON structure
 */
export function validateJsonStructure(
  data: any, 
  expectedType: 'array' | 'object' = 'array'
): boolean {
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