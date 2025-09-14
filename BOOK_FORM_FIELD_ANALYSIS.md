# Book Form Field Analysis - Three-Way Comparison
**Date**: 2025-09-10

## 🔴 CRITICAL MISALIGNMENTS FOUND

### 1. ❌ FIELD NAME MISMATCHES

#### book_cover_url vs cover_image_url
- **Public Form**: `book_cover_url`
- **Admin Form**: `cover_image_url` 
- **Database**: `cover_image_url`
- **ISSUE**: Public form uses different field name - needs to change to `cover_image_url`

#### Submitter vs Author Fields (BOTH NEEDED!)
- **Public Form**: Has `submitter_name`, `submitter_email`, `submitter_phone`, `submitter_company`, `is_author`
- **Admin Form**: Has `author_email`, `author_phone` (missing submitter fields)
- **Database**: Has `author_email`, `author_phone` but NO submitter fields
- **REQUIREMENT**: Need BOTH sets of fields because submitters can be:
  - The author themselves
  - TPE team members entering data
  - Executive assistants (EAs)
  - Other authorized representatives

### 2. ⚠️ MISSING FIELDS IN PUBLIC FORM

These fields exist in admin/database but NOT in public form:
- `author_email` (need alongside submitter_email)
- `author_phone` (need alongside submitter_phone)
- `publication_year`
- `topics` 
- `target_audience`
- `reading_time`
- `difficulty_level`
- `author_linkedin_url`
- `author_website`
- **EA Fields** (should be added):
  - `has_executive_assistant`
  - `ea_name`
  - `ea_email`
  - `ea_phone`
  - `ea_scheduling_link`
- **key_citations** (should be added with structure)

### 3. ⚠️ MISSING FIELDS IN DATABASE

These fields are in public form but NOT in database:
- `submitter_name` ❌ (NEEDED for tracking who submitted)
- `submitter_email` ❌ (NEEDED for follow-up)
- `submitter_phone` ❌ (NEEDED for contact)
- `submitter_company` ❌ (NEEDED for context)
- `is_author` ❌ (NEEDED to know if submitter = author)
- `target_revenue` ❌ (missing just like in Events!)
- `sample_chapter_link` ❌
- `table_of_contents` ❌

### 4. ⚠️ EA FIELDS MISSING FROM DATABASE
- `has_executive_assistant` ❌
- `ea_name` ❌
- `ea_email` ❌
- `ea_phone` ❌
- `ea_scheduling_link` ❌

### 5. ✅ ADMIN-ONLY FIELDS (OK to be missing from public)

These are fine being admin-only:
- AI fields: `ai_summary`, `ai_tags`, `ai_insights`
- Metrics: `actionable_ratio`, `completion_rate`, `engagement_metrics`
- Advanced fields: `chapter_summaries`, `key_concepts`, `related_entities`

## 📋 COMPLETE FIELD REQUIREMENTS

### Author Information (about the book author)
- `author` (name) - EXISTS
- `author_email` - EXISTS in DB, missing in public form
- `author_phone` - EXISTS in DB, missing in public form
- `author_linkedin_url` - Missing in public form
- `author_website` - Missing in public form

### Submitter Information (who is entering this data)
- `submitter_name` - MISSING IN DB
- `submitter_email` - MISSING IN DB
- `submitter_phone` - MISSING IN DB
- `submitter_company` - MISSING IN DB
- `is_author` - MISSING IN DB (boolean flag)

### Executive Assistant Information (if author has EA)
- `has_executive_assistant` - MISSING IN DB
- `ea_name` - MISSING IN DB
- `ea_email` - MISSING IN DB
- `ea_phone` - MISSING IN DB
- `ea_scheduling_link` - MISSING IN DB

## 🚨 PRIORITY FIXES NEEDED

### HIGH PRIORITY (Data Loss Issues)
1. **Add missing columns to database**:
   ```sql
   -- Submitter tracking fields
   ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(50);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_company VARCHAR(255);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS is_author BOOLEAN DEFAULT false;
   
   -- Missing content fields
   ALTER TABLE books ADD COLUMN IF NOT EXISTS target_revenue TEXT;
   ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_chapter_link VARCHAR(500);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS table_of_contents TEXT;
   
   -- EA fields
   ALTER TABLE books ADD COLUMN IF NOT EXISTS has_executive_assistant BOOLEAN DEFAULT false;
   ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_name VARCHAR(255);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_email VARCHAR(255);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_phone VARCHAR(50);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS ea_scheduling_link VARCHAR(500);
   
   -- Missing author fields
   ALTER TABLE books ADD COLUMN IF NOT EXISTS author_linkedin_url VARCHAR(500);
   ALTER TABLE books ADD COLUMN IF NOT EXISTS author_website VARCHAR(500);
   ```

2. **Fix field name mismatches**:
   - Change public form from `book_cover_url` to `cover_image_url`
   - Ensure `focus_areas` maps to `focus_areas_covered`

3. **Add to public form**:
   - Author contact fields (email, phone, linkedin, website) - separate from submitter
   - EA fields section (conditional on has_executive_assistant)
   - key_citations with proper structure
   - Missing content fields (publication_year, topics, target_audience, reading_time, difficulty_level)

## 🎯 USE CASES FOR SUBMITTER TRACKING

1. **Author submits own book**: is_author = true, submitter info = author info
2. **TPE team enters book**: is_author = false, submitter = team member details
3. **EA submits for author**: is_author = false, submitter = EA details (different from ea_ fields which are for contacting author's EA)
4. **Partner recommends book**: is_author = false, submitter = partner details

This tracking helps with:
- Follow-up communications
- Data quality verification
- Understanding submission sources
- Building relationships with active contributors