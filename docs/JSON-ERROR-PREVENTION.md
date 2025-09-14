# JSON Error Prevention Guide
## Automatic Error-Proofing for JSON Operations

### 🎯 Quick Reference: The 4 Categories of JSON Errors

1. **Syntax Errors** - Malformed JSON (missing quotes, trailing commas)
2. **Wrong Data Type** - HTML/text instead of JSON  
3. **Double Parsing** - Already parsed object being parsed again
4. **Null/Undefined** - Empty or missing response

---

## 🛡️ Universal JSON Error-Proofing Pattern

### For Parsing JSON (Frontend & Backend)
```javascript
// Safe JSON Parser - Use this everywhere you parse JSON
function safeJsonParse(data, fallback = null) {
  try {
    // Category 4: Check if data exists
    if (!data) return fallback;
    
    // Category 3: Check if already parsed
    if (typeof data === 'object') return data;
    
    // Category 2: Only parse strings
    if (typeof data === 'string') {
      // Handle special case: "[object Object]" string
      if (data === '[object Object]') return fallback;
      
      return JSON.parse(data);
    }
    
    return fallback;
  } catch (error) {
    // Category 1: Catches malformed JSON
    console.error('JSON Parse Error:', error);
    return fallback;
  }
}
```

### For Sending JSON (API Requests)
```javascript
// Safe JSON Stringifier - Use before sending to APIs
function safeJsonStringify(data) {
  try {
    // Already a string? Return as-is
    if (typeof data === 'string') return data;
    
    // Null/undefined? Return empty object string
    if (!data) return '{}';
    
    // Object? Stringify it
    return JSON.stringify(data);
  } catch (error) {
    console.error('JSON Stringify Error:', error);
    return '{}';
  }
}
```

---

## 📋 Implementation Checklist

When adding/editing code with JSON operations, run through this checklist:

### ✅ API Response Handling
```javascript
// ❌ BAD - No error handling
const data = await response.json();

// ✅ GOOD - Full error handling
async function handleApiResponse(response) {
  // Check response exists
  if (!response) return null;
  
  // Check content type
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }
  
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Response parsing failed:', error);
    return null;
  }
}
```

### ✅ Database JSON Fields
```javascript
// ❌ BAD - Direct parsing
const focusAreas = JSON.parse(contractor.focus_areas);

// ✅ GOOD - Safe parsing with fallback
const focusAreas = safeJsonParse(contractor.focus_areas, []);
```

### ✅ LocalStorage Operations
```javascript
// ❌ BAD - No error handling
const session = JSON.parse(localStorage.getItem('session'));

// ✅ GOOD - Protected parsing
function getFromStorage(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return safeJsonParse(item, fallback);
  } catch (error) {
    console.error(`Storage read error for ${key}:`, error);
    return fallback;
  }
}
```

### ✅ Request Body Preparation
```javascript
// ❌ BAD - Assuming data format
fetch('/api/endpoint', {
  body: JSON.stringify(data)
});

// ✅ GOOD - Safe stringification
fetch('/api/endpoint', {
  headers: { 'Content-Type': 'application/json' },
  body: safeJsonStringify(data)
});
```

---

## 🔍 Common Patterns in Our Codebase

### Pattern 1: Partner/Contractor JSON Fields
```javascript
// These fields are often stored as JSON strings in the database:
// - focus_areas_served
// - target_revenue_range
// - geographic_regions
// - service_categories
// - readiness_indicators

// Always parse them safely:
const partner = {
  ...rawPartner,
  focus_areas_served: safeJsonParse(rawPartner.focus_areas_served, []),
  target_revenue_range: safeJsonParse(rawPartner.target_revenue_range, []),
  geographic_regions: safeJsonParse(rawPartner.geographic_regions, []),
  service_categories: safeJsonParse(rawPartner.service_categories, [])
};
```

### Pattern 2: API Request/Response
```javascript
// In api.ts or similar files
async function apiRequest(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  };
  
  // Safe stringify for body
  if (options.body && typeof options.body !== 'string') {
    config.body = safeJsonStringify(options.body);
  }
  
  const response = await fetch(endpoint, config);
  
  // Safe parse response
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  
  return handleApiResponse(response);
}
```

### Pattern 3: Event Data & Metadata
```javascript
// AI tracking, analytics, etc.
const eventData = {
  event_type: 'user_action',
  event_data: safeJsonStringify({
    action: 'click',
    target: 'button',
    metadata: complexObject
  })
};
```

---

## 🚨 Red Flags to Watch For

When reviewing code, look for these patterns that need JSON error-proofing:

1. **Direct `JSON.parse()` without try/catch**
2. **`.json()` on fetch responses without checking content-type**
3. **JSON operations on database fields without validation**
4. **LocalStorage/SessionStorage operations without error handling**
5. **Assuming data type without checking**
6. **No fallback values for failed parsing**

---

## 🎯 Quick Implementation Guide

### Step 1: Add Utility Functions
Create `src/utils/jsonHelpers.ts` (or `.js`) in both frontend and backend:

```javascript
export const safeJsonParse = (data, fallback = null) => {
  // Implementation from above
};

export const safeJsonStringify = (data) => {
  // Implementation from above
};

export const handleApiResponse = async (response) => {
  // Implementation from above
};
```

### Step 2: Import Where Needed
```javascript
import { safeJsonParse, safeJsonStringify } from '@/utils/jsonHelpers';
```

### Step 3: Replace Unsafe Operations
Search for these patterns and replace:
- `JSON.parse(` → `safeJsonParse(`
- `JSON.stringify(` → `safeJsonStringify(`
- `.json()` → `handleApiResponse(response)`

---

## 📊 Testing Your Implementation

Test these scenarios for every JSON operation:

1. **Null/undefined input**
2. **Empty string input**
3. **Already parsed object**
4. **Malformed JSON string**
5. **HTML response instead of JSON**
6. **[object Object] string**
7. **Valid JSON**

---

## 🔄 Automated Checks

Add this ESLint rule to catch unsafe JSON operations:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='JSON'][callee.property.name='parse']:not([parent.type='TryStatement'])",
        "message": "Use safeJsonParse() instead of JSON.parse()"
      }
    ]
  }
}
```

---

## 📝 Copy-Paste Templates

### For New API Endpoints
```javascript
// Backend controller
async function handleRequest(req, res) {
  try {
    const data = safeJsonParse(req.body, {});
    // Process data
    res.json({ success: true, data: processedData });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

### For Frontend API Calls
```javascript
// Frontend API service
async function fetchData(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await handleApiResponse(response);
    return data || { error: 'Invalid response' };
  } catch (error) {
    console.error('API Error:', error);
    return { error: error.message };
  }
}
```

---

## ✅ Final Checklist

Before committing code with JSON operations:

- [ ] All `JSON.parse()` wrapped in try/catch or using `safeJsonParse()`
- [ ] All `JSON.stringify()` checked for circular refs or using `safeJsonStringify()`
- [ ] All `.json()` responses check content-type first
- [ ] All JSON operations have fallback values
- [ ] Database JSON fields use safe parsing
- [ ] LocalStorage operations are protected
- [ ] API responses handle non-JSON responses
- [ ] Test with null, undefined, and malformed data

---

## 🎯 Remember: 90% of JSON errors are preventable with these patterns!