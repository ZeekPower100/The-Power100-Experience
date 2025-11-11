# Phase 1: PowerCard Generation System - Implementation Plan

**Document Version:** 1.0
**Date:** November 10, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** Verified November 10, 2025

---

## 📋 Executive Summary

**Goal:** Build the PowerCard generation and response collection system that triggers when partners complete pre-onboarding Step 8.

### What Phase 1 Delivers
- ✅ PowerCard campaign creation after Step 8 submission
- ✅ Automated email delivery to 10 recipients (5 customers + 5 employees)
- ✅ Public PowerCard response form (no auth required)
- ✅ Response tracking and campaign status management
- ✅ Integration with existing partner onboarding flow

---

## 🗄️ Database Schema (Already Exists - Verified November 10, 2025)

### All Required Tables EXIST ✅

**DATABASE-CHECKED: All tables and fields verified November 10, 2025**

#### strategic_partners (Pre-Onboarding Fields)
```sql
-- Fields used for PowerCard generation:
id                   INTEGER PRIMARY KEY
company_name         VARCHAR             -- For campaign naming
logo_url             VARCHAR             -- For email branding
client_demos         TEXT                -- Not used for PowerCards
client_references    TEXT                -- Contains 5 customer emails/names
employee_references  TEXT                -- Contains 5 employee emails/names
landing_page_videos  JSONB               -- Videos parsed from client_demos
focus_areas_served   TEXT                -- For context in emails
public_url           VARCHAR(100)        -- Landing page slug
is_active            BOOLEAN             -- Must be true
```

#### power_card_campaigns (Campaign Tracking)
```sql
-- Existing fields (NO MIGRATION NEEDED):
id                  INTEGER PRIMARY KEY
partner_id          INTEGER             -- FK to strategic_partners(id)
campaign_name       VARCHAR             -- "{Company} Pre-Onboarding Q1 2025"
quarter             VARCHAR             -- Q1, Q2, Q3, Q4
year                INTEGER             -- 2025, 2026, etc.
status              VARCHAR             -- 'pending' → 'active' → 'completed'
total_sent          INTEGER             -- Always 10 for pre-onboarding
total_responses     INTEGER             -- Count increments as responses come in
-- Additional existing fields:
start_date          DATE
end_date            DATE
response_rate       NUMERIC
created_at          TIMESTAMP
```

#### power_card_recipients (Token & Tracking)
```sql
-- Existing fields (NO MIGRATION NEEDED):
id                   INTEGER PRIMARY KEY
campaign_id          INTEGER             -- FK to power_card_campaigns(id)
recipient_email      TEXT                -- From client/employee_references
recipient_name       TEXT                -- Parsed from references
recipient_type       TEXT                -- 'customer' or 'employee'
survey_link          TEXT                -- Unique PowerCard URL with token
status               TEXT                -- 'pending' → 'sent' → 'opened' → 'completed'
sent_at              TIMESTAMP           -- When email sent
opened_at            TIMESTAMP           -- When link first clicked
started_at           TIMESTAMP           -- When form started
completed_at         TIMESTAMP           -- When response submitted
reminder_sent_at     TIMESTAMP           -- For follow-up emails
template_id          INTEGER             -- FK to power_card_templates(id)
company_id           INTEGER             -- partner_id reference
company_type         TEXT                -- 'partner'
recipient_id         INTEGER             -- NULL for pre-onboarding
revenue_tier         TEXT                -- NULL for pre-onboarding
created_at           TIMESTAMP
```

#### power_card_responses (Response Storage)
```sql
-- Existing fields (NO MIGRATION NEEDED):
id                   INTEGER PRIMARY KEY
campaign_id          INTEGER             -- FK to power_card_campaigns(id)
contractor_id        INTEGER             -- NULL for pre-onboarding
template_id          INTEGER             -- FK to power_card_templates(id)
satisfaction_score   INTEGER             -- 1-10 rating
recommendation_score INTEGER             -- NPS: -100 to 100
metric_1_score       INTEGER             -- Custom metric 1
metric_2_score       INTEGER             -- Custom metric 2
metric_3_score       INTEGER             -- Custom metric 3
metric_1_response    TEXT                -- Qualitative feedback
metric_2_response    TEXT
metric_3_response    TEXT
submitted_at         TIMESTAMP
```

