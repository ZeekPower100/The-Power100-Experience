-- Production Database Migration - December 12, 2024
-- Complete Event, Book, and Podcast Forms Field Alignment

-- =====================================================
-- EVENTS TABLE - New Columns
-- =====================================================

-- POC Contact Fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_customer_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_customer_email VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_customer_phone VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_media_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_media_email VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS poc_media_phone VARCHAR(50);

-- Event Details
ALTER TABLE events ADD COLUMN IF NOT EXISTS hotel_block_url VARCHAR(500);
ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsors TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS pre_registered_attendees TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;

-- Already exists, but verify column name is correct
ALTER TABLE events ADD COLUMN IF NOT EXISTS expected_attendance VARCHAR(100);

-- =====================================================
-- BOOKS TABLE - New Columns
-- =====================================================

-- Submitter Information
ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(50);
ALTER TABLE books ADD COLUMN IF NOT EXISTS submitter_company VARCHAR(255);
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_author BOOLEAN DEFAULT false;

-- Strategic Information
ALTER TABLE books ADD COLUMN IF NOT EXISTS writing_influence TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS intended_solutions TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS author_next_focus TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS book_goals TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS author_availability TEXT;

-- Additional Fields
ALTER TABLE books ADD COLUMN IF NOT EXISTS key_citations TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS target_readers TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS success_metrics TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS reader_outcomes TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS endorsements TEXT;

-- =====================================================
-- PODCASTS TABLE - New Columns
-- =====================================================

-- Platform URLs
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS other_platform_urls TEXT;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS host_linkedin VARCHAR(500);

-- Metrics
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS total_episodes INTEGER;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS testimonials TEXT;

-- Guest Management (if not exists)
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS accepts_guest_requests BOOLEAN DEFAULT false;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS guest_requirements TEXT;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS typical_guest_profile TEXT;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS booking_link VARCHAR(500);

-- Submitter Information (if not exists)
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(50);
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS submitter_company VARCHAR(255);
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT false;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify Events columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN (
  'poc_customer_name', 'poc_customer_email', 'poc_customer_phone',
  'poc_media_name', 'poc_media_email', 'poc_media_phone',
  'hotel_block_url', 'sponsors', 'pre_registered_attendees',
  'end_date', 'expected_attendance'
)
ORDER BY column_name;

-- Verify Books columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' 
AND column_name IN (
  'submitter_name', 'submitter_email', 'submitter_phone', 
  'submitter_company', 'is_author', 'writing_influence',
  'intended_solutions', 'author_next_focus', 'book_goals',
  'author_availability', 'key_citations', 'target_readers',
  'success_metrics', 'reader_outcomes', 'endorsements'
)
ORDER BY column_name;

-- Verify Podcasts columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'podcasts' 
AND column_name IN (
  'other_platform_urls', 'host_linkedin', 'total_episodes',
  'testimonials', 'accepts_guest_requests', 'guest_requirements',
  'typical_guest_profile', 'booking_link', 'submitter_name',
  'submitter_email', 'submitter_phone', 'submitter_company', 'is_host'
)
ORDER BY column_name;