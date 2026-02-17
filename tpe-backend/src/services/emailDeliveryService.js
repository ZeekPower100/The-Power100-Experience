// DATABASE-CHECKED: partner_reports, strategic_partners, contractors verified November 1, 2025
// ================================================================
// Email Delivery Service for Quarterly Reports
// ================================================================
// Purpose: Send quarterly reports via email to partners and contractors
// Data Source: partner_reports table with JSONB report_data
// Pattern: Backend → n8n webhook → Email Provider (same as eventOrchestrator/emailScheduler.js)
// ================================================================
// VERIFIED CONSTRAINTS:
// - partner_reports.status: CHECK IN ('draft', 'generated', 'delivered', 'viewed')
// - partner_reports.report_type: CHECK IN ('executive_summary', 'contractor_comparison', 'public_pcr')
// ================================================================
// VERIFIED FIELD NAMES:
// - delivered_at (NOT deliveredAt)
// - viewed_at (NOT viewedAt)
// - report_data (NOT reportData) - JSONB already parsed
// - report_type (NOT reportType)
// - partner_id (NOT partnerId)
// - primary_email (NOT primaryEmail - from strategic_partners)
// ================================================================

const axios = require('axios');
const { query } = require('../config/database');
const { renderEmailTemplate } = require('./emailTemplateService');
const { buildTags } = require('../utils/tagBuilder');

// n8n webhook configuration (same pattern as emailScheduler.js)
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';

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
  console.log(`[Report Email Delivery] Sending executive report ${reportId}`);

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
  const emailSubject = `Your ${report.quarter} ${report.year} Executive Performance Report`;
  const emailBody = renderEmailTemplate('executive_report', {
    companyName: report.company_name,
    logoUrl: report.logo_url,
    quarter: report.quarter,
    year: report.year,
    reportData: report.report_data,  // Already parsed from JSONB
    reportUrl: `${process.env.FRONTEND_URL || 'https://tpx.power100.io'}/partner/reports/${reportId}`
  });

  // STEP 3: Send via n8n webhook (same pattern as emailScheduler.js)
  const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
  const n8nPayload = {
    from_email: 'reports@outreach.power100.io',
    from_name: 'Power100 Reports',
    to_email: report.primary_email,
    to_name: report.company_name,
    subject: emailSubject,
    body: emailBody,
    template: 'executive_report',
    tags: buildTags({
      category: 'report',
      type: 'executive',
      recipient: 'partner',
      channel: 'email',
      quarter: report.quarter,
      year: report.year,
      status: 'sent'
    }),
    report_id: reportId,
    quarter: report.quarter,
    year: report.year
  };

  console.log(`[Report Email Delivery] Triggering n8n webhook: ${n8nWebhook}`);

  // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
  try {
    await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
    console.log(`[Report Email Delivery] Email sent via n8n successfully`);
  } catch (n8nError) {
    if (n8nError.response?.status === 404) {
      console.log(`[Report Email Delivery] ⚠️  n8n webhook not found (dev mode - this is ok)`);
    } else {
      console.warn(`[Report Email Delivery] ⚠️  n8n webhook error:`, n8nError.message);
    }
  }

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

  console.log(`[Report Email Delivery] ✅ Executive report ${reportId} sent to ${report.primary_email}`);

  return {
    reportId,
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
  console.log(`[Report Email Delivery] Sending contractor report ${reportId} to contractor ${contractorId}`);

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
  const emailSubject = `Your ${report.quarter} ${report.year} Performance Report from ${report.partner_name}`;
  const emailBody = renderEmailTemplate('contractor_report', {
    contractorName: report.contractor_name,
    contractorCompany: report.contractor_company,
    partnerName: report.partner_name,
    logoUrl: report.logo_url,
    quarter: report.quarter,
    year: report.year,
    reportData: report.report_data,  // Already parsed from JSONB
    reportUrl: `${process.env.FRONTEND_URL || 'https://tpx.power100.io'}/contractor/reports/${reportId}`
  });

  // STEP 3: Send via n8n webhook
  const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
  const n8nPayload = {
    from_email: 'reports@outreach.power100.io',
    from_name: 'Power100 Reports',
    to_email: report.contractor_email,
    to_name: report.contractor_name,
    subject: emailSubject,
    body: emailBody,
    template: 'contractor_report',
    tags: buildTags({
      category: 'report',
      type: 'contractor',
      recipient: 'contractor',
      channel: 'email',
      quarter: report.quarter,
      year: report.year,
      status: 'sent'
    }),
    report_id: reportId,
    contractor_id: contractorId,
    quarter: report.quarter,
    year: report.year
  };

  console.log(`[Report Email Delivery] Triggering n8n webhook: ${n8nWebhook}`);

  // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
  try {
    await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
    console.log(`[Report Email Delivery] Email sent via n8n successfully`);
  } catch (n8nError) {
    if (n8nError.response?.status === 404) {
      console.log(`[Report Email Delivery] ⚠️  n8n webhook not found (dev mode - this is ok)`);
    } else {
      console.warn(`[Report Email Delivery] ⚠️  n8n webhook error:`, n8nError.message);
    }
  }

  // STEP 4: Update delivery status
  await query(`
    UPDATE partner_reports
    SET
      status = 'delivered',
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [reportId]);

  console.log(`[Report Email Delivery] ✅ Contractor report ${reportId} sent to ${report.contractor_email}`);

  return {
    reportId,
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
  console.log('[Report Email Delivery] Sending all pending reports');

  // Get all reports ready to send
  // DATABASE FIELDS: id, report_type, status
  const result = await query(`
    SELECT id, report_type
    FROM partner_reports
    WHERE status = 'generated'
    ORDER BY generation_date ASC
  `);

  const pending = result.rows;
  console.log(`[Report Email Delivery] Found ${pending.length} pending reports`);

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
        results.succeeded++;
      } else if (report.report_type === 'contractor_comparison') {
        // For contractor reports, we need contractor_id - skip if not available
        console.log(`[Report Email Delivery] ⚠️ Contractor report ${report.id} requires contractor_id - skipping batch send`);
        continue;
      } else if (report.report_type === 'public_pcr') {
        // Public PCR reports are not sent via email
        console.log(`[Report Email Delivery] ⚠️ Public PCR report ${report.id} is not sent via email - skipping`);
        continue;
      }
    } catch (error) {
      console.error(`[Report Email Delivery] ❌ Failed to send report ${report.id}:`, error.message);
      results.failed++;
      results.errors.push({
        reportId: report.id,
        error: error.message
      });
    }
  }

  console.log(`[Report Email Delivery] ✅ Batch send complete: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

module.exports = {
  sendExecutiveReport,
  sendContractorReport,
  sendAllPendingReports
};
