# Phase 2: Reports Portal & Email Delivery - Implementation Plan

**Document Version:** 1.0
**Date:** October 31, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** Builds on Phase 1 (partner_reports table verified October 31, 2025)

---

## 📋 Executive Summary

**Goal:** Build the email delivery system and portal UI for partners and contractors to access their quarterly reports.

### What Phase 2 Delivers
- ✅ Email delivery service for quarterly reports
- ✅ Email templates for executive and contractor reports
- ✅ Partner portal quarterly reports section
- ✅ Contractor portal performance reports section
- ✅ Automated report generation on campaign completion
- ✅ Report delivery tracking (delivered_at, viewed_at timestamps)
- ✅ Email automation workflows via n8n
- ✅ Portal UI components for report viewing

**Phase 2 builds on Phase 1:** Uses existing partner_reports table, no new migrations required.

---

## 🗄️ Database Schema - No Changes Required!

### Prerequisites Verification ✅

**CRITICAL: Run Pre-Flight Checklist BEFORE implementing**

**Existing Tables from Phase 1 (Verify these exist):**
- `partner_reports` - 22 fields verified (created in Phase 1)
- `strategic_partners` - primary_email field verified
- `contractors` - email field verified
- `power_card_campaigns` - status field verified for triggers
- `admin_users` - id field for tracking

**NO DATABASE MIGRATIONS IN PHASE 2**

Phase 2 uses the database structure created in Phase 1. We're adding:
- Email sending functionality
- Portal UI layers
- Automation workflows
- But NO new database fields or tables!

---

## 🛠️ Service Layer: Email Delivery Service

**File:** `tpe-backend/src/services/emailDeliveryService.js` (NEW)

**DATABASE-CHECKED: All field names verified against schema October 31, 2025**

```javascript
// DATABASE-CHECKED: partner_reports, strategic_partners, contractors verified October 31, 2025
// ================================================================
// Email Delivery Service
// ================================================================
// Purpose: Send quarterly reports via email to partners and contractors
// Data Source: partner_reports table with JSONB report_data
// ================================================================

const { query } = require('../config/database');
const nodemailer = require('nodemailer');
const { renderEmailTemplate } = require('./emailTemplateService');

// Email configuration (use environment variables in production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send Executive Report Email to Partner
 *
 * DATABASE TABLES: partner_reports, strategic_partners
 * DATABASE FIELDS: report_data (JSONB), status, delivered_at, primary_email
 *
 * @param {number} reportId - Report ID from partner_reports
 * @returns {Object} Delivery confirmation
 */
async function sendExecutiveReport(reportId) {
  console.log(`[Email Delivery] Sending executive report ${reportId}`);

  // STEP 1: Get report and partner info
  // DATABASE FIELDS: pr.report_data, pr.status, sp.company_name, sp.primary_email, sp.logo_url
  const result = await query(`
    SELECT
      pr.id,
      pr.report_data,
      pr.status,
      pr.quarter,
      pr.year,
      sp.company_name,
      sp.primary_email,
      sp.logo_url
    FROM partner_reports pr
    JOIN strategic_partners sp ON pr.partner_id = sp.id
    WHERE pr.id = $1 AND pr.report_type = 'executive_summary'
  `, [reportId]);

  if (result.rows.length === 0) {
    throw new Error(`Executive report ${reportId} not found`);
  }

  const report = result.rows[0];

  // Verify report is in 'generated' status
  if (report.status !== 'generated') {
    throw new Error(`Report ${reportId} is not ready for delivery (status: ${report.status})`);
  }

  if (!report.primary_email) {
    throw new Error(`Partner has no primary email address`);
  }

  // STEP 2: Render email template
  const emailHtml = renderEmailTemplate('executive_report', {
    companyName: report.company_name,
    logoUrl: report.logo_url,
    quarter: report.quarter,
    year: report.year,
    reportData: report.report_data,  // Already parsed from JSONB
    reportUrl: `${process.env.FRONTEND_URL}/partner/reports/${reportId}`
  });

  // STEP 3: Send email
  const mailOptions = {
    from: `"Power100 Reports" <${process.env.SMTP_USER}>`,
    to: report.primary_email,
    subject: `Your ${report.quarter} ${report.year} Executive Performance Report`,
    html: emailHtml
  };

  const info = await transporter.sendMail(mailOptions);

  // STEP 4: Update delivery status
  // DATABASE FIELDS: status, delivered_at (set to NOW())
  await query(`
    UPDATE partner_reports
    SET
      status = 'delivered',
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [reportId]);

  console.log(`[Email Delivery] ✅ Executive report ${reportId} sent to ${report.primary_email}`);

  return {
    reportId,
    messageId: info.messageId,
    recipient: report.primary_email,
    status: 'delivered',
    deliveredAt: new Date()
  };
}

