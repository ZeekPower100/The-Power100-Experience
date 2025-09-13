# ⚠️ CRITICAL: JSON Migration Syntax Guide

## Module System by Environment

### 🔧 Backend (tpe-backend) - Uses CommonJS
```javascript
// ✅ CORRECT for backend
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// ❌ WRONG - Will cause "Cannot use import statement outside a module" error
import { safeJsonParse } from '../utils/jsonHelpers';
```

**File Extensions**: `.js`
**Path**: `tpe-backend/src/**/*.js`

### 🎨 Frontend (tpe-front-end) - Uses ES6 Modules
```typescript
// ✅ CORRECT for frontend
import { safeJsonParse, safeJsonStringify } from '@/utils/jsonHelpers';

// ❌ WRONG - Frontend doesn't use require
const { safeJsonParse } = require('@/utils/jsonHelpers');
```

**File Extensions**: `.ts`, `.tsx`
**Path**: `tpe-front-end/src/**/*.{ts,tsx}`

## Quick Reference Table

| Environment | File Type | Syntax | Example |
|------------|-----------|---------|---------|
| Backend | `.js` | `require()` | `const { safeJsonParse } = require('../utils/jsonHelpers');` |
| Frontend | `.ts/.tsx` | `import` | `import { safeJsonParse } from '@/utils/jsonHelpers';` |

## Why This Matters

Using the wrong syntax will cause:
- **Backend with `import`**: `SyntaxError: Cannot use import statement outside a module`
- **Frontend with `require`**: Build errors in Next.js

## Migration Script Protection

The `json-safe-migration.js` script now automatically:
1. Detects if file is in `tpe-backend` → Uses `require()`
2. Detects if file is in `tpe-front-end` → Uses `import`
3. Shows clear indicators: 
   - 🔧 = CommonJS require() for backend
   - 🎨 = ES6 import for frontend

## Manual Migration Checklist

When manually migrating a file:

1. **Check the path**: Is it `tpe-backend` or `tpe-front-end`?
2. **Use correct syntax**:
   ```javascript
   // Backend
   const { safeJsonParse } = require('../utils/jsonHelpers');
   
   // Frontend
   import { safeJsonParse } from '@/utils/jsonHelpers';
   ```
3. **Test locally** before committing
4. **Watch for errors** in production logs

## Common Mistakes to Avoid

❌ **Don't copy-paste** import statements between frontend and backend
❌ **Don't assume** `.js` files always use the same syntax
❌ **Don't forget** to check which environment you're in

## Emergency Fix

If you accidentally push the wrong syntax to production:

```bash
# Backend fix (on production server)
sed -i "s/import { safeJsonParse.*/const { safeJsonParse } = require('..\/utils\/jsonHelpers');/" /path/to/file.js

# Then restart
pm2 restart tpe-backend
```

---
Last Updated: September 13, 2025
Files Migrated: 2/513
Next Batch: Ready to process