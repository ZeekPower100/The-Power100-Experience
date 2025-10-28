# PARTNER PORTAL PHASE 5 - Integration & API
## Implementation Plan

**Document Type**: Partner Portal Feature (NOT AI Concierge Phase 5)
**Phase Context**: Partner Self-Service Portal - Phase 5 of 5
**Status**: Ready for Implementation
**Timeline**: Week 9-10 (80 hours / 2 weeks)
**Priority**: Medium
**Date Created**: October 27, 2025

---

## 🎯 PHASE IDENTIFICATION

**⚠️ IMPORTANT CLARIFICATION:**

This document describes **Partner Portal Phase 5: Integration & API**, which enables external system integration for strategic partners.

**This is NOT:**
- ❌ AI Concierge Phase 5 (Production Optimization) - See `docs/features/ai-concierge/phase-5/`
- ❌ Overall Project Phase 5 (Intelligent Matching & Analytics) - See `docs/database-management-roadmap.md`

**Related Documentation:**
- Partner Portal Overview: `docs/features/partner-portal/PARTNER-PORTAL-OVERVIEW.md`
- Partner Portal Phase 1-4: `docs/features/partner-portal/phase-1/` through `phase-4/`

---

## 📋 EXECUTIVE SUMMARY

### Goal
Enable partners to integrate Power100 Experience data with their existing systems through secure APIs, webhooks, and CRM connectors, reducing manual work and improving partner engagement.

### Business Impact
- **For Partners**: Automate lead management, integrate with existing workflows, real-time notifications
- **For Power100**: Increased partner engagement, higher retention, competitive differentiation, premium pricing opportunity

### Key Deliverables
1. ✅ REST API endpoints for programmatic data access
2. ✅ API key management with scopes and permissions
3. ✅ Webhook system for real-time event notifications
4. ✅ CRM connectors (Salesforce, HubSpot, Pipedrive, Zoho)
5. ✅ Comprehensive API documentation with Swagger UI

---

## 🏗️ ARCHITECTURE OVERVIEW

### System Flow
```
Partner System
    ↓ (API Key Authentication)
TPX API Gateway
    ↓ (Rate Limiting & Validation)
Partner API Controller
    ↓ (Authorization & Scopes)
Database / Services
    ↓ (Data Retrieval/Update)
Response → Partner System
```

### Webhook Flow
```
TPX Event Trigger (Lead Created, Score Updated, etc.)
    ↓
Webhook Service
    ↓ (HMAC Signature)
Partner Webhook URL
    ↓ (Delivery Confirmation)
Webhook Delivery Log
    ↓ (Retry on Failure - Exponential Backoff)
```

### CRM Integration Flow
```
TPX Lead Data
    ↓ (Field Mapping)
CRM Connector Service
    ↓ (Bidirectional Sync)
Partner CRM (Salesforce, HubSpot, etc.)
    ↓ (Sync Status)
Integration Log
```

---

## 📊 DATABASE SCHEMA

### 1. API Keys Table
```sql
-- DATABASE-CHECKED: partner_api_keys (NEW TABLE - To be created in Phase 5)
CREATE TABLE partner_api_keys (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES strategic_partners(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL, -- Human-readable name (e.g., "Production API Key")
  api_key TEXT UNIQUE NOT NULL, -- Public key shown to partner
  key_hash TEXT NOT NULL, -- bcrypt hashed key for secure storage
  scopes TEXT[] NOT NULL DEFAULT '{}', -- ['read:leads', 'write:leads', 'read:analytics']
  ip_whitelist TEXT[], -- Optional IP restrictions (e.g., ['192.168.1.1', '10.0.0.0/24'])
  last_used_at TIMESTAMP,
  request_count INTEGER DEFAULT 0, -- Total requests made with this key
  expires_at TIMESTAMP, -- NULL = never expires
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_partner_api_keys_partner ON partner_api_keys(partner_id);
CREATE INDEX idx_partner_api_keys_active ON partner_api_keys(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_partner_api_keys_key ON partner_api_keys(api_key);
```

### 2. Webhook Subscriptions Table
```sql
-- DATABASE-CHECKED: partner_webhooks (NEW TABLE - To be created in Phase 5)
CREATE TABLE partner_webhooks (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES strategic_partners(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL, -- Partner's endpoint to receive webhooks
  events TEXT[] NOT NULL DEFAULT '{}', -- ['lead.created', 'lead.updated', 'powerconfidence.updated']
  secret TEXT NOT NULL, -- HMAC secret for signature verification
  is_active BOOLEAN DEFAULT TRUE,
  retry_count INTEGER DEFAULT 3, -- Number of retry attempts on failure
  timeout_seconds INTEGER DEFAULT 30, -- Request timeout
  last_delivery_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Validation
  CONSTRAINT valid_webhook_url CHECK (webhook_url ~ '^https?://.*')
);

-- Indexes
CREATE INDEX idx_partner_webhooks_partner ON partner_webhooks(partner_id);
CREATE INDEX idx_partner_webhooks_active ON partner_webhooks(is_active) WHERE is_active = TRUE;
```

### 3. Webhook Delivery Log Table
```sql
-- DATABASE-CHECKED: webhook_deliveries (NEW TABLE - To be created in Phase 5)
CREATE TABLE webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES partner_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'lead.created', 'powerconfidence.updated', etc.
  payload JSONB NOT NULL, -- Full webhook payload
  response_status INTEGER, -- HTTP status code (200, 404, 500, etc.)
  response_body TEXT, -- Response from partner webhook
  delivery_attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMP, -- NULL if not yet delivered
  failed_at TIMESTAMP, -- NULL if successful
  error_message TEXT, -- Error details if failed
  created_at TIMESTAMP DEFAULT NOW(),

  -- Performance optimization
  CONSTRAINT valid_status CHECK (response_status IS NULL OR (response_status >= 100 AND response_status < 600))
);

-- Indexes for monitoring and debugging
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type);
CREATE INDEX idx_webhook_deliveries_failed ON webhook_deliveries(failed_at) WHERE failed_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_recent ON webhook_deliveries(created_at DESC);
```