/**
 * Send Contractor Comparison Report Email
 *
 * DATABASE TABLES: partner_reports, contractors, strategic_partners
 * DATABASE FIELDS: report_data (JSONB), status, delivered_at, email
 *
 * @param {number} reportId - Report ID from partner_reports
 * @param {number} contractorId - Contractor ID
 * @returns {Object} Delivery confirmation
 */
async function sendContractorReport(reportId, contractorId) {
  console.log(`[Email Delivery] Sending contractor report ${reportId} to contractor ${contractorId}`);

  // STEP 1: Get report, contractor, and partner info
  // DATABASE FIELDS: pr.report_data, c.name, c.email, c.company_name, sp.company_name
  const result = await query(`
    SELECT
      pr.id,
      pr.report_data,
      pr.status,
      pr.quarter,
      pr.year,
      c.name as contractor_name,
      c.email as contractor_email,
      c.company_name as contractor_company,
      sp.company_name as partner_name,
      sp.logo_url
    FROM partner_reports pr
    JOIN strategic_partners sp ON pr.partner_id = sp.id
    CROSS JOIN contractors c
    WHERE pr.id = $1
      AND c.id = $2
      AND pr.report_type = 'contractor_comparison'
  `, [reportId, contractorId]);

  if (result.rows.length === 0) {
    throw new Error(`Contractor report ${reportId} not found for contractor ${contractorId}`);
  }

  const report = result.rows[0];

  // Verify report is ready
  if (report.status !== 'generated') {
    throw new Error(`Report ${reportId} is not ready for delivery (status: ${report.status})`);
  }

  if (!report.contractor_email) {
    throw new Error(`Contractor has no email address`);
  }

  // STEP 2: Render email template
  const emailHtml = renderEmailTemplate('contractor_report', {
    contractorName: report.contractor_name,
    contractorCompany: report.contractor_company,
    partnerName: report.partner_name,
    logoUrl: report.logo_url,
    quarter: report.quarter,
    year: report.year,
    reportData: report.report_data,  // Already parsed from JSONB
    reportUrl: `${process.env.FRONTEND_URL}/contractor/reports/${reportId}`
  });

  // STEP 3: Send email
  const mailOptions = {
    from: `"Power100 Performance Reports" <${process.env.SMTP_USER}>`,
    to: report.contractor_email,
    subject: `Your ${report.quarter} ${report.year} Performance Report from ${report.partner_name}`,
    html: emailHtml
  };

  const info = await transporter.sendMail(mailOptions);

  // STEP 4: Update delivery status
  await query(`
    UPDATE partner_reports
    SET
      status = 'delivered',
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [reportId]);

  console.log(`[Email Delivery] ✅ Contractor report ${reportId} sent to ${report.contractor_email}`);

  return {
    reportId,
    messageId: info.messageId,
    recipient: report.contractor_email,
    status: 'delivered',
    deliveredAt: new Date()
  };
}

/**
 * Send all pending reports (status = 'generated')
 *
 * @returns {Object} Summary of sent reports
 */
async function sendAllPendingReports() {
  console.log('[Email Delivery] Sending all pending reports');

  // Get all reports ready to send
  // DATABASE FIELDS: id, report_type, status
  const result = await query(`
    SELECT id, report_type
    FROM partner_reports
    WHERE status = 'generated'
    ORDER BY generation_date ASC
  `);

  const pending = result.rows;
  console.log(`[Email Delivery] Found ${pending.length} pending reports`);

  const results = {
    total: pending.length,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  for (const report of pending) {
    try {
      if (report.report_type === 'executive_summary') {
        await sendExecutiveReport(report.id);
      } else if (report.report_type === 'contractor_comparison') {
        // For contractor reports, we need contractor_id - skip if not available
        console.log(`[Email Delivery] ⚠️ Contractor report ${report.id} requires contractor_id - skipping batch send`);
        continue;
      }
      results.succeeded++;
    } catch (error) {
      console.error(`[Email Delivery] ❌ Failed to send report ${report.id}:`, error.message);
      results.failed++;
      results.errors.push({
        reportId: report.id,
        error: error.message
      });
    }
  }

  console.log(`[Email Delivery] ✅ Batch send complete: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

module.exports = {
  sendExecutiveReport,
  sendContractorReport,
  sendAllPendingReports
};
```

---

## 📧 Email Template Service

**File:** `tpe-backend/src/services/emailTemplateService.js` (NEW)

**DATABASE-CHECKED: Uses report_data JSONB structure from Phase 1**

```javascript
// DATABASE-CHECKED: report_data structure verified October 31, 2025
// ================================================================
// Email Template Service
// ================================================================
// Purpose: Render HTML email templates for quarterly reports
// Data Source: report_data JSONB from partner_reports table
// ================================================================

/**
 * Render email template for executive report
 *
 * @param {string} templateType - 'executive_report' or 'contractor_report'
 * @param {Object} data - Template data
 * @returns {string} HTML email
 */
function renderEmailTemplate(templateType, data) {
  if (templateType === 'executive_report') {
    return renderExecutiveReportEmail(data);
  } else if (templateType === 'contractor_report') {
    return renderContractorReportEmail(data);
  }
  throw new Error(`Unknown template type: ${templateType}`);
}

/**
 * Render executive report email template
 */
function renderExecutiveReportEmail(data) {
  const { companyName, logoUrl, quarter, year, reportData, reportUrl } = data;
  const { performance_summary, custom_metrics } = reportData;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quarter} ${year} Executive Report - ${companyName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${logoUrl || 'https://tpx.power100.io/logo.png'}" alt="${companyName}" style="max-width: 200px; height: auto;">
    <h1 style="color: #FB0401; margin-top: 20px;">${quarter} ${year} Executive Performance Report</h1>
  </div>

  <!-- Summary -->
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Performance Summary</h2>
    <p><strong>Overall Satisfaction:</strong> ${performance_summary.overall_satisfaction}/100</p>
    <p><strong>NPS Score:</strong> ${performance_summary.nps_score}</p>
    <p><strong>Total Feedback:</strong> ${performance_summary.total_feedback} responses</p>
  </div>

  <!-- Custom Metrics -->
  <div style="margin-bottom: 20px;">
    <h2>Your Custom Metrics</h2>
    ${custom_metrics.map(metric => `
      <div style="background: #fff; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 15px;">
        <h3 style="margin-top: 0; color: #28a745;">${metric.name}</h3>
        <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${metric.average || 'N/A'}</p>
        <p style="color: #6c757d; margin: 0;">Trend: ${metric.trend}</p>
      </div>
    `).join('')}
  </div>

  <!-- CTA Button -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="${reportUrl}" style="display: inline-block; background: #FB0401; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Full Report</a>
  </div>

  <!-- Footer -->
  <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
    <p>This is your quarterly performance report from Power100 Experience.</p>
    <p>Questions? Contact us at <a href="mailto:support@power100.io">support@power100.io</a></p>
  </div>
</body>
</html>
  `;
}

/**
 * Render contractor report email template
 */
function renderContractorReportEmail(data) {
  const { contractorName, contractorCompany, partnerName, logoUrl, quarter, year, reportData, reportUrl } = data;
  const { current_tier_performance } = reportData;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quarter} ${year} Performance Report - ${contractorCompany}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="${logoUrl || 'https://tpx.power100.io/logo.png'}" alt="${partnerName}" style="max-width: 200px; height: auto;">
    <h1 style="color: #FB0401; margin-top: 20px;">${quarter} ${year} Performance Report</h1>
    <p style="color: #6c757d;">For ${contractorCompany}</p>
  </div>

  <!-- Greeting -->
  <div style="margin-bottom: 30px;">
    <p>Hi ${contractorName},</p>
    <p>Here's your quarterly performance comparison from ${partnerName}. See how you're performing compared to peers in your revenue tier.</p>
  </div>

  <!-- Tier Performance -->
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Your Performance vs. Tier Average</h2>
    <p style="color: #6c757d; margin-bottom: 15px;">Revenue Tier: ${current_tier_performance.tier}</p>

    ${Object.entries(current_tier_performance.metrics).map(([metricName, metricData]) => {
      if (!metricData) return '';
      const color = metricData.trend === 'up' ? '#28a745' : (metricData.trend === 'down' ? '#dc3545' : '#6c757d');
      return `
        <div style="border-bottom: 1px solid #dee2e6; padding: 15px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${metricName}</strong>
            <span style="color: ${color}; font-size: 20px; font-weight: bold;">${metricData.variance}</span>
          </div>
          <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">${metricData.comparison}</p>
        </div>
      `;
    }).join('')}
  </div>

  <!-- CTA Button -->
  <div style="text-align: center; margin: 30px 0;">
    <a href="${reportUrl}" style="display: inline-block; background: #28a745; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Detailed Report</a>
  </div>

  <!-- Footer -->
  <div style="text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
    <p>This report is provided by ${partnerName} through Power100 Experience.</p>
    <p>Questions about your performance? Contact ${partnerName} directly.</p>
  </div>
</body>
</html>
  `;
}

module.exports = {
  renderEmailTemplate
};
```

---

## 📡 API Endpoints (Email Delivery)

**File:** `tpe-backend/src/routes/reports.js` (UPDATE EXISTING)

**DATABASE-CHECKED: Routes use verified field names**

```javascript
// ADD these endpoints to existing reports.js file

/**
 * POST /api/reports/:reportId/send
 * Send report via email
 */
router.post('/:reportId/send', protect, asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { contractorId } = req.body;  // Optional, only for contractor reports

  // Get report type
  const reportResult = await query(`
    SELECT report_type FROM partner_reports WHERE id = $1
  `, [parseInt(reportId)]);

  if (reportResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }

  const reportType = reportResult.rows[0].report_type;

  let result;
  if (reportType === 'executive_summary') {
    result = await emailService.sendExecutiveReport(parseInt(reportId));
  } else if (reportType === 'contractor_comparison') {
    if (!contractorId) {
      return res.status(400).json({
        success: false,
        message: 'Contractor ID required for contractor reports'
      });
    }
    result = await emailService.sendContractorReport(parseInt(reportId), parseInt(contractorId));
  } else {
    return res.status(400).json({
      success: false,
      message: 'Public PCR reports are not sent via email'
    });
  }

  res.json({
    success: true,
    message: 'Report sent successfully',
    result
  });
}));

