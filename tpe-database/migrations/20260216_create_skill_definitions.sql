-- ================================================================
-- Migration: Create Skill Definitions Table
-- Date: February 16, 2026
-- Purpose: Database-primary skill storage for AI Concierge.
--          Skills use OpenClaw's SKILL.md format (YAML frontmatter
--          + Markdown body) but are stored in DB for hot-reload
--          and admin UI editing without code deployments.
-- Phase: Inner Circle Concierge Phase 1
-- ================================================================

CREATE TABLE IF NOT EXISTS skill_definitions (
  id SERIAL PRIMARY KEY,

  -- Identity (from SKILL.md frontmatter)
  skill_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  emoji VARCHAR(10),

  -- Context & Targeting
  context_type VARCHAR(50) NOT NULL
    CHECK (context_type IN ('inner_circle', 'contractor', 'event', 'universal')),
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('high', 'normal', 'low')),

  -- Content (the actual skill instructions — Markdown body from SKILL.md)
  skill_content TEXT NOT NULL,

  -- Metadata (mirrors OpenClaw frontmatter metadata object)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- State
  is_active BOOLEAN DEFAULT TRUE,
  version VARCHAR(20) DEFAULT '1.0',

  -- Seed tracking (links back to filesystem SKILL.md if seeded from file)
  seed_file_path VARCHAR(500),
  last_seeded_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sd_context_type ON skill_definitions(context_type);
CREATE INDEX IF NOT EXISTS idx_sd_active ON skill_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_sd_name ON skill_definitions(skill_name);
CREATE INDEX IF NOT EXISTS idx_sd_priority ON skill_definitions(priority);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_sd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sd_updated_at
  BEFORE UPDATE ON skill_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_sd_updated_at();
