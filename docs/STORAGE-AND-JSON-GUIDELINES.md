# 🔴 CRITICAL: Storage and JSON Guidelines for TPX Development

## ⚠️ MANDATORY READING FOR ALL DEVELOPERS

This document contains **CRITICAL** patterns that MUST be followed when working with localStorage, JSON data, or API responses in the TPX system. Failure to follow these guidelines WILL cause runtime errors.

---

## 🚨 GOLDEN RULES - NEVER VIOLATE THESE

### Rule 1: ALWAYS Use Storage Helpers
```typescript
// ❌ NEVER DO THIS
localStorage.setItem('userData', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('userData'));

// ✅ ALWAYS DO THIS
import { setToStorage, getFromStorage } from '@/utils/jsonHelpers';
setToStorage('userData', data);
const data = getFromStorage('userData');
```

### Rule 2: NEVER Double-Stringify
```typescript
// ❌ NEVER DO THIS
setToStorage('partnerInfo', JSON.stringify(partner));
setToStorage('userData', safeJsonStringify(userData));

// ✅ ALWAYS DO THIS
setToStorage('partnerInfo', partner);  // Helper handles stringification
setToStorage('userData', userData);
```

### Rule 3: ALWAYS Use Safe JSON Helpers
```typescript
// ❌ NEVER DO THIS
const parsed = JSON.parse(responseData);
const stringified = JSON.stringify(objectData);

// ✅ ALWAYS DO THIS
import { safeJsonParse, safeJsonStringify } from '@/utils/jsonHelpers';
const parsed = safeJsonParse(responseData, defaultValue);
const stringified = safeJsonStringify(objectData);
```

### Rule 4: ALWAYS Handle API Responses Safely
```typescript
// ❌ NEVER DO THIS
const data = await response.json();

// ✅ ALWAYS DO THIS
import { handleApiResponse } from '@/utils/jsonHelpers';
const data = await handleApiResponse(response);
```

---

## 📋 DEVELOPER CHECKLIST FOR NEW COMPONENTS

When creating ANY new component that handles data:

### 1. Import Requirements
```typescript
// REQUIRED imports for any component handling data
import { 
  safeJsonParse, 
  safeJsonStringify, 
  handleApiResponse, 
  getFromStorage, 
  setToStorage 
} from '@/utils/jsonHelpers';
```

### 2. Storage Naming Conventions

#### Authentication & Tokens
- **Pattern**: `*Token`, `*_token`
- **Examples**: `authToken`, `adminToken`, `partnerToken`, `access_token`
- **Storage**: Plain string (NO JSON parsing)

#### Timestamps
- **Pattern**: `*Timestamp`, `*_timestamp`, `*_date`
- **Examples**: `authTokenTimestamp`, `last_login_timestamp`, `created_date`
- **Storage**: Plain string or number

#### IDs and UUIDs
- **Pattern**: `*_id`, `*_uuid`, `*Id`
- **Examples**: `user_id`, `session_uuid`, `partnerId`
- **Storage**: Plain string

#### Complex Data
- **Pattern**: `*_data`, `*Info`, `*_session`, `*_profile`
- **Examples**: `userData`, `partnerInfo`, `contractor_session`
- **Storage**: JSON object (automatically stringified)

### 3. API Integration Pattern
```typescript
// Standard API call pattern
const fetchData = async () => {
  try {
    const response = await fetch('/api/endpoint');
    
    // ✅ Safe response handling
    const data = await handleApiResponse(response);
    
    if (data) {
      // ✅ Safe storage
      setToStorage('cachedData', data);
    }
  } catch (error) {
    console.error('API Error:', error);
    // ✅ Safe fallback retrieval
    const cached = getFromStorage('cachedData', []);
    return cached;
  }
};
```

### 4. Form Data Handling
```typescript
// Standard form submission pattern
const handleSubmit = async (formData: any) => {
  // ✅ Safe stringification for API
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // ✅ Safe token retrieval
      'Authorization': `Bearer ${getFromStorage('authToken')}`
    },
    // ✅ Safe stringification
    body: safeJsonStringify(formData)
  });
  
  // ✅ Safe response parsing
  const result = await handleApiResponse(response);
  
  if (result.success) {
    // ✅ Safe storage of result
    setToStorage('lastSubmission', result);
  }
};
```

### 5. Database Field Parsing
```typescript
// Standard database record handling
const processRecord = (record: any) => {
  return {
    ...record,
    // ✅ Safe parsing of JSON fields
    focus_areas: safeJsonParse(record.focus_areas, []),
    tech_stack: safeJsonParse(record.tech_stack, {}),
    preferences: safeJsonParse(record.preferences, {})
  };
};
```

---

## 🎯 COMMON PATTERNS BY FEATURE

