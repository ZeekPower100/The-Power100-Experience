# 🚀 TPX Quick Reference - JSON & Storage

## ✅ COPY-PASTE IMPORTS

### Frontend (TypeScript/React)
```typescript
import { 
  safeJsonParse, 
  safeJsonStringify, 
  handleApiResponse, 
  getFromStorage, 
  setToStorage 
} from '@/utils/jsonHelpers';
```

### Backend (Node.js)
```javascript
const { 
  safeJsonParse, 
  safeJsonStringify 
} = require('../utils/jsonHelpers');
```

---

## ✅ COMMON PATTERNS

### 1. Store Auth Token
```typescript
// After login
setToStorage('authToken', response.token);
setToStorage('authTokenTimestamp', Date.now());

// Get token for API calls
const token = getFromStorage('authToken');
```

### 2. Store User/Partner Data
```typescript
// Store object (auto-stringified)
setToStorage('userInfo', userData);

// Retrieve object (auto-parsed)
const user = getFromStorage('userInfo', {});
```

### 3. API Call Pattern
```typescript
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${getFromStorage('authToken')}`
  }
});
const data = await handleApiResponse(response);
```

### 4. Form Submission
```typescript
const response = await fetch('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: safeJsonStringify(formData)  // Safe stringify
});
const result = await handleApiResponse(response);
```

### 5. Parse Database Fields
```typescript
// Backend
const partners = result.rows.map(row => ({
  ...row,
  focus_areas: safeJsonParse(row.focus_areas, [])
}));
```

---

## ❌ NEVER DO THIS

```typescript
// ❌ WRONG - Raw JSON methods
JSON.parse(data)
JSON.stringify(data)

// ❌ WRONG - Direct localStorage
localStorage.getItem('key')
localStorage.setItem('key', value)

// ❌ WRONG - Double stringify
setToStorage('data', JSON.stringify(data))
setToStorage('data', safeJsonStringify(data))

// ❌ WRONG - No fallback
safeJsonParse(data)  // Missing fallback

// ❌ WRONG - Backend using import
import { helpers } from '../utils';  // Backend must use require
```

---

## ✅ ALWAYS DO THIS

```typescript
// ✅ RIGHT - Safe methods
safeJsonParse(data, [])
safeJsonStringify(data)

// ✅ RIGHT - Storage helpers
getFromStorage('key', defaultValue)
setToStorage('key', value)

// ✅ RIGHT - Direct object storage
setToStorage('data', data)  // Helper handles stringify

// ✅ RIGHT - With fallback
safeJsonParse(data, [])  // Array fallback
safeJsonParse(data, {})  // Object fallback

// ✅ RIGHT - Backend using require
const { helpers } = require('../utils');
```

---

## 🎯 NAMING CONVENTIONS

| Type | Pattern | Examples | Storage |
|------|---------|----------|---------|
| Tokens | `*Token`, `*_token` | `authToken`, `partnerToken` | Plain string |
| Timestamps | `*Timestamp`, `*_timestamp` | `authTokenTimestamp` | Plain string |
| IDs | `*_id`, `*Id`, `*_uuid` | `user_id`, `partnerId` | Plain string |
| Data Objects | `*Info`, `*_data` | `userInfo`, `partner_data` | JSON object |

---

## 🐛 QUICK FIXES

### "Maximum call stack exceeded"
```typescript
// Check jsonHelpers.ts - should use JSON.parse not safeJsonParse internally
```

### "Unexpected token e in JSON"
```typescript
// JWT token being parsed as JSON
// Solution: Use getFromStorage() which handles tokens
```

### "Cannot use import statement"
```javascript
// Backend file using ES6
// Solution: Use require() in backend
```

### Double-encoded JSON
```typescript
// Before: setToStorage('data', JSON.stringify(obj))
// After: setToStorage('data', obj)
```

---

## 📍 File Locations

- **Frontend Helpers**: `/tpe-front-end/src/utils/jsonHelpers.ts`
- **Backend Helpers**: `/tpe-backend/src/utils/jsonHelpers.js`
- **Full Guide**: `/docs/STORAGE-AND-JSON-GUIDELINES.md`

---

**Remember: When in doubt, use the helpers!**