# 🔄 JSON Field Handling Guide

## Overview

SQLite stores JSON arrays as strings, but frontend components expect actual JavaScript arrays. This mismatch has caused multiple runtime errors throughout development. This guide provides standardized solutions.

---

## 🚨 Common Error Patterns

### **Error Symptoms:**
```javascript
TypeError: contractor.focus_areas.map is not a function
TypeError: partner.target_revenue_range.map is not a function
Cannot read property 'length' of undefined
```

### **Root Cause:**
- **Database**: Stores `["value1", "value2"]` as a JSON string
- **Frontend**: Expects `["value1", "value2"]` as an actual array
- **Missing step**: Parsing JSON string to JavaScript array

---

## 📊 JSON Fields in Our Database

### **Contractors Table:**
- `focus_areas` - Array of business focus areas
- `services_offered` - Array of service types
- `readiness_indicators` - Array of readiness flags

### **Strategic Partners Table:**
- `focus_areas_served` - Array of focus areas they serve
- `target_revenue_range` - Array of revenue ranges they target
- `geographic_regions` - Array of regions they serve
- `key_differentiators` - Array of unique selling points
- `client_testimonials` - Array of testimonial objects

### **Other Tables:**
- Any field that stores arrays or objects as JSON

---

## ✅ Standard Solution Pattern

Use this pattern **every time** you render JSON array fields:

```tsx
// ✅ CORRECT - Safe JSON parsing pattern
{(() => {
  // Parse JSON field safely
  let parsedArray: string[] = [];
  try {
    if (data.json_field) {
      if (typeof data.json_field === 'string') {
        parsedArray = JSON.parse(data.json_field);
      } else if (Array.isArray(data.json_field)) {
        parsedArray = data.json_field;
      }
    }
  } catch (e) {
    parsedArray = []; // Fallback to empty array
  }
  
  return parsedArray.length > 0 && (
    <div>
      {parsedArray.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </div>
  );
})()}
```

### **Why This Pattern Works:**
1. **Handles strings**: Parses JSON strings from database
2. **Handles arrays**: Uses arrays that are already parsed
3. **Handles null/undefined**: Defaults to empty array
4. **Handles invalid JSON**: Try/catch prevents crashes
5. **Type safe**: TypeScript friendly

---

## 🛠️ Reusable Utility Functions

Create these utilities for consistent JSON handling:

### **Frontend Utility (`src/utils/jsonUtils.ts`):**

```typescript
/**
 * Safely parse a JSON field that might be a string or already parsed
 */
export function parseJsonArray<T = string>(field: unknown): T[] {
  if (!field) return [];
  
  try {
    if (typeof field === 'string') {
      return JSON.parse(field);
    } else if (Array.isArray(field)) {
      return field;
    }
  } catch (e) {
    console.warn('Failed to parse JSON field:', field);
  }
  
  return [];
}

/**
 * Safely parse a JSON object field
 */
export function parseJsonObject<T = Record<string, any>>(field: unknown): T | null {
  if (!field) return null;
  
  try {
    if (typeof field === 'string') {
      return JSON.parse(field);
    } else if (typeof field === 'object' && field !== null) {
      return field as T;
    }
  } catch (e) {
    console.warn('Failed to parse JSON object:', field);
  }
  
  return null;
}

/**
 * Component helper for rendering JSON arrays
 */
export function renderJsonArray(
  field: unknown,
  renderItem: (item: string, index: number) => React.ReactNode
): React.ReactNode {
  const items = parseJsonArray(field);
  return items.length > 0 ? items.map(renderItem) : null;
}
```

### **Usage Examples:**

```tsx
import { parseJsonArray, renderJsonArray } from '@/utils/jsonUtils';

// Simple parsing
const focusAreas = parseJsonArray(contractor.focus_areas);

// Rendering with helper
{renderJsonArray(contractor.focus_areas, (area, index) => (
  <Badge key={index} variant="outline">{area}</Badge>
))}

// Manual rendering
{(() => {
  const areas = parseJsonArray(contractor.focus_areas);
  return areas.length > 0 && (
    <div>
      {areas.map((area, index) => (
        <Badge key={index}>{area}</Badge>
      ))}
    </div>
  );
})()}
```

