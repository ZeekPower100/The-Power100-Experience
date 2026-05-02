-- ─────────────────────────────────────────────────────────────────────────────
-- TPX: search_vector + GIN indexes for AIOS find() primitive
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Companion to DRC migration `a7b8c9d0e1f2_add_search_vectors.py` (alembic).
--
-- WHY: AIOS (Power100's brain — Telegram-driven role-scoped agent stack at
--      https://aios.power100.io) is implementing a unified search primitive
--      `find(query, scope?)` that searches across BOTH databases (DRC's
--      `power_rankings_db` and TPX's `tpedb`) and returns merged ranked
--      results. The DRC side ships its tsvector + GIN infrastructure via
--      alembic. This file is the TPX side of that work.
--
--      Without this migration, AIOS's `find()` is blind to TPX entities
--      (contractors, partners, books, podcasts, events, expert_contributors).
--      Greg's brain becomes the "one big database" experience the user has
--      been asking for since rankings_db was built — but only if both halves
--      ship their search infrastructure.
--
-- HOW: Each table gets a GENERATED ALWAYS tsvector column auto-maintained
--      by Postgres on every INSERT/UPDATE — TPX application code does NOT
--      need to know this column exists. Plus a GIN index on the tsvector
--      and a pg_trgm GIN index on a combined LOWER() expression for
--      fuzzy/misspelling fallback (so "Hotia" finds "Hotea").
--
-- SAFETY: All tables in this migration are small (4-170 rows as of 2026-05-02).
--         GIN index builds are sub-second. Generated columns add ~50-200 bytes
--         per row depending on text density. Reversible via the down section
--         at the bottom of this file.
--
-- DEPLOY: Apply against `tpedb` on `tpe-database-production` RDS instance,
--         e.g. via psql or whatever migration tooling TPX standardizes on.
--         Idempotent on re-run via IF NOT EXISTS. Recommend applying inside
--         a transaction so partial failures don't leave the schema half-done.
--
-- AUTHOR: Drafted 2026-05-02 in DRC session at user request.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ DISCOVERY CONVENTION (forward-compatibility contract)                   │
-- │                                                                         │
-- │ Any TPX table with a `search_vector tsvector` column is automatically  │
-- │ included in AIOS's `find()` primitive. AIOS scans information_schema   │
-- │ on startup and builds its scope registry dynamically. To add a new     │
-- │ searchable TPX table later (e.g. `event_speakers`, `book_chapters`,    │
-- │ `learning_modules`):                                                    │
-- │                                                                         │
-- │   1. Write a SQL migration following the pattern in this file:         │
-- │      - ALTER TABLE <name> ADD COLUMN search_vector tsvector            │
-- │        GENERATED ALWAYS AS (setweight(...) || ...) STORED              │
-- │      - CREATE INDEX ... USING GIN(search_vector)                       │
-- │      - CREATE INDEX ... USING GIN((lower(...) ) gin_trgm_ops)          │
-- │   2. Apply the migration to tpedb.                                     │
-- │   3. AIOS picks it up automatically on next restart — ZERO AIOS code   │
-- │      change required.                                                   │
-- │                                                                         │
-- │ Weight conventions:                                                     │
-- │   A = primary identity (name, title, company)                          │
-- │   B = secondary identity (email, secondary names, descriptions)        │
-- │   C = phone, website, contact metadata                                 │
-- │   D = geography, status, role labels                                   │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. Extension ──────────────────────────────────────────────────────────
-- pg_trgm provides similarity() + gin_trgm_ops opclass for fuzzy match.
-- Idempotent — safe on re-run.
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ─── 2. CONTRACTORS ────────────────────────────────────────────────────────
-- Identity (A): first_name, last_name, name, company_name, email
-- Secondary (B): focus_areas, primary_focus_area, ai_summary
-- Tertiary (C): phone, company_website
-- Geography (D): tags, lifecycle_stage
ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(first_name, '')),         'A') ||
    setweight(to_tsvector('english', coalesce(last_name, '')),          'A') ||
    setweight(to_tsvector('english', coalesce(name, '')),               'A') ||
    setweight(to_tsvector('english', coalesce(company_name, '')),       'A') ||
    setweight(to_tsvector('english', coalesce(email, '')),              'B') ||
    setweight(to_tsvector('english', coalesce(focus_areas, '')),        'B') ||
    setweight(to_tsvector('english', coalesce(primary_focus_area, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')),         'B') ||
    setweight(to_tsvector('english', coalesce(phone, '')),              'C') ||
    setweight(to_tsvector('english', coalesce(company_website, '')),    'C') ||
    setweight(to_tsvector('english', coalesce(tags, '')),               'D') ||
    setweight(to_tsvector('english', coalesce(lifecycle_stage, '')),    'D') ||
    setweight(to_tsvector('english', coalesce(matched_partner_name, '')), 'D')
) STORED;

CREATE INDEX IF NOT EXISTS idx_contractors_search_vector
    ON contractors USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_contractors_trgm
    ON contractors USING GIN((
        lower(coalesce(first_name, '') || ' ' ||
              coalesce(last_name, '') || ' ' ||
              coalesce(name, '') || ' ' ||
              coalesce(company_name, '') || ' ' ||
              coalesce(email, ''))
    ) gin_trgm_ops);


-- ─── 3. EXPERT_CONTRIBUTORS ─────────────────────────────────────────────────
-- Identity (A): first_name, last_name, company, email
-- Secondary (B): title_position, bio, expertise_topics, company_description
-- Tertiary (C): phone, website_url, notes
-- Pipeline ops (D): pipeline_stage, delegated_to_name, article_writer_name
ALTER TABLE expert_contributors
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(first_name, '')),              'A') ||
    setweight(to_tsvector('english', coalesce(last_name, '')),               'A') ||
    setweight(to_tsvector('english', coalesce(company, '')),                 'A') ||
    setweight(to_tsvector('english', coalesce(email, '')),                   'B') ||
    setweight(to_tsvector('english', coalesce(title_position, '')),          'B') ||
    setweight(to_tsvector('english', coalesce(bio, '')),                     'B') ||
    setweight(to_tsvector('english', coalesce(expertise_topics, '')),        'B') ||
    setweight(to_tsvector('english', coalesce(company_description, '')),     'B') ||
    setweight(to_tsvector('english', coalesce(phone, '')),                   'C') ||
    setweight(to_tsvector('english', coalesce(website_url, '')),             'C') ||
    setweight(to_tsvector('english', coalesce(notes, '')),                   'C') ||
    setweight(to_tsvector('english', coalesce(pipeline_stage, '')),          'D') ||
    setweight(to_tsvector('english', coalesce(delegated_to_name, '')),       'D') ||
    setweight(to_tsvector('english', coalesce(article_writer_name, '')),     'D') ||
    setweight(to_tsvector('english', coalesce(onboarding_contact_name, '')), 'D')
) STORED;

