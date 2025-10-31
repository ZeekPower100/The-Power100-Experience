-- ================================================================
-- PCR System: Rollback Custom Metrics (Unnecessary 4th Metric)
-- Date: 2025-10-31
-- Purpose: Remove custom_metric fields - metric_1/2/3 are already custom!
-- ================================================================

-- Remove custom metric fields from campaigns table (not needed - metrics are in templates)
ALTER TABLE power_card_campaigns
  DROP COLUMN IF EXISTS custom_metric_question,
  DROP COLUMN IF EXISTS custom_metric_label,
  DROP COLUMN IF EXISTS custom_metric_description;

-- Remove custom metric score from responses table (not needed - we have metric_1/2/3)
ALTER TABLE power_card_responses
  DROP COLUMN IF EXISTS custom_metric_score;

-- Keep partner_id - it's useful for direct querying without joining through templates
-- ALTER TABLE power_card_campaigns DROP COLUMN IF EXISTS partner_id;

-- Verification
SELECT
  'custom_metric_question' as field,
  CASE WHEN column_name IS NULL THEN '✓ Removed' ELSE '✗ Still exists' END as status
FROM information_schema.columns
WHERE table_name = 'power_card_campaigns' AND column_name = 'custom_metric_question'
UNION ALL
SELECT
  'custom_metric_score' as field,
  CASE WHEN column_name IS NULL THEN '✓ Removed' ELSE '✗ Still exists' END as status
FROM information_schema.columns
WHERE table_name = 'power_card_responses' AND column_name = 'custom_metric_score';
