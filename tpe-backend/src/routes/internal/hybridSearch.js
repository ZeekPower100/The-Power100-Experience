// DATABASE-CHECKED: entity_embeddings (via hybridSearchService — service-checked) verified 2026-05-02
// ================================================================
// AIOS Internal Hybrid Search Endpoint
// ================================================================
// Cross-system contract endpoint that exposes TPX's existing hybridSearchService
// (BM25 + pgvector hybrid) to AIOS as a service-to-service HTTP endpoint.
//
// AIOS calls this when its find() primitive routes a semantic/concept query
// (vs identity queries which AIOS handles natively via its tsvector layer).
// AIOS does NOT duplicate TPX's entity_embeddings table — TPX stays the
// source of truth for content embeddings; AIOS becomes a second consumer
// alongside the AI Concierge.
//
// Spec: power100-aios/docs/TPX_HYBRID_SEARCH_CONTRACT.md
// ================================================================

const express = require('express');
const router = express.Router();
const hybridSearchService = require('../../services/hybridSearchService');

// ─── Auth: distinct header from the existing X-API-Key (service-API tier).
// X-AIOS-INTERNAL-KEY is the internal-tier service-to-service key shared
// only between TPX prod and AIOS prod. Generate via `openssl rand -hex 32`.
function aiosInternalAuth(req, res, next) {
  const expected = process.env.AIOS_INTERNAL_KEY;
  if (!expected) {
    console.error('[AIOS hybrid-search] AIOS_INTERNAL_KEY env var not set');
    return res.status(503).json({ ok: false, error: 'AIOS_INTERNAL_KEY not configured on TPX server' });
  }
  const provided = req.get('X-AIOS-INTERNAL-KEY');
  if (!provided || provided !== expected) {
    return res.status(401).json({ ok: false, error: 'invalid AIOS internal key' });
  }
  next();
}

// ─── Cost estimation for the query embedding (text-embedding-ada-002 @ $0.0001/1K tokens).
// Tokens approximated as chars/4 (industry rule of thumb). Acceptable error band.
function estimateEmbeddingCostUsd(text) {
  const tokens = Math.ceil((text || '').length / 4);
  return Number(((tokens / 1000) * 0.0001).toFixed(6));
}

// ─── Helpers
function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

// POST /api/internal/hybrid-search
router.post('/', aiosInternalAuth, async (req, res) => {
  const startedAt = Date.now();
  try {
    const body = req.body || {};
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return res.status(400).json({ ok: false, error: 'query required' });
    }

    // Clamp + default per the contract
    const limit = clamp(body.limit, 1, 20, 5);
    const bm25Weight = clamp(body.bm25Weight, 0, 1, 0.4);
    const vectorWeight = clamp(body.vectorWeight, 0, 1, 0.6);
    const minScore = clamp(body.minScore, 0, 1, 0);
    const contractorId = (body.contractorId == null) ? null : Number(body.contractorId) || null;
    const entityTypes = Array.isArray(body.entityTypes) && body.entityTypes.length > 0
      ? body.entityTypes.filter(t => typeof t === 'string')
      : null;

    // Wrap the existing service — DON'T re-implement
    const rawResults = await hybridSearchService.search(query, {
      contractorId,
      limit,
      entityTypes,
      bm25Weight,
      vectorWeight,
      minScore,
    });

    // Translate service shape (camelCase, scores nested) → contract shape
    // (snake_case at top level). Keep service signature stable; translate at edge.
    const results = (rawResults || []).map(r => ({
      entity_type: r.entityType,
      entity_id: r.entityId,
      content: r.content,
      metadata: r.metadata,
      bm25_score: r.scores ? r.scores.bm25 : null,
      vector_score: r.scores ? r.scores.vector : null,
      hybrid_score: r.scores ? r.scores.hybrid : null,
    }));

    const elapsedMs = Date.now() - startedAt;
    const response = {
      ok: true,
      results,
      elapsed_ms: elapsedMs,
      weights_used: { bm25: bm25Weight, vector: vectorWeight },
      query_embedding_cost_usd: estimateEmbeddingCostUsd(query),
    };

    if (results.length === 0) {
      response.no_match_reason = (minScore > 0)
        ? 'below_min_score'
        : (entityTypes ? 'no_indexed_content_for_entity_types' : 'no_matches');
    }

    return res.json(response);
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.error('[AIOS hybrid-search] failed:', msg);

    // OpenAI rate-limit gets a distinct envelope so AIOS can back off
    if (/rate.?limit|429|too many requests/i.test(msg)) {
      return res.status(429).json({ ok: false, error: 'rate limit', retry_after_ms: 5000 });
    }

    // Generic upstream failure (embedding API / DB / breaker)
    return res.status(503).json({
      ok: false,
      error: `hybridSearchService unavailable: ${msg}`,
    });
  }
});

module.exports = router;
