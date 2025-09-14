# Podcast Form - Batch 7 Field Analysis
## Fields: subscriber_count, download_average

### Verification Results:

| Field | Database | Public Form | Admin Form | Status |
|-------|----------|-------------|------------|--------|
| **subscriber_count** | ✅ INTEGER | ❌ Missing | ❌ Only in formData | Need input in both |
| **download_average** | ✅ INTEGER | ❌ Missing | ❌ Only in formData | Need input in both |

### Issues Found:
1. Both fields missing from public form entirely
2. Both fields in admin formData but no input fields
3. These are metrics that hosts would know about their podcast

### ✅ FIXES APPLIED:
1. ✅ Added subscriber_count number input to public form (lines 456-464)
2. ✅ Added download_average number input to public form (lines 468-476)
3. ✅ Added subscriber_count to admin form (lines 340-348)
4. ✅ Added download_average to admin form (lines 352-360)
5. ✅ Added both fields to initial state in public form (lines 81-82)