### 4. CRM Integrations Table
```sql
-- DATABASE-CHECKED: partner_crm_integrations (NEW TABLE - To be created in Phase 5)
CREATE TABLE partner_crm_integrations (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES strategic_partners(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL, -- 'salesforce', 'hubspot', 'pipedrive', 'zoho', 'custom'
  integration_name TEXT NOT NULL, -- Human-readable name
  crm_credentials JSONB NOT NULL, -- Encrypted credentials (API keys, OAuth tokens)
  field_mapping JSONB NOT NULL DEFAULT '{}', -- TPX field → CRM field mapping
  sync_direction TEXT NOT NULL DEFAULT 'outbound', -- 'inbound', 'outbound', 'bidirectional'
  sync_frequency TEXT NOT NULL DEFAULT 'realtime', -- 'realtime', 'hourly', 'daily'
  last_sync_at TIMESTAMP,
  last_sync_status TEXT, -- 'success', 'failed', 'partial'
  sync_error_message TEXT,
  records_synced INTEGER DEFAULT 0, -- Total records synced
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Validation
  CONSTRAINT valid_crm_type CHECK (crm_type IN ('salesforce', 'hubspot', 'pipedrive', 'zoho', 'custom')),
  CONSTRAINT valid_sync_direction CHECK (sync_direction IN ('inbound', 'outbound', 'bidirectional')),
  CONSTRAINT valid_sync_frequency CHECK (sync_frequency IN ('realtime', 'hourly', 'daily'))
);

-- Indexes
CREATE INDEX idx_partner_crm_integrations_partner ON partner_crm_integrations(partner_id);
CREATE INDEX idx_partner_crm_integrations_active ON partner_crm_integrations(is_active) WHERE is_active = TRUE;
```

### 5. API Usage Tracking Table
```sql
-- DATABASE-CHECKED: partner_api_usage (NEW TABLE - To be created in Phase 5)
CREATE TABLE partner_api_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES partner_api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL, -- '/api/partner-api/leads', '/api/partner-api/analytics'
  method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
  request_params JSONB, -- Query params or request body
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL, -- Response time in milliseconds
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  called_at TIMESTAMP DEFAULT NOW(),

  -- Validation
  CONSTRAINT valid_method CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  CONSTRAINT valid_status CHECK (response_status >= 100 AND response_status < 600)
);

-- Indexes for analytics and monitoring
CREATE INDEX idx_partner_api_usage_key ON partner_api_usage(api_key_id);
CREATE INDEX idx_partner_api_usage_date ON partner_api_usage(called_at DESC);
CREATE INDEX idx_partner_api_usage_endpoint ON partner_api_usage(endpoint);
CREATE INDEX idx_partner_api_usage_status ON partner_api_usage(response_status);
```

---

## 🔐 SECURITY ARCHITECTURE

### API Key Security
1. **Generation**: Cryptographically secure random keys (32 bytes, base64 encoded)
2. **Storage**: Keys hashed with bcrypt before storage (only hash in database)
3. **Transmission**: Keys shown ONCE during creation, then never retrievable
4. **Authentication**: Bearer token in Authorization header
5. **Validation**: Hash comparison on each request

**Example**:
```
Generated Key: pk_live_1a2b3c4d5e6f7g8h9i0j
Stored Hash:   $2b$10$N9qo8uLOickgx2ZMRZoMye...
```

### Webhook Security
1. **HMAC Signatures**: SHA-256 signature with secret key
2. **Timestamp Validation**: Reject webhooks older than 5 minutes
3. **HTTPS Only**: All webhook URLs must use HTTPS
4. **Secret Rotation**: Partners can regenerate webhook secrets

**Signature Calculation**:
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(timestamp + '.' + JSON.stringify(payload))
  .digest('hex');

// Include in header: X-TPX-Signature: t=1234567890,v1=abc123def456...
```

### Rate Limiting
- **Default**: 1000 requests per hour per API key
- **Configurable**: Admin can adjust per-partner limits
- **Response Headers**: Include rate limit status in responses
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 847
  X-RateLimit-Reset: 1698765432
  ```

### IP Whitelisting (Optional)
- Partners can restrict API key usage to specific IP addresses
- CIDR notation supported (e.g., `192.168.1.0/24`)
- Bypass available for development (disabled in production)

### Audit Logging
- **All API calls logged**: Endpoint, method, status, response time, IP
- **Retention**: 90 days for compliance
- **Analytics**: Usage dashboards for partners and admins
- **Alerts**: Notify on suspicious activity (unusual volume, failed auth)

---

## 🛠️ IMPLEMENTATION TASKS

### WEEK 9: Core API & Infrastructure

#### Day 1-2: REST API Endpoints Development (16 hours)

**File**: `tpe-backend/src/controllers/partnerApiController.js` (NEW)

**Endpoints to Implement**:

