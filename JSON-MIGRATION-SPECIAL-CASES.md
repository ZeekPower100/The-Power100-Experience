# JSON Migration Special Cases Guide

## Overview
During the JSON safety migration, we discovered several special cases that require careful handling to prevent runtime errors. This document outlines these cases and how they're handled.

## Special Cases Identified

### 1. JWT Tokens (Authentication)
**Pattern**: Values starting with `ey` (e.g., `eyJhbGciOi...`)
**Keys**: `authToken`, `adminToken`, `partnerToken`, `*Token`, `*_token`
**Issue**: JWT tokens are base64-encoded strings, NOT JSON
**Solution**: Store and retrieve as plain strings without JSON parsing

### 2. Timestamps
**Pattern**: Numeric timestamps or date strings
**Keys**: `authTokenTimestamp`, `*Timestamp`, `*_timestamp`
**Issue**: Timestamps are numbers/strings, not JSON objects
**Solution**: Store and retrieve as plain strings

### 3. Simple IDs and UUIDs
**Pattern**: UUID strings or simple ID values
**Keys**: `partner_application_id`, `delegate_id`, `*_id`, `*_uuid`
**Issue**: These are plain strings, not JSON
**Solution**: Store and retrieve without JSON parsing

### 4. Double Stringification
**Pattern**: Code calling `JSON.stringify()` or `safeJsonStringify()` before `setToStorage()`
**Issue**: Causes double-encoding, making data unreadable
**Solution**: Let `setToStorage()` handle stringification automatically

### 5. Already-Stringified JSON
**Pattern**: Values that are already valid JSON strings
**Issue**: Re-stringifying valid JSON creates escaped strings
**Solution**: Detect valid JSON strings and store as-is

## Implementation in jsonHelpers.ts

### Detection Logic
```typescript
// In getFromStorage()
const nonJsonKeys = [
  'authToken', 'adminToken', 'partnerToken',  // JWT tokens
  'authTokenTimestamp',                        // Timestamps
  'partner_application_id', 'delegate_id'      // Simple IDs
];

// Check multiple patterns:
if (nonJsonKeys.includes(key) || 
    key.endsWith('Token') || 
    key.endsWith('_token') ||
    key.endsWith('Timestamp') ||
    key.endsWith('_id') ||
    key.endsWith('_uuid')) {
  return item as T;  // Return without parsing
}

// JWT token detection by content
if (typeof item === 'string' && item.startsWith('ey')) {
  return item as T;  // It's a JWT token
}
```

### Storage Logic
```typescript
// In setToStorage()
// 1. Check if it's a special key that shouldn't be stringified
// 2. Check if value is already valid JSON (avoid double-stringification)
// 3. Only stringify objects and arrays
```

## Common Mistakes to Avoid

### ❌ DON'T: Double-stringify
```typescript
// WRONG - causes double encoding
setToStorage('partnerInfo', JSON.stringify(data.partner));
setToStorage('userData', safeJsonStringify(userData));
```

### ✅ DO: Let setToStorage handle it
```typescript
// RIGHT - setToStorage handles stringification
setToStorage('partnerInfo', data.partner);
setToStorage('userData', userData);
```

### ❌ DON'T: Parse JWT tokens
```typescript
// WRONG - JWT tokens aren't JSON
const token = JSON.parse(localStorage.getItem('authToken'));
```

### ✅ DO: Use as plain strings
```typescript
// RIGHT - JWT tokens are strings
const token = getFromStorage('authToken');  // Returns plain string
```

## Testing Checklist

When adding new localStorage usage:

1. **Is it a token or authentication key?**
   - Store as plain string
   - Name it with 'Token' or '_token' suffix

2. **Is it a timestamp or ID?**
   - Store as plain string
   - Use appropriate suffix: '_timestamp', '_id', '_uuid'

3. **Is it an object or array?**
   - Pass the object directly to `setToStorage()`
   - DON'T pre-stringify it

4. **Is it already a JSON string?**
   - Pass it directly to `setToStorage()`
   - The helper will detect and handle it

## Migration Statistics

- **Total Files Migrated**: 65+ files
- **Total Changes**: 399+ unsafe operations fixed
- **Special Cases Handled**: 5 major patterns
- **Errors Prevented**: 
  - Infinite recursion in JSON helpers
  - JWT token parsing errors
  - Double-stringification issues
  - Timestamp parsing errors

## Future Considerations

1. **New Authentication Methods**: If adding OAuth or other auth, ensure tokens are handled as strings
2. **Binary Data**: If storing base64 images or files, treat as strings
3. **Encrypted Data**: Encrypted strings should not be JSON parsed
4. **API Keys**: Should be stored as plain strings

## References

- Main migration tracker: `JSON-SAFETY-MIGRATION-TRACKER.md`
- Module syntax guide: `JSON-MIGRATION-SYNTAX-GUIDE.md`
- JSON helpers: 
  - Backend: `tpe-backend/src/utils/jsonHelpers.js`
  - Frontend: `tpe-front-end/src/utils/jsonHelpers.ts`

---
Last Updated: September 13, 2025