---

## 🔧 Backend Consistency

### **Controller Pattern:**
Ensure backend controllers parse JSON fields consistently:

```javascript
// In controller responses, parse JSON fields
const parsedPartners = results.rows.map(partner => ({
  ...partner,
  focus_areas_served: typeof partner.focus_areas_served === 'string' 
    ? JSON.parse(partner.focus_areas_served || '[]')
    : partner.focus_areas_served || [],
  target_revenue_range: typeof partner.target_revenue_range === 'string'
    ? JSON.parse(partner.target_revenue_range || '[]') 
    : partner.target_revenue_range || [],
  geographic_regions: typeof partner.geographic_regions === 'string'
    ? JSON.parse(partner.geographic_regions || '[]')
    : partner.geographic_regions || []
}));
```

### **Database Utility:**
```javascript
// Helper function for parsing JSON fields in backend
function parseJsonField(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch (e) {
    console.warn('Failed to parse JSON field:', field);
    return defaultValue;
  }
}
```

---

## 🎯 Implementation Checklist

When working with JSON fields, always check:

### **Frontend Components:**
- [ ] Use safe parsing pattern for all JSON arrays
- [ ] Handle null/undefined cases
- [ ] Include try/catch for invalid JSON
- [ ] Provide fallback empty arrays
- [ ] Type properly with TypeScript

### **Backend Controllers:**
- [ ] Parse JSON strings to arrays in responses
- [ ] Handle edge cases (null, invalid JSON)
- [ ] Consistent parsing across all endpoints
- [ ] Document which fields need parsing

### **Testing:**
- [ ] Test with valid JSON data
- [ ] Test with null/undefined data  
- [ ] Test with invalid JSON strings
- [ ] Test with already-parsed arrays
- [ ] Test empty arrays

---

## 🚫 Anti-Patterns (DON'T DO THIS)

```tsx
// ❌ WRONG - Will crash if data.field is a string
{data.field.map(item => <span>{item}</span>)}

// ❌ WRONG - Doesn't handle null/undefined
{JSON.parse(data.field).map(item => <span>{item}</span>)}

// ❌ WRONG - No error handling
{data.field && data.field.map(item => <span>{item}</span>)}

// ❌ WRONG - Assumes field is always an array  
{data.field.length > 0 && data.field.map(item => <span>{item}</span>)}
```

---

## 🔍 Debugging JSON Field Issues

### **Quick Debug Commands:**
```javascript
// In browser console, check the actual data type
console.log('Type:', typeof contractor.focus_areas);
console.log('Value:', contractor.focus_areas);
console.log('Is Array:', Array.isArray(contractor.focus_areas));

// Try parsing manually
try {
  const parsed = JSON.parse(contractor.focus_areas);
  console.log('Parsed:', parsed);
} catch (e) {
  console.log('Parse failed:', e);
}
```

### **Common Data States:**
- `"[\"item1\",\"item2\"]"` - JSON string (needs parsing)
- `["item1", "item2"]` - Already parsed array (use directly)
- `null` - Null value (default to empty array)
- `undefined` - Missing field (default to empty array)
- `""` - Empty string (default to empty array)
- `"invalid json"` - Invalid JSON (catch error, default to empty array)

---

## 📚 Related Files

This pattern is used in:
- `src/components/admin/SearchResults.tsx` - Search result rendering
- `src/components/admin/PartnerForm.tsx` - Partner management  
- `src/app/admindashboard/page.tsx` - Dashboard partner display
- All components that display JSON array fields

---

## 🎯 Future Prevention

1. **Use utility functions** for all JSON parsing
2. **Create reusable components** for JSON array rendering
3. **Add this check** to code review process
4. **Test with real database data** early
5. **Document JSON fields** in data models

This standardized approach will prevent 90% of JSON-related runtime errors in future development.