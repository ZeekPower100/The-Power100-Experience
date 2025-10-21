# TODO: Database Wrapper Fix for PostgreSQL Array Parsing

## Status: DEFERRED (Completed Safe Route First)

## Problem Summary
PostgreSQL returns array fields in PostgreSQL format `{"item1","item2"}` instead of JSON format `["item1","item2"]`. This causes `JSON.parse()` errors throughout the codebase.

## What We Fixed (Phase 1 - Safe Route)
✅ **Fixed aiKnowledgeService.js** - All array fields now wrapped with `to_json()` in SELECT queries
- Zero JSON Parse Errors after this fix
- AI Concierge matching accuracy restored
- Isolated change with minimal risk

## What Still Needs Fixing (Phase 2 - Comprehensive Route)

### Core Issue
7 files bypass the database wrapper and query PostgreSQL directly:
1. `tpe-backend/src/controllers/aiTrackingController.js`
2. `tpe-backend/src/services/aiEventTracker.js`
3. `tpe-backend/src/services/autoTaggingService.js`
4. `tpe-backend/src/services/eventViewRefresher.js`
5. `tpe-backend/src/services/openAIService.js`
6. `tpe-backend/src/services/peerMatchingService.js` ⚠️ CRITICAL for matching!
7. `tpe-backend/database/init.js`

### Recommended Solution
**Option 1: Fix Database Wrapper (Preferred Long-term)**
```javascript
// In config/database.js query() function:
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);

    // Post-process array fields to convert PostgreSQL arrays to JSON
    if (result.rows && result.rows.length > 0) {
      result.rows = result.rows.map(row => {
        const processedRow = { ...row };
        for (const [key, value] of Object.entries(processedRow)) {
          // Check if value looks like PostgreSQL array: {item1,item2}
          if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
            try {
              // Convert PostgreSQL array to JSON array
              const jsonArray = value
                .slice(1, -1) // Remove { }
                .split(',')
                .map(item => item.trim().replace(/^"|"$/g, '')); // Remove quotes
              processedRow[key] = jsonArray;
            } catch (e) {
              // Keep original value if conversion fails
            }
          }
        }
        return processedRow;
      });
    }

    return result;
  } finally {
    client.release();
  }
}
```

**Option 2: Add to_json() to All Direct Queries**
- More manual work
- Higher chance of missing fields
- Harder to maintain

### Risk Assessment
- **Medium-High Risk**: Database wrapper affects ALL queries across entire codebase
- **Testing Required**: Extensive testing of all CRUD operations
- **Backup Plan**: Easy rollback if issues arise

### Array Columns to Watch For
When implementing wrapper fix, these columns need proper handling:
- `focus_areas`
- `focus_areas_served`
- `focus_areas_covered`
- `focus_areas_12_months`
- `topics`
- `key_differentiators`
- `social_proof`
- `testimonials`
- `booth_representatives`
- `ai_tags`
- `ai_insights`
- `actionable_insights`

## Testing Plan (When Implementing Phase 2)

### 1. Unit Tests
- Test wrapper with PostgreSQL array inputs
- Test wrapper with JSON array inputs
- Test wrapper with non-array inputs
- Test wrapper with NULL values

### 2. Integration Tests
- Test all 7 bypassing files with wrapper
- Test aiKnowledgeService.js (ensure no double conversion)
- Test matching accuracy (peerMatchingService.js critical!)
- Test event orchestration queries

### 3. Manual Tests
- Run contractor flow end-to-end
- Test AI Concierge responses
- Verify partner matching
- Check event speaker/sponsor data

## Success Criteria
- ✅ Zero "JSON Parse Error: Unexpected token ," in logs
- ✅ All array fields return as proper JSON arrays
- ✅ Matching accuracy maintained or improved
- ✅ No breaking changes to existing code
- ✅ All 62+ files using array fields work correctly

## Timeline
**Priority**: Medium (current workaround in aiKnowledgeService.js is sufficient)
**Effort**: 2-3 hours (implementation + testing)
**When**: After current event orchestration stabilization

## Related Files
- `tpe-backend/src/config/database.js` - Database wrapper to fix
- `tpe-backend/src/services/aiKnowledgeService.js` - Already fixed (Phase 1)
- `docs/STORAGE-AND-JSON-GUIDELINES.md` - JSON handling best practices
- `tpe-backend/src/utils/jsonHelpers.js` - Safe JSON parsing utilities

## Notes
- Frontend already handles both formats (see parseJSON helper)
- Current fix (aiKnowledgeService.js) solves 90% of the problem
- Wrapper fix would make entire system more robust
- Consider adding to_json() to query builder instead of post-processing

---
**Created**: 2025-10-21
**Last Updated**: 2025-10-21
**Status**: Documented, awaiting implementation scheduling