#### power_card_templates (Question Configuration)
```sql
-- Existing fields (NO MIGRATION NEEDED):
id                   INTEGER PRIMARY KEY
partner_id           INTEGER             -- FK to strategic_partners(id)
partner_type         TEXT                -- 'strategic_partner'
metric_1_name        VARCHAR             -- Custom metric name
metric_1_question    TEXT                -- Question text
metric_1_type        VARCHAR             -- 'rating', 'text', etc.
metric_2_name        VARCHAR
metric_2_question    TEXT
metric_2_type        VARCHAR
metric_3_name        VARCHAR
metric_3_question    TEXT
metric_3_type        VARCHAR
created_at           TIMESTAMP
-- Additional template configuration fields exist
```

---

## 🚨 CRITICAL: NO DATABASE MIGRATIONS NEEDED

**All required tables and fields already exist! ✅**

Phase 1 implementation is purely SERVICE LAYER and FRONTEND work:
- No SQL migrations to run
- No new tables to create
- No schema changes required

Proceed directly to service implementation after Pre-Flight Checklist.

---

## 🛠️ Service Layer Implementation

### File 1: PowerCard Generation Service

**File:** `tpe-backend/src/services/powercardGenerationService.js` (NEW FILE)

**DATABASE-CHECKED: All field names verified November 10, 2025**

