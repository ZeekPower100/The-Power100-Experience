# PCR Reports System - Overview

**Date:** October 31, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Verification:** All field names verified October 31, 2025

---

## 📋 Executive Summary

**Goal:** Transform existing mock reports into functional quarterly feedback reports connected to real PowerCard data, with proper portal access and automated email delivery.

### Three Report Types - Three Different Purposes

| Report Type | Audience | Access Point | Data Source | Purpose |
|-------------|----------|--------------|-------------|---------|
| **Executive Report** | Strategic Partners | Partner Portal + Email | power_card_analytics | Quarterly performance review with custom metrics |
| **Contractor Comparison Report** | Contractors | Contractor Portal + Email | Peer benchmarks | Anonymous variance-based performance comparison |
| **Public PCR Landing Page** | Public/Marketing | Public URL (`/partners/:id/pcr`) | strategic_partners | Partner marketing showcase |

---

## 🎯 Key Architecture Decisions

### Dynamic Metrics System ✅

**Critical Discovery:** Contractor comparison metrics are **NOT hardcoded fields** - they're dynamically based on each partner's quarterly custom metrics.

**How It Works:**
```
Partner chooses 3 custom metrics per quarter
    ↓
Stored in: power_card_templates.metric_1_name, metric_2_name, metric_3_name
    ↓
PowerCards/AI Concierge collects data from contractors
    ↓
Aggregated by revenue tier in: power_card_analytics (percentile_25, percentile_50, percentile_75)
    ↓
Contractor Report shows: "[Custom Metric Name]: +X% vs. tier average"
```

**Example:**
- **Destination Motivation** tracks: "Closing %", "Cancellation Rate", "CX Score"
- **Partner B** tracks: "Referral Rate", "Project Completion Time", "Safety Incidents"
- Each contractor sees variance for **their partner's specific metrics**

---

## 🗄️ Database Schema (100% Field Names Verified)

### Existing Tables - Field Verification

#### strategic_partners (Executive Report & Public PCR)
```sql
-- VERIFIED FIELDS (October 31, 2025):
id INTEGER PRIMARY KEY
company_name VARCHAR
description TEXT                    -- NOT tagline
value_proposition TEXT
final_pcr_score NUMERIC(5,2)
base_pcr_score NUMERIC(5,2)
momentum_modifier INTEGER           -- -3, 0, 5
performance_trend VARCHAR           -- improving, stable, declining, new
earned_badges JSONB                 -- [{type, name, icon, category, earnedAt}]
quarterly_history JSONB             -- [{quarter, year, score, ...}]
quarterly_feedback_score NUMERIC(5,2)
logo_url VARCHAR
website VARCHAR
engagement_tier VARCHAR             -- free, gold, platinum
key_differentiators TEXT
client_testimonials JSONB           -- [{quote, author, company, revenue_tier}]
landing_page_videos TEXT            -- NOT video_testimonials
video_metadata TEXT
```

#### power_card_analytics (Quarterly Performance Data)
```sql
-- VERIFIED FIELDS (October 31, 2025):
id SERIAL PRIMARY KEY
campaign_id INTEGER REFERENCES power_card_campaigns(id)
avg_satisfaction NUMERIC
avg_nps INTEGER
avg_metric_1 NUMERIC                -- Partner's custom metric 1 average
avg_metric_2 NUMERIC                -- Partner's custom metric 2 average
avg_metric_3 NUMERIC                -- Partner's custom metric 3 average
total_responses INTEGER
revenue_tier VARCHAR                -- For contractor peer comparison
trend_direction VARCHAR             -- up, down, stable
variance_from_last_quarter NUMERIC
percentile_25 NUMERIC               -- Peer benchmark (25th percentile)
percentile_50 NUMERIC               -- Peer benchmark (median)
percentile_75 NUMERIC               -- Peer benchmark (75th percentile)
geographic_region VARCHAR
industry_segment VARCHAR
created_at TIMESTAMP
```

#### power_card_templates (Custom Metric Definitions)
```sql
-- VERIFIED FIELDS (October 31, 2025):
id SERIAL PRIMARY KEY
partner_id INTEGER REFERENCES strategic_partners(id)
partner_type VARCHAR                -- strategic_partner, employee_feedback
metric_1_name VARCHAR               -- e.g., "Closing Percentage"
metric_1_question TEXT              -- Survey question text
metric_1_type VARCHAR               -- scale, text, etc.
metric_2_name VARCHAR
metric_2_question TEXT
metric_2_type VARCHAR
metric_3_name VARCHAR
metric_3_question TEXT
metric_3_type VARCHAR
```

