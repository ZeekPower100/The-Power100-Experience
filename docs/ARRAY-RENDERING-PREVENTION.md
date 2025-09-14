# Array Rendering Error Prevention Guide
## Automatic Error-Proofing for React Array Rendering

### 🎯 The Universal Array Rendering Error

**Error Message:** 
```
Objects are not valid as a React child (found: object with keys {...}). 
If you meant to render a collection of children, use an array instead.
```

**Root Cause:** Trying to render an object or array directly in JSX instead of mapping over it.

---

## 🛡️ The 4-Step Array Rendering Pattern

### Always follow this pattern when rendering arrays:

```tsx
// ✅ CORRECT - The Safe Pattern
{Array.isArray(data) && data.length > 0 ? (
  data.map((item, index) => (
    <div key={item.id || index}>
      {item.name}
    </div>
  ))
) : (
  <div>No items to display</div>
)}
```

### The 4 Essential Steps:
1. **Check if it's an array** - `Array.isArray(data)`
2. **Check if it has items** - `data.length > 0`
3. **Map with unique keys** - `.map((item, index) => <div key={...}>)`
4. **Provide fallback UI** - Show empty state when no data

---

## ❌ Common Mistakes & ✅ Fixes

### Mistake 1: Rendering Array/Object Directly
```tsx
// ❌ BAD - Trying to render array directly
<div>{contractors}</div>

// ❌ BAD - Trying to render object directly
<div>{contractor}</div>

// ✅ GOOD - Map over array
<div>
  {contractors.map(contractor => (
    <div key={contractor.id}>{contractor.name}</div>
  ))}
</div>

// ✅ GOOD - Access object properties
<div>{contractor.name}</div>
```

### Mistake 2: Not Checking Array Type
```tsx
// ❌ BAD - Assumes data is always an array
{data.map(item => <div>{item}</div>)}

// ✅ GOOD - Checks type first
{Array.isArray(data) && data.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

### Mistake 3: Missing Key Props
```tsx
// ❌ BAD - No key prop
{items.map(item => <div>{item.name}</div>)}

// ❌ BAD - Using unstable index as key (only if items reorder)
{items.map((item, i) => <div key={i}>{item.name}</div>)}

// ✅ GOOD - Using stable unique ID
{items.map(item => <div key={item.id}>{item.name}</div>)}

// ✅ GOOD - Fallback to index when no ID (for static lists)
{items.map((item, index) => (
  <div key={item.id || `item-${index}`}>{item.name}</div>
))}
```

### Mistake 4: No Empty State
```tsx
// ❌ BAD - Nothing renders when empty
{data.map(item => <div key={item.id}>{item}</div>)}