CREATE INDEX IF NOT EXISTS idx_expert_contributors_search_vector
    ON expert_contributors USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_expert_contributors_trgm
    ON expert_contributors USING GIN((
        lower(coalesce(first_name, '') || ' ' ||
              coalesce(last_name, '') || ' ' ||
              coalesce(company, '') || ' ' ||
              coalesce(email, ''))
    ) gin_trgm_ops);


-- ─── 4. STRATEGIC_PARTNERS ──────────────────────────────────────────────────
-- Identity (A): company_name, ceo_contact_name, cx_contact_name, sales_contact_name
-- Secondary (B): primary_email, secondary_email, ceo_contact_email,
--                cx_contact_email, sales_contact_email, focus_areas, company_description
-- Tertiary (C): primary_phone, secondary_phone, ceo_contact_phone,
--               cx_contact_phone, sales_contact_phone
-- Roles (D): ceo_contact_title, cx_contact_title, sales_contact_title
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(company_name, '')),         'A') ||
    setweight(to_tsvector('english', coalesce(ceo_contact_name, '')),     'A') ||
    setweight(to_tsvector('english', coalesce(cx_contact_name, '')),      'A') ||
    setweight(to_tsvector('english', coalesce(sales_contact_name, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(onboarding_contact_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(primary_email, '')),        'B') ||
    setweight(to_tsvector('english', coalesce(secondary_email, '')),      'B') ||
    setweight(to_tsvector('english', coalesce(ceo_contact_email, '')),    'B') ||
    setweight(to_tsvector('english', coalesce(cx_contact_email, '')),     'B') ||
    setweight(to_tsvector('english', coalesce(sales_contact_email, '')),  'B') ||
    setweight(to_tsvector('english', coalesce(focus_areas, '')),          'B') ||
    setweight(to_tsvector('english', coalesce(company_description, '')),  'B') ||
    setweight(to_tsvector('english', coalesce(primary_phone, '')),        'C') ||
    setweight(to_tsvector('english', coalesce(secondary_phone, '')),      'C') ||
    setweight(to_tsvector('english', coalesce(ceo_contact_phone, '')),    'C') ||
    setweight(to_tsvector('english', coalesce(cx_contact_phone, '')),     'C') ||
    setweight(to_tsvector('english', coalesce(sales_contact_phone, '')),  'C') ||
    setweight(to_tsvector('english', coalesce(ceo_contact_title, '')),    'D') ||
    setweight(to_tsvector('english', coalesce(cx_contact_title, '')),     'D') ||
    setweight(to_tsvector('english', coalesce(sales_contact_title, '')),  'D')
) STORED;

CREATE INDEX IF NOT EXISTS idx_strategic_partners_search_vector
    ON strategic_partners USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_trgm
    ON strategic_partners USING GIN((
        lower(coalesce(company_name, '') || ' ' ||
              coalesce(ceo_contact_name, '') || ' ' ||
              coalesce(cx_contact_name, '') || ' ' ||
              coalesce(sales_contact_name, '') || ' ' ||
              coalesce(primary_email, ''))
    ) gin_trgm_ops);


-- ─── 5. BOOKS ───────────────────────────────────────────────────────────────
-- Identity (A): title, author, author_email
-- Secondary (B): description, topics, focus_areas_covered, ai_summary,
--                table_of_contents, submitter_name, submitter_email
-- Tertiary (C): author_phone, author_website, ea_name, ea_email
-- Context (D): submitter_company, author_next_focus
ALTER TABLE books
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')),                'A') ||
    setweight(to_tsvector('english', coalesce(author, '')),               'A') ||
    setweight(to_tsvector('english', coalesce(author_email, '')),         'B') ||
    setweight(to_tsvector('english', coalesce(description, '')),          'B') ||
    setweight(to_tsvector('english', coalesce(topics, '')),               'B') ||
    setweight(to_tsvector('english', coalesce(focus_areas_covered, '')),  'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')),           'B') ||
    setweight(to_tsvector('english', coalesce(table_of_contents, '')),    'B') ||
    setweight(to_tsvector('english', coalesce(submitter_name, '')),       'B') ||
    setweight(to_tsvector('english', coalesce(submitter_email, '')),      'B') ||
    setweight(to_tsvector('english', coalesce(author_phone, '')),         'C') ||
    setweight(to_tsvector('english', coalesce(author_website, '')),       'C') ||
    setweight(to_tsvector('english', coalesce(ea_name, '')),              'C') ||
    setweight(to_tsvector('english', coalesce(ea_email, '')),             'C') ||
    setweight(to_tsvector('english', coalesce(submitter_company, '')),    'D') ||
    setweight(to_tsvector('english', coalesce(author_next_focus, '')),    'D')
) STORED;

