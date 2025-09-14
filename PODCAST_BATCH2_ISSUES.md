# Podcast Form - Batch 2 Issues Found

## Fields: frequency, focus_areas_covered, topics, target_audience, spotify_url

### ✅ ISSUES FIXED:

| Field | Database | Public Form | Admin Form | Status |
|-------|----------|-------------|------------|--------|
| **frequency** | ✅ frequency | ✅ frequency | ✅ frequency | FIXED |
| **focus_areas_covered** | ✅ focus_areas_covered | ✅ focus_areas_covered | ✅ focus_areas_covered | FIXED |
| **topics** | ✅ topics (TEXT) | ✅ topics (array->JSON) | ✅ topics | OK |
| **target_audience** | ✅ target_audience | ✅ target_audience | ✅ target_audience | OK |
| **spotify_url** | ✅ spotify_url | ✅ spotify_url | ✅ spotify_url | OK |

### Fixes Applied:
1. ✅ Changed `episode_frequency` to `frequency` (lines 381-383)
2. ✅ Changed `focus_areas` to `focus_areas_covered` (lines 109, 111, 113, 156, 322)
3. ✅ Updated htmlFor to match input id for accessibility
4. ✅ Kept user-friendly label text "Episode Frequency" for clarity