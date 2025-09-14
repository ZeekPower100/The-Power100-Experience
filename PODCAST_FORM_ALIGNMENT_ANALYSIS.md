# Podcast Form Alignment Analysis

## Database Schema (27 columns)
1. id (auto)
2. **title** (VARCHAR 255)
3. **focus_areas_covered** (TEXT)
4. **topics** (TEXT)
5. **is_active** (BOOLEAN)
6. **host** (VARCHAR 255)
7. **frequency** (VARCHAR 50)
8. **description** (TEXT)
9. **website** (VARCHAR 255)
10. **logo_url** (VARCHAR 255)
11. **target_audience** (TEXT)
12. **status** (VARCHAR 20)
13. ai_summary (TEXT) - AI only
14. ai_tags (JSONB) - AI only
15. episode_transcripts (JSONB) - AI only
16. actionable_insights (JSONB) - AI only
17. guest_credentials (JSONB) - AI only
18. episode_consistency (NUMERIC) - AI only
19. community_engagement (INTEGER) - AI only
20. topic_depth_analysis (JSONB) - AI only
21. implementation_examples (JSONB) - AI only
22. roi_discussions (JSONB) - AI only
23. created_at (TIMESTAMP)
24. **notable_guests** (TEXT)
25. **testimonials** (TEXT)
26. **host_email** (VARCHAR 255)
27. **host_phone** (VARCHAR 50)

## Public Form Fields (PodcastOnboardingForm)
- name ❌ (should be title)
- host ✅
- description ✅
- website_url ❌ (should be website)
- spotify_url ❌ (NOT IN DATABASE)
- apple_podcasts_url ❌ (NOT IN DATABASE)
- youtube_url ❌ (NOT IN DATABASE)
- focus_areas ❌ (should be focus_areas_covered)
- target_revenue ❌ (NOT IN DATABASE)
- episode_frequency ❌ (should be frequency)
- average_episode_length ❌ (NOT IN DATABASE)
- total_episodes ❌ (NOT IN DATABASE)
- notable_guests ✅
- topics ✅
- testimonials ✅
- cover_image_url ❌ (should be logo_url)
- submitter_name ❌ (NOT IN DATABASE)
- submitter_email ❌ (NOT IN DATABASE)
- submitter_phone ❌ (NOT IN DATABASE)
- submitter_company ❌ (NOT IN DATABASE)
- is_host ❌ (NOT IN DATABASE)
- status ✅

## Admin Form Fields (PodcastForm)
- title ✅
- host ✅
- frequency ✅
- description ✅
- website ✅
- logo_url ✅
- target_audience ✅
- topics ✅
- episode_count ❌ (NOT IN DATABASE)
- average_episode_length ❌ (NOT IN DATABASE)
- format ❌ (NOT IN DATABASE)
- host_email ✅
- host_phone ✅
- host_linkedin ❌ (NOT IN DATABASE)
- host_company ❌ (NOT IN DATABASE)
- host_bio ❌ (NOT IN DATABASE)
- spotify_url ❌ (NOT IN DATABASE)
- apple_podcasts_url ❌ (NOT IN DATABASE)
- youtube_url ❌ (NOT IN DATABASE)
- other_platform_urls ❌ (NOT IN DATABASE)
- accepts_guest_requests ❌ (NOT IN DATABASE)
- guest_requirements ❌ (NOT IN DATABASE)
- typical_guest_profile ❌ (NOT IN DATABASE)
- booking_link ❌ (NOT IN DATABASE)
- subscriber_count ❌ (NOT IN DATABASE)
- download_average ❌ (NOT IN DATABASE)
- notable_guests ✅
- testimonials ✅
- is_active ✅
- focus_areas_covered ✅ (via selectedFocusAreas)

## 🔴 CRITICAL ISSUES

### 1. Missing Database Columns (Need to Add)
**Public Form Fields Missing in DB:**
- spotify_url
- apple_podcasts_url
- youtube_url
- target_revenue (array)
- average_episode_length
- total_episodes (or episode_count)
- submitter_name
- submitter_email
- submitter_phone
- submitter_company
- is_host

**Admin Form Fields Missing in DB:**
- episode_count
- average_episode_length
- format
- host_linkedin
- host_company
- host_bio
- spotify_url (same as public)
- apple_podcasts_url (same as public)
- youtube_url (same as public)
- other_platform_urls
- accepts_guest_requests
- guest_requirements
- typical_guest_profile
- booking_link
- subscriber_count
- download_average

### 2. Field Name Mismatches
**Public Form → Database:**
- `name` → `title`
- `website_url` → `website`
- `focus_areas` → `focus_areas_covered`
- `episode_frequency` → `frequency`
- `cover_image_url` → `logo_url`

### 3. Fields Present in Database but Missing from Forms
- target_audience (missing from public form)
- host_email (missing from public form)
- host_phone (missing from public form)

## 📋 REQUIRED ACTIONS

### Step 1: Add Missing Database Columns (22 columns)
```sql
-- Platform URLs
ALTER TABLE podcasts ADD COLUMN spotify_url VARCHAR(500);
ALTER TABLE podcasts ADD COLUMN apple_podcasts_url VARCHAR(500);
ALTER TABLE podcasts ADD COLUMN youtube_url VARCHAR(500);
ALTER TABLE podcasts ADD COLUMN other_platform_urls TEXT;

-- Episode Info
ALTER TABLE podcasts ADD COLUMN episode_count INTEGER;
ALTER TABLE podcasts ADD COLUMN average_episode_length VARCHAR(50);
ALTER TABLE podcasts ADD COLUMN total_episodes INTEGER;
ALTER TABLE podcasts ADD COLUMN format VARCHAR(100);

-- Target Revenue
ALTER TABLE podcasts ADD COLUMN target_revenue TEXT;

-- Host Extended Info
ALTER TABLE podcasts ADD COLUMN host_linkedin VARCHAR(500);
ALTER TABLE podcasts ADD COLUMN host_company VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN host_bio TEXT;

-- Guest Info
ALTER TABLE podcasts ADD COLUMN accepts_guest_requests BOOLEAN DEFAULT false;
ALTER TABLE podcasts ADD COLUMN guest_requirements TEXT;
ALTER TABLE podcasts ADD COLUMN typical_guest_profile TEXT;
ALTER TABLE podcasts ADD COLUMN booking_link VARCHAR(500);

-- Metrics
ALTER TABLE podcasts ADD COLUMN subscriber_count INTEGER;
ALTER TABLE podcasts ADD COLUMN download_average INTEGER;

-- Submitter Info
ALTER TABLE podcasts ADD COLUMN submitter_name VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN submitter_email VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN submitter_phone VARCHAR(50);
ALTER TABLE podcasts ADD COLUMN submitter_company VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN is_host BOOLEAN DEFAULT false;
```

### Step 2: Fix Field Names in Public Form
- Change `name` to `title`
- Change `website_url` to `website`
- Change `focus_areas` to `focus_areas_covered`
- Change `episode_frequency` to `frequency`
- Change `cover_image_url` to `logo_url`

### Step 3: Add Missing Fields to Public Form
- Add `target_audience` field
- Add `host_email` field (in contact section)
- Add `host_phone` field (in contact section)

### Step 4: Update Backend Controller
- Ensure all new fields are handled in podcastController.js
- Update field mappings to match database

## 📊 Summary Statistics
- **Database Columns**: 27 (12 AI-related, 15 user-facing)
- **Missing from Database**: 22 columns need to be added
- **Field Name Mismatches**: 5 in public form
- **Missing from Public Form**: 3 fields (target_audience, host_email, host_phone)