CREATE INDEX IF NOT EXISTS idx_books_search_vector
    ON books USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_books_trgm
    ON books USING GIN((
        lower(coalesce(title, '') || ' ' ||
              coalesce(author, '') || ' ' ||
              coalesce(author_email, '') || ' ' ||
              coalesce(submitter_name, ''))
    ) gin_trgm_ops);


-- ─── 6. PODCASTS ────────────────────────────────────────────────────────────
-- Identity (A): title, host, host_email, host_company
-- Secondary (B): description, topics, focus_areas_covered, ai_summary,
--                host_bio, submitter_name, submitter_email
-- Tertiary (C): host_phone, host_linkedin, website
-- Context (D): submitter_company
ALTER TABLE podcasts
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')),                'A') ||
    setweight(to_tsvector('english', coalesce(host, '')),                 'A') ||
    setweight(to_tsvector('english', coalesce(host_email, '')),           'A') ||
    setweight(to_tsvector('english', coalesce(host_company, '')),         'A') ||
    setweight(to_tsvector('english', coalesce(description, '')),          'B') ||
    setweight(to_tsvector('english', coalesce(topics, '')),               'B') ||
    setweight(to_tsvector('english', coalesce(focus_areas_covered, '')),  'B') ||
    setweight(to_tsvector('english', coalesce(ai_summary, '')),           'B') ||
    setweight(to_tsvector('english', coalesce(host_bio, '')),             'B') ||
    setweight(to_tsvector('english', coalesce(submitter_name, '')),       'B') ||
    setweight(to_tsvector('english', coalesce(submitter_email, '')),      'B') ||
    setweight(to_tsvector('english', coalesce(host_phone, '')),           'C') ||
    setweight(to_tsvector('english', coalesce(host_linkedin, '')),        'C') ||
    setweight(to_tsvector('english', coalesce(website, '')),              'C') ||
    setweight(to_tsvector('english', coalesce(submitter_company, '')),    'D')
) STORED;

