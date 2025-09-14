# Podcast Form - Batch 5 Field Analysis
## Fields: accepts_guest_requests, guest_requirements, typical_guest_profile, booking_link

### Verification Results:

| Field | Database | Public Form | Admin Form | Status |
|-------|----------|-------------|------------|--------|
| **accepts_guest_requests** | ✅ BOOLEAN | ❌ Missing | ✅ Checkbox (line 676) | Need in public |
| **guest_requirements** | ✅ TEXT | ❌ Missing | ❌ NO INPUT FIELD | Need in both |
| **typical_guest_profile** | ✅ TEXT | ❌ Missing | ✅ Input (line 689) | Need in public |
| **booking_link** | ✅ VARCHAR(500) | ❌ Missing | ✅ Input (line 699) | Need in public |

### Issues Found:
1. All 4 fields missing from public form
2. guest_requirements has no input field in admin form (only in formData)
3. Admin form has conditional rendering - fields only show when accepts_guest_requests is checked

### ✅ FIXES APPLIED:
1. ✅ Added all 4 fields to public form (lines 497-544)
2. ✅ Added guest_requirements Textarea to admin form (lines 687-694)
3. ✅ Implemented conditional logic - fields only show when accepts_guest_requests is checked
4. ✅ Added fields to initial state in public form (lines 86-89)