-- ================================================================
-- Migration: Create Inner Circle Members Table
-- Date: February 16, 2026
-- Purpose: Store Inner Circle membership profiles collected via
--          conversational onboarding through AI Concierge
-- Phase: Inner Circle Concierge Phase 1
-- ================================================================

CREATE TABLE IF NOT EXISTS inner_circle_members (
  id SERIAL PRIMARY KEY,

  -- Identity
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  entry_source VARCHAR(100),  -- podcast, short, referral, direct, social
  registration_date TIMESTAMP DEFAULT NOW(),
  membership_status VARCHAR(50) DEFAULT 'active'
    CHECK (membership_status IN ('active', 'inactive', 'suspended')),

  -- Profile (collected via conversational onboarding)
  business_type VARCHAR(255),
  revenue_tier VARCHAR(100),
  team_size VARCHAR(100),
  focus_areas JSONB DEFAULT '[]'::jsonb,
  growth_readiness VARCHAR(100),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}'::jsonb,

  -- PowerMove Tracking
  power_moves_completed INTEGER DEFAULT 0,
  power_moves_active JSONB DEFAULT '[]'::jsonb,
  power_moves_history JSONB DEFAULT '[]'::jsonb,
  coaching_preferences JSONB DEFAULT '{}'::jsonb,

  -- Engagement
  last_concierge_interaction TIMESTAMP,
  total_concierge_sessions INTEGER DEFAULT 0,
  content_interactions JSONB DEFAULT '[]'::jsonb,
  partner_recommendation_unlocked BOOLEAN DEFAULT FALSE,

  -- AI Fields (auto-discovered by aiKnowledgeService.js via ai_ prefix)
  ai_summary TEXT,
  ai_tags JSONB DEFAULT '[]'::jsonb,
  ai_insights JSONB DEFAULT '[]'::jsonb,
  ai_engagement_score NUMERIC(5,2) DEFAULT 0.00,

  -- Conversion Tracking
  converted_to_contractor BOOLEAN DEFAULT FALSE,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
  conversion_date TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_icm_email ON inner_circle_members(email);
CREATE INDEX IF NOT EXISTS idx_icm_membership_status ON inner_circle_members(membership_status);
CREATE INDEX IF NOT EXISTS idx_icm_onboarding_complete ON inner_circle_members(onboarding_complete);
CREATE INDEX IF NOT EXISTS idx_icm_partner_unlock ON inner_circle_members(partner_recommendation_unlocked);
CREATE INDEX IF NOT EXISTS idx_icm_converted ON inner_circle_members(converted_to_contractor);
CREATE INDEX IF NOT EXISTS idx_icm_last_interaction ON inner_circle_members(last_concierge_interaction);
CREATE INDEX IF NOT EXISTS idx_icm_ai_tags ON inner_circle_members USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_icm_focus_areas ON inner_circle_members USING GIN(focus_areas);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_icm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_icm_updated_at
  BEFORE UPDATE ON inner_circle_members
  FOR EACH ROW
  EXECUTE FUNCTION update_icm_updated_at();