```javascript
// DATABASE-CHECKED: Will verify all tables before implementation

/**
 * Partner API Controller
 * Provides programmatic access to partner data via REST API
 */

const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// GET /api/partner-api/leads
// Returns: Paginated list of leads with filters
async function getLeads(req, res) {
  try {
    const partnerId = req.apiAuth.partnerId; // Set by API auth middleware
    const { status, page = 1, limit = 50, search } = req.query;

    // Build WHERE clause
    const whereClauses = ['cpm.partner_id = $1'];
    const params = [partnerId];
    let paramCounter = 2;

    if (status) {
      whereClauses.push(`cpm.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }

    if (search) {
      whereClauses.push(`(
        LOWER(c.first_name) LIKE $${paramCounter} OR
        LOWER(c.last_name) LIKE $${paramCounter} OR
        LOWER(c.company_name) LIKE $${paramCounter}
      )`);
      params.push(`%${search.toLowerCase()}%`);
      paramCounter++;
    }

    const offset = (page - 1) * limit;

    const leadsQuery = `
      SELECT
        cpm.id,
        cpm.contractor_id,
        cpm.match_score,
        cpm.status,
        cpm.engagement_stage,
        cpm.last_contact_date,
        cpm.next_follow_up_date,
        cpm.created_at,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company_name,
        c.revenue_tier
      FROM contractor_partner_matches cpm
      JOIN contractors c ON c.id = cpm.contractor_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY cpm.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    params.push(limit, offset);

    const result = await query(leadsQuery, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('[Partner API] Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads'
    });
  }
}

// GET /api/partner-api/analytics
// Returns: Performance metrics and analytics
async function getAnalytics(req, res) {
  try {
    const partnerId = req.apiAuth.partnerId;
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y

    // Calculate date range
    const intervalMap = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year'
    };
    const interval = intervalMap[period] || '30 days';

    const analyticsQuery = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'active') as active_leads,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
        ROUND(AVG(match_score), 2) as avg_match_score
      FROM contractor_partner_matches
      WHERE partner_id = $1
        AND created_at > NOW() - INTERVAL '${interval}'
    `;

    const result = await query(analyticsQuery, [partnerId]);

    res.json({
      success: true,
      data: result.rows[0],
      period
    });
  } catch (error) {
    console.error('[Partner API] Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
}

// GET /api/partner-api/profile
// Returns: Partner profile data
async function getProfile(req, res) {
  try {
    const partnerId = req.apiAuth.partnerId;

    const profileQuery = `
      SELECT
        id,
        company_name,
        contact_email,
        power_confidence_score,
        industry_rank,
        average_satisfaction,
        total_contractor_engagements
      FROM strategic_partners
      WHERE id = $1
    `;

    const result = await query(profileQuery, [partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[Partner API] Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
}

// PUT /api/partner-api/lead/:leadId
// Updates: Lead status and engagement stage
async function updateLead(req, res) {
  try {
    const partnerId = req.apiAuth.partnerId;
    const { leadId } = req.params;
    const { status, engagement_stage, next_follow_up_date, notes } = req.body;

    // Verify lead belongs to partner
    const verifyQuery = `
      SELECT id FROM contractor_partner_matches
      WHERE id = $1 AND partner_id = $2
    `;
    const verifyResult = await query(verifyQuery, [leadId, partnerId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or access denied'
      });
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];
    let paramCounter = 1;

    if (status) {
      updateFields.push(`status = $${paramCounter}`);
      updateParams.push(status);
      paramCounter++;
    }

    if (engagement_stage) {
      updateFields.push(`engagement_stage = $${paramCounter}`);
      updateParams.push(engagement_stage);
      paramCounter++;
    }

    if (next_follow_up_date !== undefined) {
      updateFields.push(`next_follow_up_date = $${paramCounter}`);
      updateParams.push(next_follow_up_date || null);
      paramCounter++;
    }

    updateFields.push('last_contact_date = NOW()');
    updateFields.push('updated_at = NOW()');

    updateParams.push(leadId, partnerId);

    const updateQuery = `
      UPDATE contractor_partner_matches
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter} AND partner_id = $${paramCounter + 1}
      RETURNING *
    `;

    const result = await query(updateQuery, updateParams);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[Partner API] Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead'
    });
  }
}

// GET /api/partner-api/powerconfidence-history
// Returns: Historical PowerConfidence scores
async function getPowerConfidenceHistory(req, res) {
  try {
    const partnerId = req.apiAuth.partnerId;

    const historyQuery = `
      SELECT
        period_start,
        period_end,
        metric_value as score,
        metadata
      FROM partner_analytics
      WHERE partner_id = $1
        AND metric_type = 'powerconfidence_score'
      ORDER BY period_end DESC
      LIMIT 12
    `;

    const result = await query(historyQuery, [partnerId]);

    const history = result.rows.map(row => ({
      period: `${row.period_start.toISOString().split('T')[0]} to ${row.period_end.toISOString().split('T')[0]}`,
      score: parseInt(row.score),
      metadata: safeJsonParse(row.metadata, {})
    }));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('[Partner API] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PowerConfidence history'
    });
  }
}

module.exports = {
  getLeads,
  getAnalytics,
  getProfile,
  updateLead,
  getPowerConfidenceHistory
};
```

**API Routes File**: `tpe-backend/src/routes/partnerApiRoutes.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const partnerApiController = require('../controllers/partnerApiController');
const { authenticateApiKey } = require('../middleware/apiKeyAuth');
const { rateLimitApi } = require('../middleware/rateLimit');

// All routes require API key authentication
router.use(authenticateApiKey);

// All routes have rate limiting
router.use(rateLimitApi);

// Lead management
router.get('/leads', partnerApiController.getLeads);
router.put('/lead/:leadId', partnerApiController.updateLead);

// Analytics
router.get('/analytics', partnerApiController.getAnalytics);
router.get('/powerconfidence-history', partnerApiController.getPowerConfidenceHistory);

// Profile
router.get('/profile', partnerApiController.getProfile);

module.exports = router;
```

---

#### Day 3: API Key Management System (8 hours)

**File**: `tpe-backend/src/controllers/apiKeyManagementController.js` (NEW)

**Features**:

```javascript
// DATABASE-CHECKED: partner_api_keys table

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');

/**
 * Generate a new API key for partner
 * POST /api/partner-portal/api-keys
 */
async function generateApiKey(req, res) {
  try {
    const partnerId = req.partnerId; // From partner auth middleware
    const { key_name, scopes = ['read:leads', 'read:analytics'], expires_in_days = null } = req.body;

    if (!key_name || key_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'API key name is required (minimum 3 characters)'
      });
    }

    // Generate secure random API key
    const apiKey = 'pk_' + crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Calculate expiry date
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);
    }

    const insertQuery = `
      INSERT INTO partner_api_keys
        (partner_id, key_name, api_key, key_hash, scopes, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, key_name, scopes, expires_at, created_at
    `;

    const result = await query(insertQuery, [
      partnerId,
      key_name.trim(),
      apiKey, // Store plaintext temporarily for display
      keyHash,
      scopes,
      expiresAt
    ]);

    // Immediately update to remove plaintext key from database
    await query(
      'UPDATE partner_api_keys SET api_key = $1 WHERE id = $2',
      [apiKey.substring(0, 8) + '...' + apiKey.slice(-4), result.rows[0].id]
    );

    res.json({
      success: true,
      api_key: apiKey, // ONLY shown once during creation
      key_info: result.rows[0],
      warning: 'This API key will only be shown once. Store it securely.'
    });
  } catch (error) {
    console.error('[API Key Management] Error generating key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API key'
    });
  }
}