```javascript
// DATABASE-CHECKED: strategic_partners, power_card_campaigns, power_card_recipients,
//                   power_card_templates tables verified November 10, 2025
// ================================================================
// PowerCard Generation Service - Pre-Onboarding System
// ================================================================
// Purpose: Generate PowerCard campaigns when partners complete Step 8
// Triggers: Called from partner onboarding completion
// ================================================================

const { query } = require('../config/database');
const crypto = require('crypto');
const emailService = require('./emailService');

/**
 * Generate PowerCard campaign for pre-onboarding partner
 * Creates campaign and 10 recipients (5 customers + 5 employees)
 *
 * DATABASE TABLES: strategic_partners, power_card_campaigns, power_card_recipients, power_card_templates
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Campaign info with recipient count
 */
async function generatePreOnboardingCampaign(partnerId) {
  console.log(`[PowerCard Generation] Starting pre-onboarding campaign for partner ${partnerId}`);

  // STEP 1: Get partner info and references
  // DATABASE FIELDS: company_name, client_references, employee_references, logo_url, focus_areas_served
  const partnerResult = await query(`
    SELECT
      id,
      company_name,
      client_references,
      employee_references,
      logo_url,
      focus_areas_served,
      public_url
    FROM strategic_partners
    WHERE id = $1 AND is_active = true
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found or inactive`);
  }

  const partner = partnerResult.rows[0];

  // STEP 2: Parse references (format: "Name <email@example.com>, Name2 <email2@...>")
  const customerRefs = parseReferences(partner.client_references);
  const employeeRefs = parseReferences(partner.employee_references);

  if (customerRefs.length < 5 || employeeRefs.length < 5) {
    throw new Error(`Insufficient references: need 5 customers and 5 employees, got ${customerRefs.length} and ${employeeRefs.length}`);
  }

  // STEP 3: Get or create PowerCard template for this partner
  // DATABASE FIELDS: id, metric_1_name, metric_2_name, metric_3_name
  let template = await query(`
    SELECT id, metric_1_name, metric_2_name, metric_3_name
    FROM power_card_templates
    WHERE partner_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [partnerId]);

  if (template.rows.length === 0) {
    // Create default template
    const defaultTemplate = await query(`
      INSERT INTO power_card_templates (
        partner_id,
        partner_type,
        metric_1_name,
        metric_1_question,
        metric_1_type,
        metric_2_name,
        metric_2_question,
        metric_2_type,
        metric_3_name,
        metric_3_question,
        metric_3_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
    `, [
      partnerId,
      'strategic_partner',
      'Communication Quality',
      'How would you rate the quality of communication?',
      'rating',
      'Technical Expertise',
      'How would you rate the technical expertise?',
      'rating',
      'Overall Value',
      'How would you rate the overall value delivered?',
      'rating'
    ]);
    template = defaultTemplate;
  }

  const templateId = template.rows[0].id;

  // STEP 4: Determine current quarter
  const now = new Date();
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  const year = now.getFullYear();

  // STEP 5: Create PowerCard campaign
  // DATABASE FIELDS: partner_id, campaign_name, quarter, year, status, total_sent, total_responses, start_date, end_date
  const campaignResult = await query(`
    INSERT INTO power_card_campaigns (
      partner_id,
      campaign_name,
      quarter,
      year,
      status,
      total_sent,
      total_responses,
      start_date,
      end_date,
      response_rate,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING id
  `, [
    partnerId,
    `${partner.company_name} Pre-Onboarding ${quarter} ${year}`,
    quarter,
    year,
    'pending', // Will update to 'active' after emails sent
    10,
    0,
    now,
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    0.0
  ]);

  const campaignId = campaignResult.rows[0].id;

  // STEP 6: Create 10 recipient records with unique tokens
  const recipients = [];

  // Add 5 customer recipients
  for (let i = 0; i < 5; i++) {
    const ref = customerRefs[i];
    const token = generateUniqueToken();
    const surveyLink = `${process.env.FRONTEND_URL}/powercard/respond/${token}`;

    await query(`
      INSERT INTO power_card_recipients (
        campaign_id,
        recipient_email,
        recipient_name,
        recipient_type,
        survey_link,
        status,
        template_id,
        company_id,
        company_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      campaignId,
      ref.email,
      ref.name,
      'customer',
      surveyLink,
      'pending',
      templateId,
      partnerId,
      'partner'
    ]);

    recipients.push({ ...ref, type: 'customer', token, surveyLink });
  }

  // Add 5 employee recipients
  for (let i = 0; i < 5; i++) {
    const ref = employeeRefs[i];
    const token = generateUniqueToken();
    const surveyLink = `${process.env.FRONTEND_URL}/powercard/respond/${token}`;

    await query(`
      INSERT INTO power_card_recipients (
        campaign_id,
        recipient_email,
        recipient_name,
        recipient_type,
        survey_link,
        status,
        template_id,
        company_id,
        company_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      campaignId,
      ref.email,
      ref.name,
      'employee',
      surveyLink,
      'pending',
      templateId,
      partnerId,
      'partner'
    ]);

    recipients.push({ ...ref, type: 'employee', token, surveyLink });
  }

  // STEP 7: Send PowerCard emails
  let sentCount = 0;
  for (const recipient of recipients) {
    try {
      await emailService.sendPowerCardEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        recipientType: recipient.type,
        partnerName: partner.company_name,
        partnerLogo: partner.logo_url,
        surveyLink: recipient.surveyLink,
        campaignId: campaignId
      });

      // Update recipient status to 'sent'
      await query(`
        UPDATE power_card_recipients
        SET status = 'sent', sent_at = NOW()
        WHERE campaign_id = $1 AND recipient_email = $2
      `, [campaignId, recipient.email]);

      sentCount++;
    } catch (error) {
      console.error(`[PowerCard Generation] Failed to send email to ${recipient.email}:`, error);
    }
  }

  // STEP 8: Update campaign status to 'active'
  await query(`
    UPDATE power_card_campaigns
    SET status = 'active', updated_at = NOW()
    WHERE id = $1
  `, [campaignId]);

  console.log(`[PowerCard Generation] ✅ Campaign ${campaignId} created with ${sentCount}/10 emails sent`);

  return {
    campaignId,
    partner: {
      id: partner.id,
      name: partner.company_name
    },
    recipients: {
      total: 10,
      sent: sentCount,
      customers: 5,
      employees: 5
    },
    quarter,
    year
  };
}

/**
 * Parse reference string into array of {name, email} objects
 * Format: "John Doe <john@example.com>, Jane Smith <jane@example.com>"
 *
 * @param {string} referencesText - Comma-separated list of references
 * @returns {Array<{name: string, email: string}>}
 */
function parseReferences(referencesText) {
  if (!referencesText) return [];

  const refs = referencesText.split(',').map(ref => ref.trim());
  return refs.map(ref => {
    const match = ref.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim()
      };
    }
    // Fallback if format is just email
    return {
      name: ref,
      email: ref
    };
  }).filter(ref => ref.email.includes('@'));
}

/**
 * Generate cryptographically secure unique token
 *
 * @returns {string} 32-character hex token
 */
function generateUniqueToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get PowerCard campaign by ID
 *
 * @param {number} campaignId - Campaign ID
 * @returns {Object} Campaign details with recipients
 */
