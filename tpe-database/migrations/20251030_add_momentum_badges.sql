-- ================================================================
-- Migration: Add Momentum & Trust Badge Fields (Phase 2)
-- Date: October 30, 2025
-- Purpose: Performance tracking and partner recognition system
-- Pre-Flight Verified: strategic_partners has 140 columns before this migration
-- ================================================================

-- ================================================================
-- Step 1: Add Performance Momentum Tracking Fields
-- ================================================================

ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS momentum_modifier INTEGER DEFAULT 0
  CHECK (momentum_modifier IN (-3, 0, 5));

ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS performance_trend VARCHAR(20) DEFAULT 'new'
  CHECK (performance_trend IN ('improving', 'stable', 'declining', 'new'));

ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS quarters_tracked INTEGER DEFAULT 0
  CHECK (quarters_tracked >= 0);

-- ================================================================
-- Step 2: Add Trust Badge System Fields
-- ================================================================

ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS earned_badges JSONB DEFAULT '[]'::jsonb;

ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS badge_last_updated TIMESTAMP;

-- ================================================================
-- Step 3: Create Indexes for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_strategic_partners_momentum_modifier
  ON strategic_partners(momentum_modifier);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_performance_trend
  ON strategic_partners(performance_trend);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_earned_badges
  ON strategic_partners USING GIN(earned_badges);

-- ================================================================
-- Step 4: Add Column Comments for Documentation
-- ================================================================

COMMENT ON COLUMN strategic_partners.momentum_modifier IS
  'PCR momentum boost: +5 (hot streak: 3+ quarters 85+), 0 (stable/new), -3 (declining: 3+ quarters dropping)';

COMMENT ON COLUMN strategic_partners.performance_trend IS
  'Performance trend based on quarterly history: improving, stable, declining, or new';

COMMENT ON COLUMN strategic_partners.quarters_tracked IS
  'Number of quarters with feedback data collected';

COMMENT ON COLUMN strategic_partners.earned_badges IS
  'Array of trust badges: [{type: "verified", name: "Verified", icon: "✓", earnedAt: "2025-10-30"}, ...]';

COMMENT ON COLUMN strategic_partners.badge_last_updated IS
  'Last time badge eligibility was recalculated';

-- ================================================================
-- Step 5: Data Migration - Initialize New Fields
-- ================================================================

-- Set quarters_tracked based on existing quarterly_history
UPDATE strategic_partners
SET quarters_tracked = CASE
    WHEN quarterly_history IS NOT NULL AND jsonb_array_length(quarterly_history) > 0
    THEN jsonb_array_length(quarterly_history)
    ELSE 0
  END
WHERE quarterly_history IS NOT NULL;

-- Initialize performance_trend for existing partners with data
-- Partners with quarterly data set to 'stable' instead of 'new'
UPDATE strategic_partners
SET performance_trend = 'stable'
WHERE quarters_tracked > 0 AND performance_trend = 'new';

-- ================================================================
-- Step 6: Verification Queries
-- ================================================================

-- Verify column count (should be 140 + 5 = 145)
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'strategic_partners';

-- Verify new Phase 2 fields exist with correct types
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'strategic_partners'
  AND column_name IN ('momentum_modifier', 'performance_trend', 'quarters_tracked', 'earned_badges', 'badge_last_updated')
ORDER BY ordinal_position;

-- Verify CHECK constraints were created
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'strategic_partners'::regclass
  AND contype = 'c'
  AND (conname LIKE '%momentum%' OR conname LIKE '%trend%' OR conname LIKE '%quarters%')
ORDER BY conname;

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'strategic_partners'
  AND (indexname LIKE '%momentum%' OR indexname LIKE '%trend%' OR indexname LIKE '%badge%')
ORDER BY indexname;

-- Verify data distribution after migration
SELECT
  COUNT(*) as total_partners,
  COUNT(*) FILTER (WHERE momentum_modifier = 5) as hot_streak_partners,
  COUNT(*) FILTER (WHERE momentum_modifier = 0) as stable_partners,
  COUNT(*) FILTER (WHERE momentum_modifier = -3) as declining_partners,
  COUNT(*) FILTER (WHERE performance_trend = 'improving') as improving_trend,
  COUNT(*) FILTER (WHERE performance_trend = 'stable') as stable_trend,
  COUNT(*) FILTER (WHERE performance_trend = 'declining') as declining_trend,
  COUNT(*) FILTER (WHERE performance_trend = 'new') as new_partners,
  AVG(quarters_tracked) as avg_quarters_tracked,
  COUNT(*) FILTER (WHERE jsonb_array_length(earned_badges) > 0) as partners_with_badges
FROM strategic_partners;

-- ================================================================
-- Migration Complete
-- ================================================================

-- Expected Results:
-- - total_columns: 145
-- - All Phase 2 fields present with correct types
-- - CHECK constraints enforcing value ranges
-- - Indexes created for query performance
-- - All existing partners have momentum_modifier = 0 (default)
-- - All existing partners have performance_trend = 'new' or 'stable'
-- - All existing partners have quarters_tracked based on quarterly_history
-- - All existing partners have earned_badges = []
-- - badge_last_updated = NULL (not yet calculated)

-- Next Steps:
-- 1. Run momentum calculation service to analyze trends
-- 2. Run badge eligibility service to award initial badges
-- 3. Integrate momentum into PCR calculation