/**
 * List all API keys for partner (without revealing keys)
 * GET /api/partner-portal/api-keys
 */
async function listApiKeys(req, res) {
  try {
    const partnerId = req.partnerId;

    const listQuery = `
      SELECT
        id,
        key_name,
        api_key, -- Masked key (pk_abc...xyz)
        scopes,
        last_used_at,
        request_count,
        expires_at,
        is_active,
        created_at
      FROM partner_api_keys
      WHERE partner_id = $1
      ORDER BY created_at DESC
    `;

    const result = await query(listQuery, [partnerId]);

    res.json({
      success: true,
      api_keys: result.rows
    });
  } catch (error) {
    console.error('[API Key Management] Error listing keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys'
    });
  }
}

/**
 * Revoke an API key
 * DELETE /api/partner-portal/api-keys/:keyId
 */
async function revokeApiKey(req, res) {
  try {
    const partnerId = req.partnerId;
    const { keyId } = req.params;

    const revokeQuery = `
      UPDATE partner_api_keys
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND partner_id = $2
      RETURNING id, key_name
    `;

    const result = await query(revokeQuery, [keyId, partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    res.json({
      success: true,
      message: `API key "${result.rows[0].key_name}" has been revoked`
    });
  } catch (error) {
    console.error('[API Key Management] Error revoking key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key'
    });
  }
}

/**
 * Get API key usage statistics
 * GET /api/partner-portal/api-keys/:keyId/usage
 */
async function getApiKeyUsage(req, res) {
  try {
    const partnerId = req.partnerId;
    const { keyId } = req.params;
    const { period = '7d' } = req.query;

    // Verify key belongs to partner
    const verifyQuery = `
      SELECT id FROM partner_api_keys
      WHERE id = $1 AND partner_id = $2
    `;
    const verifyResult = await query(verifyQuery, [keyId, partnerId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    const intervalMap = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };

    const usageQuery = `
      SELECT
        endpoint,
        method,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as success_count,
        COUNT(*) FILTER (WHERE response_status >= 400) as error_count
      FROM partner_api_usage
      WHERE api_key_id = $1
        AND called_at > NOW() - INTERVAL '${intervalMap[period] || '7 days'}'
      GROUP BY endpoint, method
      ORDER BY request_count DESC
    `;

    const result = await query(usageQuery, [keyId]);

    res.json({
      success: true,
      usage: result.rows,
      period
    });
  } catch (error) {
    console.error('[API Key Management] Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API key usage'
    });
  }
}

module.exports = {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  getApiKeyUsage
};
```

**Authentication Middleware**: `tpe-backend/src/middleware/apiKeyAuth.js` (NEW)

```javascript
// DATABASE-CHECKED: partner_api_keys table

const bcrypt = require('bcrypt');
const { query } = require('../config/database');

/**
 * API Key Authentication Middleware
 * Validates API key from Authorization header
 */
async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Include "Authorization: Bearer YOUR_API_KEY" header.'
      });
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

    // Find all active API keys (we need to check hash)
    const keysQuery = `
      SELECT
        pak.id,
        pak.partner_id,
        pak.key_hash,
        pak.scopes,
        pak.ip_whitelist,
        pak.expires_at,
        pak.is_active,
        sp.company_name
      FROM partner_api_keys pak
      JOIN strategic_partners sp ON sp.id = pak.partner_id
      WHERE pak.is_active = TRUE
        AND (pak.expires_at IS NULL OR pak.expires_at > NOW())
    `;

    const result = await query(keysQuery);

    // Check each key hash until we find a match
    let matchedKey = null;
    for (const row of result.rows) {
      const isMatch = await bcrypt.compare(apiKey, row.key_hash);
      if (isMatch) {
        matchedKey = row;
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Check IP whitelist if configured
    if (matchedKey.ip_whitelist && matchedKey.ip_whitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      const isAllowed = matchedKey.ip_whitelist.some(allowedIp => {
        // Simple IP check (enhance with CIDR support if needed)
        return clientIp === allowedIp;
      });

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'IP address not whitelisted'
        });
      }
    }

    // Update last_used_at and request_count
    await query(
      'UPDATE partner_api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = $1',
      [matchedKey.id]
    );

    // Attach auth info to request
    req.apiAuth = {
      keyId: matchedKey.id,
      partnerId: matchedKey.partner_id,
      partnerName: matchedKey.company_name,
      scopes: matchedKey.scopes
    };

    next();
  } catch (error) {
    console.error('[API Key Auth] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Scope validation middleware
 * Usage: requireScope('read:leads')
 */
function requireScope(requiredScope) {
  return (req, res, next) => {
    if (!req.apiAuth || !req.apiAuth.scopes.includes(requiredScope)) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required scope: ${requiredScope}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateApiKey,
  requireScope
};
```

---

#### Day 4: Webhook Infrastructure (8 hours)

**File**: `tpe-backend/src/services/webhookService.js` (NEW)

```javascript
// DATABASE-CHECKED: partner_webhooks, webhook_deliveries tables

const crypto = require('crypto');
const axios = require('axios');
const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Webhook Service
 * Handles webhook subscriptions and delivery
 */

class WebhookService {
  /**
   * Send webhook to partner
   * @param {string} eventType - Event type (e.g., 'lead.created')
   * @param {object} payload - Webhook payload
   * @param {number} partnerId - Partner ID (optional, sends to all if not provided)
   */
  async sendWebhook(eventType, payload, partnerId = null) {
    try {
      // Get all active webhooks for this event type
      let webhooksQuery = `
        SELECT id, webhook_url, secret, retry_count, timeout_seconds
        FROM partner_webhooks
        WHERE is_active = TRUE
          AND $1 = ANY(events)
      `;
      const params = [eventType];

      if (partnerId) {
        webhooksQuery += ' AND partner_id = $2';
        params.push(partnerId);
      }

      const result = await query(webhooksQuery, params);

      // Send to each webhook
      for (const webhook of result.rows) {
        await this.deliverWebhook(webhook, eventType, payload);
      }
    } catch (error) {
      console.error('[Webhook Service] Error sending webhooks:', error);
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  async deliverWebhook(webhook, eventType, payload, attempt = 1) {
    const deliveryId = await this.logDeliveryAttempt(webhook.id, eventType, payload);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(webhook.secret, timestamp, payload);

      const response = await axios.post(webhook.webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-TPX-Signature': `t=${timestamp},v1=${signature}`,
          'X-TPX-Event': eventType
        },
        timeout: webhook.timeout_seconds * 1000
      });

      // Success
      await this.markDeliverySuccess(deliveryId, response.status, response.data);

      // Update last_delivery_at
      await query(
        'UPDATE partner_webhooks SET last_delivery_at = NOW() WHERE id = $1',
        [webhook.id]
      );

      return true;
    } catch (error) {
      const errorMessage = error.response?.data || error.message;
      const statusCode = error.response?.status || 0;

      if (attempt < webhook.retry_count) {
        // Retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[Webhook Service] Retry attempt ${attempt + 1} for webhook ${webhook.id} in ${delay}ms`);

        setTimeout(() => {
          this.deliverWebhook(webhook, eventType, payload, attempt + 1);
        }, delay);
      } else {
        // Failed after all retries
        await this.markDeliveryFailure(deliveryId, statusCode, errorMessage, attempt);
      }

      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook
   */
  generateSignature(secret, timestamp, payload) {
    const signedPayload = `${timestamp}.${safeJsonStringify(payload)}`;
    return crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
  }

  /**
   * Log delivery attempt
   */
  async logDeliveryAttempt(webhookId, eventType, payload) {
    const insertQuery = `
      INSERT INTO webhook_deliveries
        (webhook_id, event_type, payload, delivery_attempts)
      VALUES ($1, $2, $3, 1)
      RETURNING id
    `;

    const result = await query(insertQuery, [
      webhookId,
      eventType,
      safeJsonStringify(payload)
    ]);

    return result.rows[0].id;
  }

  /**
   * Mark delivery as successful
   */
  async markDeliverySuccess(deliveryId, statusCode, responseBody) {
    await query(
      `UPDATE webhook_deliveries
       SET delivered_at = NOW(),
           response_status = $2,
           response_body = $3
       WHERE id = $1`,
      [deliveryId, statusCode, safeJsonStringify(responseBody)]
    );
  }

  /**
   * Mark delivery as failed
   */
  async markDeliveryFailure(deliveryId, statusCode, errorMessage, attempts) {
    await query(
      `UPDATE webhook_deliveries
       SET failed_at = NOW(),
           response_status = $2,
           error_message = $3,
           delivery_attempts = $4
       WHERE id = $1`,
      [deliveryId, statusCode, errorMessage, attempts]
    );
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId) {
    const webhookQuery = `
      SELECT id, webhook_url, secret, timeout_seconds
      FROM partner_webhooks
      WHERE id = $1
    `;

    const result = await query(webhookQuery, [webhookId]);

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    const testPayload = {
      test: true,
      message: 'This is a test webhook from Power100 Experience',
      timestamp: new Date().toISOString()
    };

    return await this.deliverWebhook(result.rows[0], 'test.webhook', testPayload);
  }
}

module.exports = new WebhookService();
```

**Webhook Management Controller**: `tpe-backend/src/controllers/webhookManagementController.js` (NEW)

```javascript
// DATABASE-CHECKED: partner_webhooks, webhook_deliveries tables

const crypto = require('crypto');
const { query } = require('../config/database');
const webhookService = require('../services/webhookService');

/**
 * Create webhook subscription
 * POST /api/partner-portal/webhooks
 */
async function createWebhook(req, res) {
  try {
    const partnerId = req.partnerId;
    const { webhook_url, events = [] } = req.body;

    if (!webhook_url || !webhook_url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'Valid HTTPS webhook URL is required'
      });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one event type is required'
      });
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    const insertQuery = `
      INSERT INTO partner_webhooks
        (partner_id, webhook_url, events, secret)
      VALUES ($1, $2, $3, $4)
      RETURNING id, webhook_url, events, created_at
    `;

    const result = await query(insertQuery, [
      partnerId,
      webhook_url,
      events,
      secret
    ]);

    res.json({
      success: true,
      webhook: result.rows[0],
      secret, // Show secret once during creation
      warning: 'Store this secret securely. It will be used to verify webhook signatures.'
    });
  } catch (error) {
    console.error('[Webhook Management] Error creating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook'
    });
  }
}