CREATE INDEX IF NOT EXISTS idx_podcasts_search_vector
    ON podcasts USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_podcasts_trgm
    ON podcasts USING GIN((
        lower(coalesce(title, '') || ' ' ||
              coalesce(host, '') || ' ' ||
              coalesce(host_email, '') || ' ' ||
              coalesce(host_company, ''))
    ) gin_trgm_ops);


-- ─── 7. EVENTS ──────────────────────────────────────────────────────────────
-- Identity (A): name (the event name)
-- Secondary (B): focus_areas_covered, plus other event metadata as schema permits
--
-- NOTE: TPX team — please review this section against the full `events`
-- table schema. Add any other searchable text columns (description, host,
-- speakers, location, dates) following the same weight pattern. The 9-row
-- count means index build is instant even with broader column coverage.
ALTER TABLE events
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')),                 'A') ||
    setweight(to_tsvector('english', coalesce(focus_areas_covered, '')),  'B')
    -- TPX: extend with description, host, speakers, etc. as schema permits.
) STORED;

CREATE INDEX IF NOT EXISTS idx_events_search_vector
    ON events USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_events_trgm
    ON events USING GIN((
        lower(coalesce(name, '') || ' ' || coalesce(focus_areas_covered, ''))
    ) gin_trgm_ops);


-- ─── 8. Verify ──────────────────────────────────────────────────────────────
-- Quick smoke after migration:
--   SELECT id, company_name, ts_rank_cd(search_vector, query) AS rank
--     FROM contractors, plainto_tsquery('english', 'james freeman') query
--    WHERE search_vector @@ query
--    ORDER BY rank DESC LIMIT 5;
--
-- Expected: returns matches ranked by relevance. If empty, check that
-- search_vector is populated (`SELECT search_vector FROM contractors LIMIT 1;`)
-- — generated columns populate immediately on column add but only for the
-- rows existing at migration time; new INSERTs auto-populate.

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- FUTURE TPX TABLES — follow this pattern to auto-include in AIOS find()
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Tables we anticipate wanting in AIOS find() but haven't included here
-- (either schema not yet stable, or low priority for v1):
--
--   event_speakers, event_agendas, event_sponsors  — saw add-event-sponsors.sql
--   learning_modules, learning_lessons              — saw create-learning-tables.sql
--   book_chapters                                    — if structured separately
--   contractor_assignments                           — VP→contractor links
--   ai_concierge_conversations                       — needs privacy review first
--   testimonials, quotes, case_studies               — if exist
--   affiliate_*, growth_chronicles                   — long-form content
--   submissions                                      — if separate from contractors
--
-- For each: same shape as the tables above. Add to this file (or a sibling
-- migration), apply, and AIOS picks it up on next restart.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK (run separately if needed)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- BEGIN;
--   DROP INDEX IF EXISTS idx_events_trgm;
--   DROP INDEX IF EXISTS idx_events_search_vector;
--   ALTER TABLE events DROP COLUMN IF EXISTS search_vector;
--
--   DROP INDEX IF EXISTS idx_podcasts_trgm;
--   DROP INDEX IF EXISTS idx_podcasts_search_vector;
--   ALTER TABLE podcasts DROP COLUMN IF EXISTS search_vector;
--
--   DROP INDEX IF EXISTS idx_books_trgm;
--   DROP INDEX IF EXISTS idx_books_search_vector;
--   ALTER TABLE books DROP COLUMN IF EXISTS search_vector;
--
--   DROP INDEX IF EXISTS idx_strategic_partners_trgm;
--   DROP INDEX IF EXISTS idx_strategic_partners_search_vector;
--   ALTER TABLE strategic_partners DROP COLUMN IF EXISTS search_vector;
--
--   DROP INDEX IF EXISTS idx_expert_contributors_trgm;
--   DROP INDEX IF EXISTS idx_expert_contributors_search_vector;
--   ALTER TABLE expert_contributors DROP COLUMN IF EXISTS search_vector;
--
--   DROP INDEX IF EXISTS idx_contractors_trgm;
--   DROP INDEX IF EXISTS idx_contractors_search_vector;
--   ALTER TABLE contractors DROP COLUMN IF EXISTS search_vector;
--
--   -- Leave pg_trgm extension installed; other code may rely on it.
--   -- DROP EXTENSION IF EXISTS pg_trgm;
-- COMMIT;