async function getCampaignById(campaignId) {
  // DATABASE FIELDS: campaign_name, quarter, year, status, total_sent, total_responses
  const campaign = await query(`
    SELECT
      id,
      partner_id,
      campaign_name,
      quarter,
      year,
      status,
      total_sent,
      total_responses,
      response_rate,
      start_date,
      end_date
    FROM power_card_campaigns
    WHERE id = $1
  `, [campaignId]);

  if (campaign.rows.length === 0) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Get recipients
  const recipients = await query(`
    SELECT
      recipient_email,
      recipient_name,
      recipient_type,
      status,
      sent_at,
      opened_at,
      completed_at
    FROM power_card_recipients
    WHERE campaign_id = $1
    ORDER BY recipient_type, recipient_name
  `, [campaignId]);

  return {
    ...campaign.rows[0],
    recipients: recipients.rows
  };
}

module.exports = {
  generatePreOnboardingCampaign,
  getCampaignById,
  parseReferences,
  generateUniqueToken
};
```

---

## 📡 API Endpoints

**File:** `tpe-backend/src/routes/powercard.js` (NEW FILE)

```javascript
// DATABASE-CHECKED: Routes use verified field names
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const powercardService = require('../services/powercardGenerationService');
const { protect } = require('../middleware/auth');

/**
 * POST /api/powercard/generate/:partnerId
 * Generate pre-onboarding PowerCard campaign
 * Protected - requires admin auth
 */
router.post('/generate/:partnerId', protect, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  const result = await powercardService.generatePreOnboardingCampaign(parseInt(partnerId));

  res.json({
    success: true,
    message: 'PowerCard campaign generated and emails sent',
    campaign: result
  });
}));

/**
 * GET /api/powercard/campaign/:campaignId
 * Get PowerCard campaign details
 * Protected - requires admin auth
 */
router.get('/campaign/:campaignId', protect, asyncHandler(async (req, res) => {
  const { campaignId } = req.params;

  const campaign = await powercardService.getCampaignById(parseInt(campaignId));

  res.json({
    success: true,
    campaign
  });
}));

