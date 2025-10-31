-- ================================================================
-- PCR System: Custom Metrics Enhancement
-- Date: 2025-10-31
-- Purpose: Add custom metric fields to PowerCard campaigns
-- ================================================================

-- Add custom metric fields to campaigns table
-- Each campaign can have ONE custom metric question chosen by the partner
ALTER TABLE power_card_campaigns
  ADD COLUMN IF NOT EXISTS custom_metric_question VARCHAR(500),
  ADD COLUMN IF NOT EXISTS custom_metric_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS custom_metric_description TEXT;

COMMENT ON COLUMN power_card_campaigns.custom_metric_question IS 'The custom question text displayed to respondents (e.g., "How satisfied are you with installation quality?")';
COMMENT ON COLUMN power_card_campaigns.custom_metric_label IS 'Short label for the metric (e.g., "Installation Quality")';
COMMENT ON COLUMN power_card_campaigns.custom_metric_description IS 'Optional description/context shown to respondents';

-- Add custom metric score to responses table
ALTER TABLE power_card_responses
  ADD COLUMN IF NOT EXISTS custom_metric_score INTEGER,
  ADD CONSTRAINT check_custom_metric_score
    CHECK (custom_metric_score IS NULL OR (custom_metric_score BETWEEN 0 AND 10));

COMMENT ON COLUMN power_card_responses.custom_metric_score IS 'Score (0-10) for the campaigns custom metric question';

-- Add index for querying custom metrics
CREATE INDEX IF NOT EXISTS idx_power_card_campaigns_custom_metric
  ON power_card_campaigns(id)
  WHERE custom_metric_question IS NOT NULL;

-- Add partner_id to campaigns for easier querying
ALTER TABLE power_card_campaigns
  ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES strategic_partners(id);

CREATE INDEX IF NOT EXISTS idx_power_card_campaigns_partner
  ON power_card_campaigns(partner_id);

COMMENT ON COLUMN power_card_campaigns.partner_id IS 'The partner this campaign is collecting feedback for';

-- Update existing campaigns to link to partners if we can infer it
-- (This will be null for now, will be populated when campaigns are created going forward)

-- ================================================================
-- Data Integrity Verification
-- ================================================================

-- Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'power_card_campaigns') THEN
    RAISE EXCEPTION 'Table power_card_campaigns does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'power_card_responses') THEN
    RAISE EXCEPTION 'Table power_card_responses does not exist';
  END IF;
END $$;

-- Show results
SELECT
  'custom_metric_question' as field,
  CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
FROM information_schema.columns
WHERE table_name = 'power_card_campaigns' AND column_name = 'custom_metric_question'
UNION ALL
SELECT
  'custom_metric_label' as field,
  CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
FROM information_schema.columns
WHERE table_name = 'power_card_campaigns' AND column_name = 'custom_metric_label'
UNION ALL
SELECT
  'custom_metric_score' as field,
  CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
FROM information_schema.columns
WHERE table_name = 'power_card_responses' AND column_name = 'custom_metric_score'
UNION ALL
SELECT
  'partner_id (campaigns)' as field,
  CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
FROM information_schema.columns
WHERE table_name = 'power_card_campaigns' AND column_name = 'partner_id';