#### contractors (For Contractor Report)
```sql
-- VERIFIED FIELDS (October 31, 2025):
id SERIAL PRIMARY KEY
name VARCHAR
company_name VARCHAR
email VARCHAR
revenue_tier VARCHAR                -- Used for peer grouping
annual_revenue VARCHAR
-- NOTE: Performance metrics (closing %, etc.) are NOT in contractors table
-- They come from power_card_analytics aggregated by revenue_tier
```

### New Table: partner_reports

```sql
-- DATABASE-CHECKED: All referenced table names verified October 31, 2025
CREATE TABLE partner_reports (
  id SERIAL PRIMARY KEY,

  -- Report Identification
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('executive', 'contractor', 'public_pcr')),
  partner_id INTEGER REFERENCES strategic_partners(id),
  contractor_id INTEGER REFERENCES contractors(id),  -- NULL for executive/pcr reports
  campaign_id INTEGER REFERENCES power_card_campaigns(id),  -- NULL for public PCR

  -- Report Content
  report_data JSONB NOT NULL,       -- Full report JSON with all visualizations
  quarter VARCHAR(10),              -- 'Q1', 'Q2', 'Q3', 'Q4'
  year INTEGER,

  -- Generation Metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by INTEGER REFERENCES admin_users(id),  -- NULL if auto-generated

  -- Delivery Tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_opened BOOLEAN DEFAULT false,
  email_opened_at TIMESTAMP,

  -- Access Tracking
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,

  -- Publishing Status
  is_published BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_partner_reports_partner ON partner_reports(partner_id);
CREATE INDEX idx_partner_reports_contractor ON partner_reports(contractor_id);
CREATE INDEX idx_partner_reports_campaign ON partner_reports(campaign_id);
CREATE INDEX idx_partner_reports_type ON partner_reports(report_type);
CREATE INDEX idx_partner_reports_quarter ON partner_reports(quarter, year);
CREATE INDEX idx_partner_reports_published ON partner_reports(is_published) WHERE is_published = true;
```

---

## 🔧 Report Generation Logic

### Executive Report (For Partners)

**Data Sources:**
1. **Partner Profile**: `strategic_partners` table
2. **Quarterly Performance**: `power_card_analytics` (filtered by campaign_id)
3. **Custom Metrics**: `power_card_templates` (for metric names)

**Report Structure:**
```javascript
{
  partner_name: strategic_partners.company_name,
  quarter: 'Q4',
  year: 2025,

  executive_summary: {
    powerconfidence_score: strategic_partners.final_pcr_score,
    base_score: strategic_partners.base_pcr_score,
    momentum_modifier: strategic_partners.momentum_modifier,
    performance_trend: strategic_partners.performance_trend,
    earned_badges: strategic_partners.earned_badges,  // JSONB array
    total_responses: power_card_analytics.total_responses
  },

  custom_metrics: {
    metric_1: {
      name: power_card_templates.metric_1_name,  // e.g., "Closing Percentage"
      average: power_card_analytics.avg_metric_1,
      trend: power_card_analytics.trend_direction,
      variance_from_last_quarter: power_card_analytics.variance_from_last_quarter
    },
    metric_2: { /* same structure */ },
    metric_3: { /* same structure */ }
  },

  satisfaction_metrics: {
    avg_satisfaction: power_card_analytics.avg_satisfaction,
    avg_nps: power_card_analytics.avg_nps
  },

  recommendations: {
    // AI-generated or rule-based based on performance trends
  }
}
```

### Contractor Comparison Report

**Data Sources:**
1. **Contractor Info**: `contractors` table
2. **Partner's Custom Metrics**: `power_card_templates`
3. **Peer Benchmarks**: `power_card_analytics` (aggregated by revenue_tier)
4. **Individual Responses**: `power_card_responses` (for this contractor)

**Report Structure:**
```javascript
{
  contractor: {
    name: contractors.name,
    company: contractors.company_name,
    revenue_tier: contractors.revenue_tier  // e.g., "$5M-$10M"
  },

  partner: {
    name: strategic_partners.company_name
  },

  quarter: 'Q4',
  year: 2025,

  // DYNAMIC METRICS (based on partner's custom metrics)
  performance_metrics: [
    {
      metric_name: power_card_templates.metric_1_name,  // e.g., "Closing Percentage"
      your_score: power_card_responses.metric_1_score,  // Individual contractor score
      tier_average: power_card_analytics.percentile_50, // Median for revenue tier
      variance: "+6.2%",  // Calculated: (your_score - tier_average) / tier_average
      trend: "up",
      comparison: "Above tier average",
      percentile_25: power_card_analytics.percentile_25,
      percentile_75: power_card_analytics.percentile_75
    },
    // metric_2 and metric_3 follow same structure
  ],

  peer_insights: [
    "72% of contractors in your tier improved this metric last quarter",
    "Top performers in your tier average +15% in [metric name]"
  ],

  next_tier_benchmarks: {
    // Show what "$10M-$20M" tier averages are
    // Motivates contractors to aim higher
  }
}
```