module.exports = router;
```

**Integration with server.js:**
```javascript
// Add to tpe-backend/src/server.js
const powercardRoutes = require('./routes/powercard');
app.use('/api/powercard', powercardRoutes);
```

---

## 🎨 Frontend: Public PowerCard Response Form

**File:** `tpe-front-end/src/app/powercard/respond/[token]/page.tsx` (NEW FILE)

```typescript
// PowerCard public response form
// Accessible via /powercard/respond/{token}
// NO authentication required

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PowerCardResponsePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [recipient, setRecipient] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);

  const [satisfaction, setSatisfaction] = useState(0);
  const [recommendation, setRecommendation] = useState(0);
  const [metric1, setMetric1] = useState(0);
  const [metric2, setMetric2] = useState(0);
  const [metric3, setMetric3] = useState(0);
  const [feedback1, setFeedback1] = useState('');
  const [feedback2, setFeedback2] = useState('');
  const [feedback3, setFeedback3] = useState('');

  useEffect(() => {
    // Load PowerCard details by token
    fetch(`/api/powercard/validate/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecipient(data.recipient);
          setPartner(data.partner);
          setTemplate(data.template);
        } else {
          setError(data.message);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load PowerCard');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/powercard/submit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satisfaction_score: satisfaction,
          recommendation_score: recommendation,
          metric_1_score: metric1,
          metric_2_score: metric2,
          metric_3_score: metric3,
          metric_1_response: feedback1,
          metric_2_response: feedback2,
          metric_3_response: feedback3
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-lg">Loading PowerCard...</p>
    </div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p>{error}</p>
      </Card>
    </div>;
  }

  if (submitted) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-green-600 mb-4">Thank You!</h2>
        <p className="text-lg">Your feedback has been submitted successfully.</p>
      </Card>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8">
          {/* Partner branding */}
          {partner?.logo_url && (
            <img src={partner.logo_url} alt={partner.company_name} className="h-16 mb-6" />
          )}

          <h1 className="text-3xl font-bold mb-4">PowerCard Feedback</h1>
          <p className="text-gray-600 mb-8">
            Hi {recipient?.recipient_name}, we'd love to hear your feedback about {partner?.company_name}.
          </p>

          {/* Satisfaction Rating */}
          <div className="mb-8">
            <label className="block text-lg font-semibold mb-2">
              Overall Satisfaction (1-10)
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setSatisfaction(n)}
                  className={`w-12 h-12 rounded ${satisfaction === n ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* NPS Score */}
          <div className="mb-8">
            <label className="block text-lg font-semibold mb-2">
              Would you recommend this partner? (0-10)
            </label>
            <div className="flex gap-2">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setRecommendation(n)}
                  className={`w-10 h-10 rounded ${recommendation === n ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Metrics (dynamic from template) */}
          <div className="mb-8">
            <label className="block text-lg font-semibold mb-2">{template?.metric_1_name}</label>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  onClick={() => setMetric1(n)}
                  className={`w-10 h-10 rounded ${metric1 === n ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              className="w-full p-3 border rounded"
              rows={3}
              placeholder="Additional feedback..."
              value={feedback1}
              onChange={(e) => setFeedback1(e.target.value)}
            />
          </div>

          {/* Repeat for metric 2 and 3... */}

          <Button
            onClick={handleSubmit}
            disabled={loading || !satisfaction || !recommendation}
            className="w-full bg-green-500 hover:bg-green-600 text-white text-lg py-6"
          >
            Submit Feedback
          </Button>
        </Card>
      </div>
    </div>
  );
}
```

---

## 📅 Implementation Timeline (5-7 Days)

### Day 1: PowerCard Generation Service
**Tasks:**
1. Create `powercardGenerationService.js` with all functions
2. Implement `generatePreOnboardingCampaign()` function
3. Test reference parsing logic
4. Verify database field names match exactly
5. Unit tests for token generation and reference parsing

**Deliverable:** Working service that creates campaigns and recipient records

---

### Day 2: Email Integration
**Tasks:**
1. Update `emailService.js` with PowerCard email template
2. Implement `sendPowerCardEmail()` function
3. Design PowerCard email HTML template with partner branding
4. Test email delivery to test addresses
5. Verify survey_link format is correct

**Deliverable:** PowerCard emails sent successfully with unique links

---

### Day 3: API Endpoints
**Tasks:**
1. Create `powercard.js` routes file
2. Implement POST /api/powercard/generate/:partnerId
3. Implement GET /api/powercard/campaign/:campaignId
4. Add routes to server.js
5. Test API endpoints with Postman

**Deliverable:** Working API endpoints for PowerCard generation

---

### Day 4: Public Response Form (Frontend)
**Tasks:**
1. Create `/powercard/respond/[token]/page.tsx`
2. Implement form UI with rating scales
3. Add validation and error handling
4. Test token validation flow
5. Mobile responsive design

**Deliverable:** Public form accessible via unique token links

---

### Day 5: Response Submission Backend
**Tasks:**
1. Create POST /api/powercard/submit/:token endpoint
2. Validate token and check if already submitted
3. Save to `power_card_responses` table
4. Update `power_card_recipients` status to 'completed'
5. Increment `power_card_campaigns.total_responses`

**Deliverable:** Complete response submission flow

---

### Day 6: Integration with Onboarding
**Tasks:**
1. Update partner onboarding Step 8 completion handler
2. Call `generatePreOnboardingCampaign()` after Step 8
3. Add UI feedback showing PowerCards sent
4. Test full end-to-end flow
5. Error handling for failed email sends

**Deliverable:** PowerCards automatically trigger on Step 8 completion

---

### Day 7: Testing & Refinement
**Tasks:**
1. End-to-end testing with real email addresses
2. Test all recipient status transitions
3. Verify campaign status updates
4. Performance testing (10 emails sent < 5 seconds)
5. Documentation and error logging

**Deliverable:** Production-ready PowerCard generation system

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Campaign Creation Speed** | < 2 seconds | Time to create campaign + 10 recipients |
| **Email Delivery Rate** | 95%+ | Emails sent successfully / total recipients |
| **Token Uniqueness** | 100% | No duplicate tokens generated |
| **Response Form Load Time** | < 1 second | Time to validate token and load form |
| **Response Submission** | < 500ms | Time to save response to database |

---

## 📚 Related Documents

- **Overview:** [Pre-Onboarding System Overview](../PRE-ONBOARDING-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 1 Pre-Flight Checklist](./PHASE-1-PRE-FLIGHT-CHECKLIST.md)
- **Phase 2 Plan:** [Phase 2 Implementation Plan](../phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)

---

**Last Updated:** November 10, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist)
**Next Step:** Complete Phase 1 Pre-Flight Checklist
