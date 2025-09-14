# Error Prevention Quick Start Guide
## Prevent 90% of Runtime Errors in 2 Minutes

### 🚀 Quick Setup

#### 1. Install Dependencies (if needed)
```bash
npm install --save-dev colors
```

#### 2. Run Error Checks
```bash
# Check everything
node tools/combined-error-check.js

# Check JSON only
node tools/json-error-check.js

# Check arrays only  
node tools/array-render-check.js
```

---

## 🛡️ The Two Universal Patterns

### Pattern 1: Safe JSON (Prevents parsing errors)
```javascript
// Frontend
import { safeJsonParse, safeJsonStringify } from '@/utils/jsonHelpers';

// Backend
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// Usage
const data = safeJsonParse(jsonString, []); // With fallback
const json = safeJsonStringify(object);     // Safe stringify
```

### Pattern 2: Safe Arrays (Prevents rendering errors)
```tsx
import { SafeList, ensureArray } from '@/utils/arrayHelpers';

// The universal pattern
{Array.isArray(items) && items.length > 0 ? (
  items.map(item => (
    <div key={item.id || index}>{item.name}</div>
  ))
) : (
  <EmptyState />
)}

// Or use the component
<SafeList 
  data={items} 
  renderItem={(item) => <div>{item.name}</div>}
  emptyState={<Empty />}
/>
```

---

## 📝 VS Code Snippets

### JSON Operations
- `safejson` - Safe JSON parse
- `safeapi` - Safe API call
- `safeget` - Safe localStorage get
- `safeset` - Safe localStorage set

### Array Rendering
- `safemap` - Safe array mapping
- `safelist` - SafeList component
- `arrayguard` - Array validation
- `nestedarray` - Nested arrays

---

## 🔍 Common TPE Fields That Need Protection

### JSON Fields (Often stored as strings)
```javascript
// Contractor
const CONTRACTOR_JSON = [
  'focus_areas',
  'readiness_indicators', 
  'tech_stack',
  'ai_preferences'
];

// Partner
const PARTNER_JSON = [
  'focus_areas_served',
  'target_revenue_range',
  'geographic_regions',
  'service_categories'
];

// Always parse safely
const focusAreas = safeJsonParse(contractor.focus_areas, []);
```

### Array Fields (Need mapping)
```tsx
// Always check and map
{Array.isArray(partner.testimonials) && 
  partner.testimonials.map(t => (
    <Card key={t.id}>{t.text}</Card>
  ))
}
```

---

## ⚡ Quick Fixes for Common Errors

### Error: "Objects are not valid as a React child"
```tsx
// ❌ Wrong
<div>{userData}</div>

// ✅ Right
<div>{userData.name}</div>
// OR
<div>{userData.map(u => <span key={u.id}>{u.name}</span>)}</div>
```

### Error: "Cannot read property 'map' of undefined"
```tsx
// ❌ Wrong
{items.map(...)}

// ✅ Right
{items?.map(...)}
// OR BETTER
{Array.isArray(items) && items.map(...)}
```

### Error: "Unexpected token in JSON"
```javascript
// ❌ Wrong
const data = JSON.parse(response);

// ✅ Right
const data = safeJsonParse(response, {});
```

### Error: "Each child should have unique key"
```tsx
// ❌ Wrong
{items.map(item => <div>{item}</div>)}

// ✅ Right
{items.map((item, index) => (
  <div key={item.id || index}>{item}</div>
))}
```

---

## 🎯 Pre-Commit Checklist

Before every commit, check:

```bash
# Run this command
node tools/combined-error-check.js
```

If it finds issues:
1. Check the line numbers mentioned
2. Apply the suggested fix
3. Run the check again
4. Commit when clean!

---

## 📚 Full Documentation

- **JSON Errors**: [docs/JSON-ERROR-PREVENTION.md](./JSON-ERROR-PREVENTION.md)
- **Array Errors**: [docs/ARRAY-RENDERING-PREVENTION.md](./ARRAY-RENDERING-PREVENTION.md)

---

## 💡 Pro Tips

1. **Use the helpers everywhere** - They handle edge cases automatically
2. **Check before render** - Always validate data type before using it
3. **Provide fallbacks** - Never assume data exists
4. **Run checks often** - Catch errors before they reach production

---

## 🚨 If You Get Stuck

```javascript
// For any JSON operation
const safe = safeJsonParse(anyData, defaultValue);

// For any array rendering
{Array.isArray(anyData) && anyData.length > 0 ? (
  anyData.map((item, i) => <div key={i}>{String(item)}</div>)
) : (
  <div>Empty</div>
)}
```

These two patterns solve 90% of runtime errors!