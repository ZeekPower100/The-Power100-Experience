-- AI Persona chat logs (per-turn record for IC contributor lander chat panel)
-- Apply locally:  powershell -Command ".\quick-db.bat \"$(cat tpe-database/migrations/2026-04-27-ai-persona-chat-logs.sql | tr -d '\n')\""
-- Apply prod:     mcp__aws-production__exec PGPASSWORD=$PROD_DB_PASSWORD psql -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME -f /tmp/migration.sql

CREATE TABLE IF NOT EXISTS ai_persona_chat_logs (
    id                       SERIAL PRIMARY KEY,
    contributor_p100_id      INTEGER NOT NULL,
    contributor_ic_id        INTEGER,
    contributor_name         TEXT,
    member_wp_id             INTEGER,
    member_email             TEXT,
    user_message             TEXT NOT NULL,
    assistant_message        TEXT,
    knowledge_pack_hash      TEXT,
    model                    TEXT,
    input_tokens             INTEGER,
    output_tokens            INTEGER,
    cache_creation_tokens    INTEGER,
    cache_read_tokens        INTEGER,
    latency_ms               INTEGER,
    error_message            TEXT,
    request_ip               TEXT,
    user_agent               TEXT,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rate-limit lookup index: count messages per (member, contributor) in last 24h
CREATE INDEX IF NOT EXISTS idx_persona_logs_member_contrib
    ON ai_persona_chat_logs (member_wp_id, contributor_p100_id, created_at DESC);

-- Per-contributor analytics index
CREATE INDEX IF NOT EXISTS idx_persona_logs_contrib_recent
    ON ai_persona_chat_logs (contributor_p100_id, created_at DESC);