/**
 * POST /api/reports/send-all-pending
 * Send all reports with status = 'generated'
 */
router.post('/send-all-pending', protect, asyncHandler(async (req, res) => {
  const result = await emailService.sendAllPendingReports();

  res.json({
    success: true,
    message: `Sent ${result.succeeded} reports, ${result.failed} failed`,
    result
  });
}));
```

---

## 🎨 Frontend: Partner Portal Reports Page

**File:** `tpe-front-end/src/app/partner/reports/page.tsx` (NEW)

**DATABASE-CHECKED: Uses report_data JSONB structure**

```typescript
// DATABASE-CHECKED: partner_reports fields verified October 31, 2025
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Report {
  id: number;
  quarter: string;
  year: number;
  report_data: any;  // JSONB already parsed
  status: string;
  generation_date: string;
  delivered_at: string | null;
  viewed_at: string | null;
}

export default function PartnerReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const token = localStorage.getItem('partnerToken');
      if (!token) {
        router.push('/partner/login');
        return;
      }

      // Get partner ID from token (decode JWT)
      const partnerId = getPartnerIdFromToken(token);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/partner/${partnerId}/all`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markReportViewed(reportId: number) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/${reportId}/viewed`,
        {
          method: 'PATCH'
        }
      );
    } catch (error) {
      console.error('Error marking report as viewed:', error);
    }
  }

  function viewReport(report: Report) {
    markReportViewed(report.id);
    router.push(`/partner/reports/${report.id}`);
  }

  if (loading) {
    return <div className="p-8">Loading your reports...</div>;
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-power100-black mb-8">
          Quarterly Performance Reports
        </h1>

        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-power100-grey">
              No reports available yet. Reports are generated after each quarterly feedback cycle.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
                onClick={() => viewReport(report)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-power100-black mb-2">
                      {report.quarter} {report.year} Executive Report
                    </h2>
                    <div className="flex gap-4 text-sm text-power100-grey">
                      <span>
                        Generated: {new Date(report.generation_date).toLocaleDateString()}
                      </span>
                      {report.delivered_at && (
                        <span>
                          Delivered: {new Date(report.delivered_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        report.status === 'viewed'
                          ? 'bg-green-100 text-green-800'
                          : report.status === 'delivered'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                </div>

                {report.report_data?.performance_summary && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-power100-grey">Satisfaction</p>
                      <p className="text-2xl font-bold text-power100-black">
                        {report.report_data.performance_summary.overall_satisfaction}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-power100-grey">NPS Score</p>
                      <p className="text-2xl font-bold text-power100-black">
                        {report.report_data.performance_summary.nps_score}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-power100-grey">Responses</p>
                      <p className="text-2xl font-bold text-power100-black">
                        {report.report_data.performance_summary.total_feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getPartnerIdFromToken(token: string): number {
  // Decode JWT token to get partner ID
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.partnerId;
}
```

---

## 📅 Implementation Timeline (5-7 Days)

### Day 1: Email Service & Templates ✅
**Tasks:**
1. ✅ Complete Pre-Flight Checklist (verify Phase 1 tables exist)
2. ✅ Create `emailDeliveryService.js`
3. ✅ Create `emailTemplateService.js`
4. ✅ Configure nodemailer with SMTP settings
5. ✅ Test executive report email rendering
6. ✅ Test contractor report email rendering
7. ✅ Verify delivered_at timestamp updates

**Deliverable:** Working email delivery for both report types

---

### Day 2: Email API & Testing ✅
**Tasks:**
1. ✅ Add email delivery endpoints to reports.js routes
2. ✅ Test POST /api/reports/:reportId/send
3. ✅ Test POST /api/reports/send-all-pending
4. ✅ Verify status transitions (generated → delivered)
5. ✅ Test error handling for missing email addresses
6. ✅ End-to-end email delivery test

**Deliverable:** Complete email API with delivery tracking

---

### Day 3: Partner Portal UI ✅
**Tasks:**
1. ✅ Create partner reports list page
2. ✅ Create partner report detail view
3. ✅ Implement report viewed tracking
4. ✅ Add report filtering by quarter/year
5. ✅ Test portal with real report_data JSONB
6. ✅ Verify viewed_at timestamp updates

**Deliverable:** Partner portal quarterly reports section

---

### Day 4: Contractor Portal UI ✅
**Tasks:**
1. ✅ Create contractor reports list page
2. ✅ Create contractor report detail view (variance display)
3. ✅ Implement variance visualization
4. ✅ Add dynamic metric name display
5. ✅ Test with real PowerCard data
6. ✅ Verify viewed tracking

**Deliverable:** Contractor portal performance reports section

---

### Day 5: Automation & Workflows ✅
**Tasks:**
1. ✅ Create n8n workflow for campaign completion trigger
2. ✅ Implement auto-generate on campaign status = 'completed'
3. ✅ Add auto-send after generation (optional delay)
4. ✅ Test end-to-end automation
5. ✅ Add admin notification on report generation
6. ✅ Documentation and testing

**Deliverable:** Fully automated quarterly report delivery system

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Email Delivery Success** | >95% | Emails sent without errors |
| **Template Rendering** | 100% | All report types render correctly |
| **Status Tracking** | 100% | delivered_at and viewed_at update correctly |
| **Portal Load Time** | <2s | Time to load reports list |
| **Automation Reliability** | 100% | Reports auto-generate on campaign completion |
| **Email Open Rate** | Track | Monitor viewed_at within 7 days of delivery |

---

## 📚 Related Documents

- **Overview:** [PCR Reports System Overview](../PCR-REPORTS-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 2 Pre-Flight Checklist](./PHASE-2-PRE-FLIGHT-CHECKLIST.md)
- **Phase 1 Plan:** [Phase 1 Implementation Plan](../phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- **Database Schema:** Check `quick-db.bat` before implementation

---

## 🎉 Phase 2 Deliverables

**When Phase 2 is Complete:**
1. ✅ Email delivery service for executive and contractor reports
2. ✅ Email templates with company branding
3. ✅ Partner portal quarterly reports section
4. ✅ Contractor portal performance reports section
5. ✅ Automated report generation on campaign completion
6. ✅ Complete delivery tracking (status, timestamps)
7. ✅ n8n automation workflows

**What's NOT in Phase 2:**
- ❌ PDF export functionality (Phase 3)
- ❌ Advanced report styling and customization (Phase 3)
- ❌ Multi-language support (Phase 3)
- ❌ Report scheduling/recurring delivery (Phase 3)
- ❌ Public PCR landing page UI (Phase 3)

---

**Last Updated:** October 31, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist)
**Next Step:** Complete Phase 2 Pre-Flight Checklist