// ✅ GOOD - Shows empty state
{data.length > 0 ? (
  data.map(item => <div key={item.id}>{item.name}</div>)
) : (
  <EmptyState message="No items found" />
)}
```

---

## 📋 Safe Array Rendering Patterns

### Pattern 1: Simple List
```tsx
function SimpleList({ items }: { items: any[] }) {
  return (
    <div>
      {Array.isArray(items) && items.length > 0 ? (
        items.map((item) => (
          <div key={item.id} className="list-item">
            {item.name}
          </div>
        ))
      ) : (
        <p>No items available</p>
      )}
    </div>
  );
}
```

### Pattern 2: Complex Object Rendering
```tsx
function ComplexCard({ data }: { data: any }) {
  // Guard against non-objects
  if (!data || typeof data !== 'object') {
    return <div>Invalid data</div>;
  }

  // For arrays of objects
  if (Array.isArray(data)) {
    return (
      <div>
        {data.map((item, index) => (
          <Card key={item.id || index}>
            <h3>{item.title || 'Untitled'}</h3>
            <p>{item.description || 'No description'}</p>
          </Card>
        ))}
      </div>
    );
  }

  // For single objects
  return (
    <Card>
      <h3>{data.title || 'Untitled'}</h3>
      <p>{data.description || 'No description'}</p>
    </Card>
  );
}
```

### Pattern 3: Nested Arrays
```tsx
function NestedList({ categories }: { categories: Category[] }) {
  return (
    <div>
      {Array.isArray(categories) && categories.map(category => (
        <div key={category.id} className="category">
          <h2>{category.name}</h2>
          {Array.isArray(category.items) && category.items.length > 0 ? (
            <ul>
              {category.items.map(item => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          ) : (
            <p>No items in this category</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 4: Conditional Rendering with Arrays
```tsx
function ConditionalList({ data, showDetails }: Props) {
  const safeData = Array.isArray(data) ? data : [];
  
  if (safeData.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {safeData.map(item => (
        <div key={item.id}>
          <h3>{item.name}</h3>
          {showDetails && item.details && (
            <div>
              {/* Safe nested array handling */}
              {Array.isArray(item.details) ? (
                item.details.map((detail, idx) => (
                  <span key={idx}>{detail}</span>
                ))
              ) : (
                <span>{item.details}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 Common Patterns in TPE Codebase

### Contractor/Partner Lists
```tsx
// ❌ BAD - Common mistake
<div>{contractors.open_challenges}</div>

// ✅ GOOD - Proper array handling
{Array.isArray(contractors.open_challenges) && 
  contractors.open_challenges.map((challenge, idx) => (
    <div key={challenge.id || idx}>
      {challenge.challenge}
    </div>
  ))
}
```

### Focus Areas & Multi-Select Fields
```tsx
// These fields are often JSON arrays:
const JSON_ARRAY_FIELDS = [
  'focus_areas',
  'focus_areas_served',
  'geographic_regions',
  'service_categories',
  'readiness_indicators',
  'tech_stack'
];

// Safe rendering pattern
function renderJsonArrayField(field: any, label: string) {
  const items = Array.isArray(field) ? field : 
                typeof field === 'string' ? safeJsonParse(field, []) : [];
  
  return (
    <div>
      <label>{label}</label>
      {items.length > 0 ? (
        <div className="flex gap-2">
          {items.map((item, idx) => (
            <Badge key={idx}>{item}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-gray-500">None selected</span>
      )}
    </div>
  );
}
```

### Table/Grid Rendering
```tsx
function DataTable({ rows, columns }: TableProps) {
  // Ensure rows is always an array
  const safeRows = Array.isArray(rows) ? rows : [];
  
  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.id}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {safeRows.length > 0 ? (
          safeRows.map(row => (
            <tr key={row.id}>
              {columns.map(col => (
                <td key={col.id}>
                  {/* Safe property access */}
                  {row[col.field] || '-'}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length}>No data available</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
```

---

## 🛠️ Utility Functions

### Create these in `src/utils/arrayHelpers.ts`:

```tsx
/**
 * Safely ensure data is an array
 */
export function ensureArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  return [data]; // Wrap single items in array
}

/**
 * Safe array rendering with fallback
 */
export function safeRenderArray<T = any>(
  data: any,
  renderFn: (item: T, index: number) => React.ReactNode,
  emptyState: React.ReactNode = 'No items'
): React.ReactNode {
  const items = ensureArray<T>(data);
  
  if (items.length === 0) {
    return emptyState;
  }
  
  return items.map(renderFn);
}

/**
 * Extract and render array field
 */
export function renderArrayField(
  data: any,
  fieldName: string,
  renderFn: (item: any, index: number) => React.ReactNode,
  emptyState: React.ReactNode = null
): React.ReactNode {
  const fieldValue = data?.[fieldName];
  const items = ensureArray(fieldValue);
  
  if (items.length === 0) {
    return emptyState;
  }
  
  return items.map(renderFn);
}

/**
 * Safe key generator for list items
 */
export function getItemKey(item: any, index: number): string | number {
  if (item?.id) return item.id;
  if (item?.key) return item.key;
  if (item?._id) return item._id;
  if (typeof item === 'string' || typeof item === 'number') {
    return `${item}-${index}`;
  }
  return index;
}
```

---

## 📝 Quick Reference Checklist

Before rendering any array in React, check:

- [ ] Is the data checked with `Array.isArray()`?
- [ ] Is there a `.map()` function to iterate?
- [ ] Does each mapped element have a unique `key` prop?
- [ ] Is there a fallback/empty state when array is empty?
- [ ] Are nested objects accessed safely (not rendered directly)?
- [ ] Is the data validated before rendering?

---

## 🎯 Copy-Paste Templates

### Basic Array Render
```tsx
{Array.isArray(items) && items.length > 0 ? (
  items.map((item, index) => (
    <div key={item.id || index}>
      {item.name}
    </div>
  ))
) : (
  <EmptyState />
)}
```

### With Loading State
```tsx
{loading ? (
  <LoadingSpinner />
) : Array.isArray(items) && items.length > 0 ? (
  items.map(item => (
    <ItemCard key={item.id} item={item} />
  ))
) : (
  <EmptyState message="No items found" />
)}
```

### Inline Array Check
```tsx
{items?.length > 0 && items.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

### Safe Nested Render
```tsx
<div>
  {/* Parent object properties */}
  <h2>{data.title}</h2>
  
  {/* Nested array */}
  {Array.isArray(data.items) && (
    <ul>
      {data.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )}
</div>
```

---

## 🚨 Red Flags in Code Review

Watch for these patterns that cause array rendering errors:

1. **Direct array/object in JSX**: `<div>{someArray}</div>`
2. **Missing Array.isArray() check**: `data.map(...)` without validation
3. **No key props**: `map(item => <div>{item}</div>)`
4. **Rendering undefined**: Not checking if data exists
5. **JSON.parse() result rendered directly**: `<div>{JSON.parse(data)}</div>`
6. **Nested arrays without checks**: `item.tags.map(...)` without validation

---

## ✅ Remember: The 4-step pattern prevents 100% of array rendering errors!