### User Authentication
```typescript
// Login success
setToStorage('authToken', response.token);  // Plain string
setToStorage('authTokenTimestamp', Date.now());  // Number as string
setToStorage('userInfo', response.user);  // Object (auto-stringified)

// Logout
localStorage.removeItem('authToken');
localStorage.removeItem('authTokenTimestamp');
localStorage.removeItem('userInfo');

// Check auth
const token = getFromStorage('authToken');  // Returns string
const userInfo = getFromStorage('userInfo', {});  // Returns parsed object
```

### Partner Management
```typescript
// Store partner data
setToStorage('partnerInfo', partnerData);  // Object
setToStorage('partner_id', partner.id);  // String ID
setToStorage('partnerToken', token);  // JWT string

// Retrieve partner data
const partner = getFromStorage('partnerInfo', null);
const partnerId = getFromStorage('partner_id');
```

### Contractor Flow
```typescript
// Session management
setToStorage('contractor_session', {
  step: currentStep,
  data: formData,
  timestamp: Date.now()
});

// Retrieve session
const session = getFromStorage('contractor_session', {
  step: 1,
  data: {},
  timestamp: null
});
```

---

## 🔧 BACKEND PATTERNS (Node.js)

### Module System
```javascript
// ✅ BACKEND: Always use CommonJS
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// ❌ NEVER use ES6 imports in backend
import { safeJsonParse } from '../utils/jsonHelpers';  // WILL FAIL
```

### Database Operations
```javascript
// Safe JSON field handling in queries
const result = await query(`
  INSERT INTO partners (company_name, focus_areas_served)
  VALUES ($1, $2)
`, [
  companyName,
  safeJsonStringify(focusAreas)  // Safe stringification for JSONB
]);

// Safe parsing of results
const partners = result.rows.map(row => ({
  ...row,
  focus_areas_served: safeJsonParse(row.focus_areas_served, [])
}));
```

---

## 🐛 DEBUGGING GUIDE

### Common Errors and Solutions

#### "Maximum call stack size exceeded"
**Cause**: Recursive function calls in JSON helpers
**Solution**: Ensure using native `JSON.parse()` not `safeJsonParse()` inside helpers

#### "Unexpected token e in JSON"
**Cause**: Trying to parse a JWT token as JSON
**Solution**: Use `getFromStorage()` which handles tokens automatically

#### "Cannot read property of null"
**Cause**: Missing fallback value in parsing
**Solution**: Always provide fallback: `safeJsonParse(data, [])`

#### "SyntaxError: Cannot use import statement"
**Cause**: Using ES6 imports in Node.js backend
**Solution**: Use `require()` in backend files

---

## 📊 TESTING CHECKLIST

Before deploying ANY feature:

- [ ] All `JSON.parse()` replaced with `safeJsonParse()`
- [ ] All `JSON.stringify()` replaced with `safeJsonStringify()`
- [ ] All `localStorage.getItem()` replaced with `getFromStorage()`
- [ ] All `localStorage.setItem()` replaced with `setToStorage()`
- [ ] All `.json()` calls replaced with `handleApiResponse()`
- [ ] No double-stringification (check for `stringify` before `setToStorage`)
- [ ] Proper fallback values provided for all parsing
- [ ] Backend uses `require()`, Frontend uses `import`

---

## 🚀 QUICK START TEMPLATE

```typescript
// New Component Template
import React, { useState, useEffect } from 'react';
import { 
  safeJsonParse, 
  safeJsonStringify, 
  handleApiResponse, 
  getFromStorage, 
  setToStorage 
} from '@/utils/jsonHelpers';

export const MyComponent = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Check for cached data
    const cached = getFromStorage('myComponentData', null);
    if (cached) {
      setData(cached);
      return;
    }
    
    // Fetch fresh data
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const token = getFromStorage('authToken');
      const response = await fetch('/api/my-endpoint', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await handleApiResponse(response);
      if (result) {
        setData(result);
        setToStorage('myComponentData', result);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return <div>{/* Component UI */}</div>;
};
```

---

## 📚 REFERENCES

- JSON Helpers Location:
  - Frontend: `/tpe-front-end/src/utils/jsonHelpers.ts`
  - Backend: `/tpe-backend/src/utils/jsonHelpers.js`
- Migration Guide: `JSON-SAFETY-MIGRATION-TRACKER.md`
- Special Cases: `JSON-MIGRATION-SPECIAL-CASES.md`
- Module Syntax: `JSON-MIGRATION-SYNTAX-GUIDE.md`

---

## ⚠️ FINAL WARNING

**NEVER SKIP THESE GUIDELINES**

Every JSON-related error in production can be traced back to not following these patterns. These are not suggestions - they are REQUIREMENTS for TPX development.

When in doubt:
1. Use the helpers
2. Check this guide
3. Test thoroughly
4. Never use raw JSON methods

---
Last Updated: September 13, 2025
Version: 1.0.0
Status: MANDATORY COMPLIANCE