### Public PCR Landing Page

**Data Sources:**
1. **Partner Profile**: `strategic_partners` table
2. **Latest Performance**: Most recent `quarterly_history` entry
3. **Testimonials**: `strategic_partners.client_testimonials` (JSONB)

**Report Structure:**
```javascript
{
  partner: {
    name: strategic_partners.company_name,
    description: strategic_partners.description,  // NOT tagline
    value_proposition: strategic_partners.value_proposition,
    logo_url: strategic_partners.logo_url,
    website: strategic_partners.website,
    engagement_tier: strategic_partners.engagement_tier,
    key_differentiators: strategic_partners.key_differentiators
  },

  powerconfidence_score: {
    current: strategic_partners.final_pcr_score,
    label: "Elite Partner",  // Based on score range
    percentile: "99th percentile",
    earned_badges: strategic_partners.earned_badges  // JSONB array
  },

  key_metrics: [
    // Calculated from quarterly_history
    { metric: "+12%", label: "Avg. Performance Increase" },
    { metric: "95%", label: "Client Satisfaction Rate" },
    { metric: "500+", label: "Contractors Served" }
  ],

  testimonials: strategic_partners.client_testimonials,  // JSONB array

  videos: strategic_partners.landing_page_videos  // NOT video_testimonials
}
```

---

## 🌐 API Endpoints

### Partner Portal Endpoints
```javascript
// View quarterly reports
GET /api/partners/:partnerId/reports
GET /api/partners/:partnerId/reports/:reportId
GET /api/partners/:partnerId/reports/latest

// Download report as PDF
GET /api/partners/:partnerId/reports/:reportId/download

// Email report to partner
POST /api/partners/:partnerId/reports/:reportId/email
```

### Contractor Portal Endpoints
```javascript
// View performance reports
GET /api/contractors/:contractorId/reports
GET /api/contractors/:contractorId/reports/:reportId
GET /api/contractors/:contractorId/reports/latest

// Download report as PDF
GET /api/contractors/:contractorId/reports/:reportId/download
```

### Public PCR Endpoints
```javascript
// Public landing page data
GET /api/partners/:partnerId/pcr-public
GET /api/partners/:slug/pcr-public  // By partner slug/URL

// Track page views
POST /api/partners/:partnerId/pcr-public/view
```

### Admin Report Management
```javascript
// Generate reports manually
POST /api/admin/reports/generate/:campaignId
POST /api/admin/reports/partner/:partnerId/pcr-landing

// Email reports
POST /api/admin/reports/:reportId/send-email
POST /api/admin/reports/campaign/:campaignId/email-all

// View all reports
GET /api/admin/reports
GET /api/admin/reports/:reportId
```

---

## 🎨 Frontend Routes & Components

### Partner Portal
```
/partner-portal/reports                    → Quarterly reports list
/partner-portal/reports/[reportId]         → View individual report
/partner-portal/reports/[reportId]/download → PDF download
```

### Contractor Portal
```
/contractor/reports                        → Performance reports list
/contractor/reports/[reportId]             → View individual report
/contractor/reports/[reportId]/download    → PDF download
```

### Public Routes
```
/partners/[partnerId]/pcr                  → Public PCR landing page
/partners/[slug]/pcr                       → Public PCR by slug
```

### Admin Dashboard
```
/admindashboard/reports                    → All reports management
/admindashboard/reports/campaign/[id]      → Campaign-specific reports
/admindashboard/reports/partner/[id]       → Partner-specific reports
```

---

## 🔄 Automated Workflow Integration

### Campaign Completion → Report Generation

```javascript
// File: tpe-backend/src/services/powerCardsIntegrationService.js
// Function: processCampaignCompletion()

async function processCampaignCompletion(campaignId) {
  // ... existing steps: update quarterly_history, recalc momentum, badges ...

  // Step 5: Generate Executive Reports (for all partners in campaign)
  console.log(`[Reports] Generating executive reports for campaign ${campaignId}`);
  const executiveReports = await reportGenerationService.generateExecutiveReports(campaignId);

  // Step 6: Generate Contractor Reports (for all contractors who received services)
  console.log(`[Reports] Generating contractor comparison reports`);
  const contractorReports = await reportGenerationService.generateContractorReports(campaignId);

  // Step 7: Send email notifications
  console.log(`[Reports] Emailing reports to stakeholders`);
  await emailService.sendQuarterlyReports(campaignId);

  return {
    ...existingResults,
    reports: {
      executive: executiveReports.length,
      contractor: contractorReports.length,
      emailed: true
    }
  };
}
```

