-- ================================================================
-- Migration: Add PCR Scoring System Fields
-- Date: October 29, 2025
-- Purpose: Core PCR calculation engine (Profile + Quarterly + Multipliers)
-- ================================================================

-- Payment Tier & Engagement Fields
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS engagement_tier VARCHAR(20) DEFAULT 'free'
  CHECK (engagement_tier IN ('free', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS payment_multiplier NUMERIC(3,1) DEFAULT 1.5
  CHECK (payment_multiplier IN (1.5, 2.5, 5.0)),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive'
  CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'inactive'));

-- Profile Completion Tracking
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0
  CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
ADD COLUMN IF NOT EXISTS demo_videos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS employee_feedback_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_feedback_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_last_updated TIMESTAMP DEFAULT NOW();

-- Quarterly Feedback Tracking
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS quarterly_feedback_score NUMERIC(5,2) DEFAULT 50.00
  CHECK (quarterly_feedback_score >= 0 AND quarterly_feedback_score <= 100),
ADD COLUMN IF NOT EXISTS has_quarterly_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quarterly_history JSONB DEFAULT '[]'::jsonb;

-- PCR Scores
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS base_pcr_score NUMERIC(5,2)
  CHECK (base_pcr_score IS NULL OR (base_pcr_score >= 0 AND base_pcr_score <= 100)),
ADD COLUMN IF NOT EXISTS final_pcr_score NUMERIC(5,2)
  CHECK (final_pcr_score IS NULL OR (final_pcr_score >= 0 AND final_pcr_score <= 105)),
ADD COLUMN IF NOT EXISTS pcr_last_calculated TIMESTAMP;

-- ================================================================
-- Indexes for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_strategic_partners_engagement_tier
  ON strategic_partners(engagement_tier);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_final_pcr_score
  ON strategic_partners(final_pcr_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_base_pcr_score
  ON strategic_partners(base_pcr_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_subscription_status
  ON strategic_partners(subscription_status)
  WHERE subscription_status = 'active';

-- ================================================================
-- Comments for Documentation
-- ================================================================

COMMENT ON COLUMN strategic_partners.engagement_tier IS
  'Payment tier: free (1.5x), gold/Power Gold ($3,600/mo - 2.5x), platinum/Power Platinum ($6,000/mo - 5.0x)';

COMMENT ON COLUMN strategic_partners.payment_multiplier IS
  'PCR boost multiplier based on engagement tier';

COMMENT ON COLUMN strategic_partners.profile_completion_score IS
  'Weighted score (0-100) based on profile element completion';

COMMENT ON COLUMN strategic_partners.quarterly_feedback_score IS
  'Quarterly customer feedback score (defaults to 50 until first quarter)';

COMMENT ON COLUMN strategic_partners.base_pcr_score IS
  'Base PCR = (Profile 30%) + (Quarterly 70%) before multiplier';

COMMENT ON COLUMN strategic_partners.final_pcr_score IS
  'Final PCR = (Base × 0.80) + (20 × Multiplier / 5) after all adjustments';

-- ================================================================
-- Data Migration: Populate Counts from Existing Data
-- ================================================================

-- Count demo videos from landing_page_videos JSONB
UPDATE strategic_partners
SET demo_videos_count = CASE
    WHEN landing_page_videos IS NOT NULL
    THEN jsonb_array_length(landing_page_videos)
    ELSE 0
  END,
  profile_last_updated = NOW()
WHERE landing_page_videos IS NOT NULL;

-- Count customer feedbacks from client_testimonials JSONB
UPDATE strategic_partners
SET customer_feedback_count = CASE
    WHEN client_testimonials IS NOT NULL
    THEN jsonb_array_length(client_testimonials)
    ELSE 0
  END,
  profile_last_updated = NOW()
WHERE client_testimonials IS NOT NULL;

-- Note: employee_references is TEXT field - manual count needed
-- Will be populated by service layer on first PCR calculation

-- ================================================================
-- Verification Query
-- ================================================================

SELECT
  COUNT(*) as total_partners,
  AVG(demo_videos_count) as avg_demos,
  AVG(customer_feedback_count) as avg_customer_feedback,
  COUNT(*) FILTER (WHERE engagement_tier = 'free') as free_tier,
  COUNT(*) FILTER (WHERE engagement_tier = 'gold') as gold_tier,
  COUNT(*) FILTER (WHERE engagement_tier = 'platinum') as platinum_tier
FROM strategic_partners;