/**
 * List webhooks for partner
 * GET /api/partner-portal/webhooks
 */
async function listWebhooks(req, res) {
  try {
    const partnerId = req.partnerId;

    const listQuery = `
      SELECT
        id,
        webhook_url,
        events,
        is_active,
        last_delivery_at,
        retry_count,
        timeout_seconds,
        created_at
      FROM partner_webhooks
      WHERE partner_id = $1
      ORDER BY created_at DESC
    `;

    const result = await query(listQuery, [partnerId]);

    res.json({
      success: true,
      webhooks: result.rows
    });
  } catch (error) {
    console.error('[Webhook Management] Error listing webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list webhooks'
    });
  }
}

/**
 * Test webhook delivery
 * POST /api/partner-portal/webhooks/:webhookId/test
 */
async function testWebhook(req, res) {
  try {
    const partnerId = req.partnerId;
    const { webhookId } = req.params;

    // Verify webhook belongs to partner
    const verifyQuery = `
      SELECT id FROM partner_webhooks
      WHERE id = $1 AND partner_id = $2
    `;
    const verifyResult = await query(verifyQuery, [webhookId, partnerId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    const success = await webhookService.testWebhook(webhookId);

    res.json({
      success: true,
      delivered: success,
      message: success ? 'Test webhook delivered successfully' : 'Test webhook delivery failed'
    });
  } catch (error) {
    console.error('[Webhook Management] Error testing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test webhook'
    });
  }
}

/**
 * Get webhook delivery logs
 * GET /api/partner-portal/webhooks/:webhookId/deliveries
 */
async function getWebhookDeliveries(req, res) {
  try {
    const partnerId = req.partnerId;
    const { webhookId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Verify webhook belongs to partner
    const verifyQuery = `
      SELECT pw.id
      FROM partner_webhooks pw
      WHERE pw.id = $1 AND pw.partner_id = $2
    `;
    const verifyResult = await query(verifyQuery, [webhookId, partnerId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    const offset = (page - 1) * limit;

    const deliveriesQuery = `
      SELECT
        id,
        event_type,
        response_status,
        delivery_attempts,
        delivered_at,
        failed_at,
        error_message,
        created_at
      FROM webhook_deliveries
      WHERE webhook_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(deliveriesQuery, [webhookId, limit, offset]);

    res.json({
      success: true,
      deliveries: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('[Webhook Management] Error fetching deliveries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook deliveries'
    });
  }
}

/**
 * Delete webhook
 * DELETE /api/partner-portal/webhooks/:webhookId
 */
async function deleteWebhook(req, res) {
  try {
    const partnerId = req.partnerId;
    const { webhookId } = req.params;

    const deleteQuery = `
      DELETE FROM partner_webhooks
      WHERE id = $1 AND partner_id = $2
      RETURNING id, webhook_url
    `;

    const result = await query(deleteQuery, [webhookId, partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      message: `Webhook ${result.rows[0].webhook_url} deleted successfully`
    });
  } catch (error) {
    console.error('[Webhook Management] Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    });
  }
}

module.exports = {
  createWebhook,
  listWebhooks,
  testWebhook,
  getWebhookDeliveries,
  deleteWebhook
};
```

---

#### Day 5: CRM Connector Framework (8 hours)

**File**: `tpe-backend/src/services/crmConnectors/baseCrmConnector.js` (NEW)

```javascript
/**
 * Base CRM Connector
 * Abstract class for all CRM integrations
 */

class BaseCrmConnector {
  constructor(config) {
    this.config = config;
    this.partnerId = config.partner_id;
    this.credentials = config.crm_credentials;
    this.fieldMapping = config.field_mapping || {};
  }

  /**
   * Test connection to CRM
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Sync lead to CRM
   * @param {object} lead - TPX lead data
   * @returns {Promise<object>} - CRM record info
   */
  async syncLead(lead) {
    throw new Error('syncLead() must be implemented by subclass');
  }

  /**
   * Get leads from CRM
   * @returns {Promise<array>} - Array of CRM leads
   */
  async getLeadsFromCrm() {
    throw new Error('getLeadsFromCrm() must be implemented by subclass');
  }

  /**
   * Map TPX fields to CRM fields
   * @param {object} tpxData - TPX lead data
   * @returns {object} - Mapped CRM data
   */
  mapTpxToCrm(tpxData) {
    const mapped = {};

    for (const [tpxField, crmField] of Object.entries(this.fieldMapping)) {
      if (tpxData[tpxField] !== undefined) {
        mapped[crmField] = tpxData[tpxField];
      }
    }

    return mapped;
  }

  /**
   * Map CRM fields to TPX fields
   * @param {object} crmData - CRM lead data
   * @returns {object} - Mapped TPX data
   */
  mapCrmToTpx(crmData) {
    const mapped = {};

    // Reverse the mapping
    for (const [tpxField, crmField] of Object.entries(this.fieldMapping)) {
      if (crmData[crmField] !== undefined) {
        mapped[tpxField] = crmData[crmField];
      }
    }

    return mapped;
  }

  /**
   * Log sync activity
   */
  async logSync(status, recordsCount, errorMessage = null) {
    const { query } = require('../../config/database');

    await query(
      `UPDATE partner_crm_integrations
       SET last_sync_at = NOW(),
           last_sync_status = $2,
           sync_error_message = $3,
           records_synced = records_synced + $4
       WHERE partner_id = $1`,
      [this.partnerId, status, errorMessage, recordsCount]
    );
  }
}

module.exports = BaseCrmConnector;
```

**Salesforce Connector**: `tpe-backend/src/services/crmConnectors/salesforceConnector.js` (NEW)

```javascript
// DATABASE-CHECKED: partner_crm_integrations table

const axios = require('axios');
const BaseCrmConnector = require('./baseCrmConnector');

/**
 * Salesforce CRM Connector
 * Syncs TPX leads with Salesforce Leads/Contacts
 */

class SalesforceConnector extends BaseCrmConnector {
  constructor(config) {
    super(config);
    this.instanceUrl = this.credentials.instance_url;
    this.accessToken = this.credentials.access_token;
  }

  /**
   * Test Salesforce connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.instanceUrl}/services/data/v58.0/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('[Salesforce] Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Sync TPX lead to Salesforce
   */
  async syncLead(lead) {
    try {
      // Map TPX lead to Salesforce Lead object
      const salesforceLead = this.mapTpxToCrm({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company_name,
        revenue_tier: lead.revenue_tier,
        status: lead.status,
        lead_source: 'Power100 Experience'
      });

      // Check if lead already exists
      const existingLead = await this.findLeadByEmail(lead.email);

      if (existingLead) {
        // Update existing lead
        await this.updateSalesforceLead(existingLead.Id, salesforceLead);
        return { id: existingLead.Id, action: 'updated' };
      } else {
        // Create new lead
        const newLead = await this.createSalesforceLead(salesforceLead);
        return { id: newLead.id, action: 'created' };
      }
    } catch (error) {
      console.error('[Salesforce] Error syncing lead:', error);
      throw error;
    }
  }

  /**
   * Find lead by email in Salesforce
   */
  async findLeadByEmail(email) {
    try {
      const query = `SELECT Id, FirstName, LastName, Email FROM Lead WHERE Email = '${email}' LIMIT 1`;
      const response = await axios.get(`${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.records[0] || null;
    } catch (error) {
      console.error('[Salesforce] Error finding lead:', error);
      return null;
    }
  }

  /**
   * Create Salesforce Lead
   */
  async createSalesforceLead(leadData) {
    const response = await axios.post(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Lead`,
      leadData,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  /**
   * Update Salesforce Lead
   */
  async updateSalesforceLead(leadId, leadData) {
    await axios.patch(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Lead/${leadId}`,
      leadData,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Get leads from Salesforce
   */
  async getLeadsFromCrm() {
    try {
      const query = `SELECT Id, FirstName, LastName, Email, Phone, Company, Status
                     FROM Lead
                     WHERE LeadSource = 'Power100 Experience'
                     ORDER BY CreatedDate DESC
                     LIMIT 100`;

      const response = await axios.get(`${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.records.map(record => this.mapCrmToTpx(record));
    } catch (error) {
      console.error('[Salesforce] Error fetching leads:', error);
      throw error;
    }
  }
}

module.exports = SalesforceConnector;
```

**CRM Connector Service**: `tpe-backend/src/services/crmConnectorService.js` (NEW)

```javascript
// DATABASE-CHECKED: partner_crm_integrations, contractor_partner_matches tables

const { query } = require('../config/database');
const SalesforceConnector = require('./crmConnectors/salesforceConnector');
// const HubspotConnector = require('./crmConnectors/hubspotConnector'); // To be implemented
// const PipedriveConnector = require('./crmConnectors/pipedriveConnector'); // To be implemented

/**
 * CRM Connector Service
 * Manages CRM integrations and syncing
 */

class CrmConnectorService {
  /**
   * Get CRM connector instance for partner
   */
  async getConnector(partnerId) {
    const integrationQuery = `
      SELECT *
      FROM partner_crm_integrations
      WHERE partner_id = $1 AND is_active = TRUE
      LIMIT 1
    `;

    const result = await query(integrationQuery, [partnerId]);

    if (result.rows.length === 0) {
      throw new Error('No active CRM integration found for partner');
    }

    const config = result.rows[0];

    // Return appropriate connector based on CRM type
    switch (config.crm_type) {
      case 'salesforce':
        return new SalesforceConnector(config);
      // case 'hubspot':
      //   return new HubspotConnector(config);
      // case 'pipedrive':
      //   return new PipedriveConnector(config);
      default:
        throw new Error(`Unsupported CRM type: ${config.crm_type}`);
    }
  }

  /**
   * Sync all leads for partner to their CRM
   */
  async syncAllLeads(partnerId) {
    try {
      const connector = await this.getConnector(partnerId);

      // Get all active leads for partner
      const leadsQuery = `
        SELECT
          cpm.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.company_name,
          c.revenue_tier
        FROM contractor_partner_matches cpm
        JOIN contractors c ON c.id = cpm.contractor_id
        WHERE cpm.partner_id = $1 AND cpm.status = 'active'
      `;

      const leadsResult = await query(leadsQuery, [partnerId]);

      let successCount = 0;
      let failCount = 0;

      // Sync each lead
      for (const lead of leadsResult.rows) {
        try {
          await connector.syncLead(lead);
          successCount++;
        } catch (error) {
          console.error(`[CRM Sync] Error syncing lead ${lead.id}:`, error);
          failCount++;
        }
      }

      // Log sync result
      await connector.logSync(
        failCount === 0 ? 'success' : 'partial',
        successCount,
        failCount > 0 ? `${failCount} leads failed to sync` : null
      );

      return {
        success: true,
        synced: successCount,
        failed: failCount
      };
    } catch (error) {
      console.error('[CRM Sync] Error:', error);
      throw error;
    }
  }

  /**
   * Sync single lead to CRM
   */
  async syncLead(partnerId, leadId) {
    try {
      const connector = await this.getConnector(partnerId);

      // Get lead data
      const leadQuery = `
        SELECT
          cpm.*,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.company_name,
          c.revenue_tier
        FROM contractor_partner_matches cpm
        JOIN contractors c ON c.id = cpm.contractor_id
        WHERE cpm.id = $1 AND cpm.partner_id = $2
      `;

      const result = await query(leadQuery, [leadId, partnerId]);

      if (result.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const syncResult = await connector.syncLead(result.rows[0]);

      return {
        success: true,
        result: syncResult
      };
    } catch (error) {
      console.error('[CRM Sync] Error syncing lead:', error);
      throw error;
    }
  }
}

module.exports = new CrmConnectorService();
```

---

### WEEK 10: Documentation & Polish

#### Day 1-2: Swagger API Documentation (16 hours)

**File**: `tpe-backend/src/docs/swagger.js` (NEW)

```javascript
/**
 * Swagger API Documentation Configuration
 * Provides interactive API documentation for partners
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Power100 Experience Partner API',
      version: '1.0.0',
      description: 'REST API for partners to integrate with Power100 Experience',
      contact: {
        name: 'Power100 Support',
        email: 'api@power100.io',
        url: 'https://power100.io/support'
      }
    },
    servers: [
      {
        url: 'https://tpx.power100.io/api/partner-api',
        description: 'Production API'
      },
      {
        url: 'http://localhost:5000/api/partner-api',
        description: 'Development API'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'API key obtained from Partner Portal'
        }
      },
      schemas: {
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            contractor_id: { type: 'integer' },
            match_score: { type: 'number' },
            status: { type: 'string', enum: ['active', 'converted', 'lost'] },
            engagement_stage: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            company_name: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Analytics: {
          type: 'object',
          properties: {
            total_leads: { type: 'integer' },
            active_leads: { type: 'integer' },
            converted_leads: { type: 'integer' },
            avg_match_score: { type: 'number' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: ['./src/routes/partnerApiRoutes.js'] // Path to API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```

**Swagger UI Route**: `tpe-backend/src/routes/apiDocsRoutes.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../docs/swagger');

// Serve Swagger UI at /api/docs
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Power100 API Docs'
}));

// Serve OpenAPI JSON spec
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

module.exports = router;
```

---

#### Day 3-4: Frontend Integration UI (16 hours)

**File**: `tpe-front-end/src/app/partner/integrations/page.tsx` (NEW)

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Webhook,
  Cloud,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

/**
 * Partner Integrations Dashboard
 * Manages API keys, webhooks, and CRM connections
 */

export default function PartnerIntegrations() {
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [crmIntegrations, setCrmIntegrations] = useState([]);
  const [activeTab, setActiveTab] = useState('api-keys');

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
    fetchCrmIntegrations();
  }, []);

  // API Keys Tab
  const renderApiKeysTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-gray-600">
            Manage your API keys for programmatic access
          </p>
        </div>
        <Button onClick={() => {/* Open create key dialog */}}>
          <Plus className="w-4 h-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map(key => (
          <Card key={key.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{key.key_name}</span>
                    <Badge variant={key.is_active ? 'default' : 'secondary'}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{key.api_key}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Last used: {key.last_used_at || 'Never'}</span>
                    <span>Requests: {key.request_count}</span>
                    <span>Scopes: {key.scopes.join(', ')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Documentation Link */}
      <Card className="bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">API Documentation</h4>
              <p className="text-sm text-blue-700">
                View interactive API docs and code examples
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="https://tpx.power100.io/api/docs" target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Docs
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Webhooks Tab
  const renderWebhooksTab = () => (
    <div className="space-y-6">
      {/* Similar structure to API Keys */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Webhooks</h3>
          <p className="text-sm text-gray-600">
            Receive real-time event notifications
          </p>
        </div>
        <Button onClick={() => {/* Open create webhook dialog */}}>
          <Plus className="w-4 h-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Webhooks list */}
    </div>
  );

  // CRM Integrations Tab
  const renderCrmTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">CRM Integrations</h3>
          <p className="text-sm text-gray-600">
            Connect your CRM to sync leads automatically
          </p>
        </div>
      </div>

      {/* CRM Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                <Cloud className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Salesforce</h4>
                <p className="text-sm text-gray-600">Sync leads to Salesforce</p>
              </div>
              <Button variant="outline">Connect</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">
                <Cloud className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">HubSpot</h4>
                <p className="text-sm text-gray-600">Import contacts and deals</p>
              </div>
              <Button variant="outline">Connect</Button>
            </div>
          </CardContent>
        </Card>

        {/* More CRM cards... */}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-gray-600">
            Connect Power100 with your existing tools and workflows
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="api-keys">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="w-4 h-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="crm">
              <Cloud className="w-4 h-4 mr-2" />
              CRM Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="mt-6">
            {renderApiKeysTab()}
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            {renderWebhooksTab()}
          </TabsContent>

          <TabsContent value="crm" className="mt-6">
            {renderCrmTab()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

---

#### Day 5: Testing & Quality Assurance (8 hours)

**Test Suite**: `tpe-backend/tests/partnerApi.test.js` (NEW)

```javascript
/**
 * Partner API Integration Tests
 * Tests all API endpoints, webhooks, and CRM connectors
 */

const request = require('supertest');
const app = require('../server');

describe('Partner API Tests', () => {
  let apiKey;

  beforeAll(async () => {
    // Generate test API key
    const response = await request(app)
      .post('/api/partner-portal/api-keys')
      .send({
        key_name: 'Test API Key',
        scopes: ['read:leads', 'write:leads']
      });

    apiKey = response.body.api_key;
  });

  describe('GET /api/partner-api/leads', () => {
    it('should return paginated leads', async () => {
      const response = await request(app)
        .get('/api/partner-api/leads')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should reject requests without API key', async () => {
      await request(app)
        .get('/api/partner-api/leads')
        .expect(401);
    });
  });

  describe('Webhook Delivery', () => {
    it('should deliver webhook with correct signature', async () => {
      // Test webhook delivery
    });
  });

  // More tests...
});
```

---

## 📊 SUCCESS CRITERIA

### Technical Metrics
- [ ] All API endpoints returning < 200ms response time (p95)
- [ ] API documentation published and accessible
- [ ] Webhook delivery success rate > 99%
- [ ] Zero security vulnerabilities in API layer
- [ ] 100% test coverage for critical paths

### Business Metrics
- [ ] At least 3 partners using API integration
- [ ] At least 1 partner using CRM connector
- [ ] 1000+ API calls per day
- [ ] Partner feedback score > 8/10 on integration experience

### Adoption Metrics
- [ ] 50% of partners have generated API keys
- [ ] 30% of partners have configured webhooks
- [ ] 20% of partners using CRM integration
- [ ] Zero integration-related support tickets

---

## 📅 TIMELINE SUMMARY

**Week 9**: Core API & Infrastructure
- Day 1-2: REST API endpoints (16 hours)
- Day 3: API key management (8 hours)
- Day 4: Webhook infrastructure (8 hours)
- Day 5: CRM connector framework (8 hours)

**Week 10**: Documentation & Polish
- Day 1-2: Swagger API documentation (16 hours)
- Day 3-4: Frontend integration UI (16 hours)
- Day 5: Testing & QA (8 hours)

**Total Time**: 80 hours (2 weeks)

---

## 🔗 RELATED DOCUMENTATION

- Partner Portal Overview: `docs/features/partner-portal/PARTNER-PORTAL-OVERVIEW.md`
- Partner Portal Phase 1: `docs/features/partner-portal/phase-1/PHASE-1-COMPLETE.md`
- Partner Portal Phase 2: `docs/features/partner-portal/phase-2/PHASE-2-COMPLETE.md`
- Partner Portal Phase 3: `docs/features/partner-portal/phase-3/PHASE-3-COMPLETE.md`
- Partner Portal Phase 4: `docs/features/partner-portal/phase-4/PHASE-4-PARTNER-PORTAL-COMPLETE.md`

---

**Document Created**: October 27, 2025
**Last Updated**: October 27, 2025
**Status**: Ready for Implementation
**Next Step**: Begin Week 9 Day 1 - REST API Endpoints Development