### Partner Approval → PCR Landing Page

```javascript
// File: tpe-backend/src/controllers/partnerController.js
// Function: approvePartner()

async function approvePartner(req, res) {
  const { partnerId } = req.params;

  // Update partner status
  await query(`
    UPDATE strategic_partners
    SET status = 'active', is_active = true
    WHERE id = $1
  `, [partnerId]);

  // Auto-generate public PCR landing page
  console.log(`[Reports] Generating PCR landing page for partner ${partnerId}`);
  const pcrReport = await reportGenerationService.generatePublicPCRReport(partnerId);

  // Save to database as published
  await query(`
    INSERT INTO partner_reports (
      report_type, partner_id, report_data, is_published
    ) VALUES ('public_pcr', $1, $2, true)
  `, [partnerId, JSON.stringify(pcrReport)]);

  res.json({
    success: true,
    message: 'Partner approved and PCR landing page generated',
    pcr_url: `/partners/${partnerId}/pcr`
  });
}
```

---

## 📧 Email Templates

### 1. Partner Executive Report Email
**Template:** `partner-quarterly-report.html`

**Subject:** `Your Q4 2025 Performance Report - [Partner Name]`

**Content:**
- PowerConfidence score with badge
- Key performance highlights
- Custom metrics summary
- Link to view full report in portal
- PDF download link

### 2. Contractor Comparison Report Email
**Template:** `contractor-performance-report.html`

**Subject:** `Your Q4 2025 Performance vs. Peers - [Partner Name]`

**Content:**
- Revenue tier comparison
- Variance in custom metrics (no actual numbers, just variance)
- Peer insights
- Link to view full report in portal
- PDF download link

### 3. Report Ready Notification
**Template:** `report-ready-notification.html`

**Subject:** `Your Quarterly Report is Ready`

**Content:**
- Simple notification that report has been generated
- Single CTA button to view report
- Sent after campaign completion processing

---

## 🎯 Implementation Phases

### Phase 1: Database & Core Services (Days 1-2)
- Create `partner_reports` table
- Update `reportGenerationService.js` with real data queries
- Implement dynamic metric mapping
- Test with existing PowerCard campaigns

### Phase 2: Portal Integrations (Days 3-4)
- Partner Portal reports section
- Contractor Portal reports section
- Report viewing and PDF download
- Access control and authentication

### Phase 3: Public PCR & Automation (Days 5-6)
- Public PCR landing page component
- Auto-generation on partner approval
- Email templates and sending
- Campaign completion integration

---

## 🔒 Security & Privacy Rules

### Executive Reports (Partner View)
- ✅ Partners see ONLY their own reports
- ✅ Aggregated data only (no individual client names)
- ✅ Can view all historical quarterly reports
- ✅ Can download PDFs
- ❌ CANNOT see other partners' reports

### Contractor Reports
- ✅ Contractors see ONLY their own reports
- ✅ Variance vs. peers (no actual peer data)
- ✅ NO peer names or companies shown
- ✅ Can view reports from all partners they work with
- ❌ CANNOT see actual peer performance numbers

### Public PCR Landing Pages
- ✅ Anyone can view published PCR pages
- ✅ Only marketing-approved content shown
- ✅ No confidential metrics
- ❌ Unpublished partners have no public page

### Admin Access
- ✅ Full access to all reports
- ✅ Can view individual PowerCard responses
- ✅ Can manually generate/regenerate reports
- ✅ Can email reports on demand

---

## ✅ Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Report Generation Speed** | < 2 seconds per report | Time from campaign completion |
| **Email Delivery Rate** | > 95% | Sent vs bounced |
| **Email Open Rate** | > 40% | Email tracking |
| **Report View Rate** | > 60% | Partners/contractors viewing |
| **PDF Download Rate** | > 30% | Download tracking |
| **PCR Page Load Time** | < 1 second | Performance metrics |
| **Partner Satisfaction** | > 4.5/5 | Post-report survey |

---

## 📚 Related Documents

- **Phase 1 Implementation:** `./phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`
- **Phase 2 Implementation:** `./phase-2/PHASE-2-IMPLEMENTATION-PLAN.md`
- **Phase 3 Implementation:** `./phase-3/PHASE-3-IMPLEMENTATION-PLAN.md`
- **PowerCards Integration:** `../Scoring/phase-3/PHASE-3-IMPLEMENTATION-PLAN.md`
- **Database Source of Truth:** `/DATABASE-SOURCE-OF-TRUTH.md`

---

**Status:** Overview Complete - Ready for Phase 1 Planning
**Next Step:** Create Phase 1 implementation plan with database migration and service updates
**Last Updated:** October 31, 2025
