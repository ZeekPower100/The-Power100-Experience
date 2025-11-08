// DATABASE-CHECKED: partner_reports, strategic_partners verified November 2, 2025
// ================================================================
// PDF Generation Service
// ================================================================
// Purpose: Generate PDF versions of quarterly reports
// Library: puppeteer for HTML-to-PDF conversion
// Storage: AWS S3 for PDF files
// ================================================================

const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const { query } = require('../config/database');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const S3_BUCKET = process.env.REPORTS_S3_BUCKET || 'tpe-reports';

/**
 * Render HTML for PDF generation
 *
 * @param {Object} report - Report data
 * @returns {string} HTML string for PDF
 */
function renderReportHTML(report) {
  const performanceSummary = report.report_data?.performance_summary || {};
  const customMetrics = report.report_data?.custom_metrics || [];
  const feedbackHighlights = report.report_data?.feedback_highlights || {};

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.quarter} ${report.year} Executive Report - ${report.company_name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #000000;
      background: #ffffff;
      padding: 40px;
      line-height: 1.6;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #FB0401;
    }

    .logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 20px;
    }

    h1 {
      color: #FB0401;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #6c757d;
      font-size: 16px;
    }

    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    h2 {
      color: #FB0401;
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f8f9fa;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      border-left: 4px solid #FB0401;
    }

    .metric-label {
      color: #6c757d;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 42px;
      font-weight: bold;
      color: #000000;
      margin-bottom: 5px;
    }

    .metric-trend {
      font-size: 14px;
      color: #6c757d;
    }

    .custom-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .custom-metric {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-left: 4px solid #28a745;
      border-radius: 8px;
      padding: 20px;
    }

    .custom-metric.trend-down {
      border-left-color: #dc3545;
    }

    .custom-metric h3 {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 10px;
    }

    .custom-metric .value {
      font-size: 32px;
      font-weight: bold;
      color: #000000;
      margin-bottom: 8px;
    }

    .custom-metric .trend {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .trend-up {
      background: #d4edda;
      color: #155724;
    }

    .trend-down {
      background: #f8d7da;
      color: #721c24;
    }

    .trend-stable {
      background: #e2e3e5;
      color: #383d41;
    }

    .feedback-section {
      margin-top: 20px;
    }

    .feedback-box {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
    }

    .feedback-box.positive {
      border-left: 4px solid #28a745;
    }

    .feedback-box.improvement {
      border-left: 4px solid #ffc107;
    }

    .feedback-box h4 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #000000;
    }

    .feedback-box ul {
      list-style-position: inside;
      color: #495057;
    }

    .feedback-box li {
      margin-bottom: 5px;
    }

    .footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #f8f9fa;
      color: #6c757d;
      font-size: 12px;
    }

    @media print {
      body {
        padding: 20px;
      }

      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    ${report.logo_url ? `<img src="${report.logo_url}" alt="${report.company_name}" class="logo">` : ''}
    <h1>${report.quarter} ${report.year} Executive Report</h1>
    <p class="subtitle">${report.company_name}</p>
    <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  ${performanceSummary.overall_satisfaction ? `
  <div class="section">
    <h2>Performance Summary</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Overall Satisfaction</div>
        <div class="metric-value">${performanceSummary.overall_satisfaction}<span style="font-size: 24px; color: #6c757d;">/100</span></div>
        <div class="metric-trend">${performanceSummary.satisfaction_trend || 'Stable'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Net Promoter Score</div>
        <div class="metric-value">${performanceSummary.nps_score || 0}</div>
        <div class="metric-trend">${performanceSummary.nps_trend || 'Stable'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Responses</div>
        <div class="metric-value">${performanceSummary.total_feedback || 0}</div>
        <div class="metric-trend">Customers Surveyed</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${customMetrics.length > 0 ? `
  <div class="section">
    <h2>Your Custom Metrics</h2>
    <div class="custom-metrics">
      ${customMetrics.map(metric => `
        <div class="custom-metric ${metric.trend === 'down' ? 'trend-down' : ''}">
          <h3>${metric.name}</h3>
          <div class="value">${metric.average !== null && metric.average !== undefined ? metric.average : 'N/A'}</div>
          <span class="trend ${metric.trend === 'up' ? 'trend-up' : metric.trend === 'down' ? 'trend-down' : 'trend-stable'}">
            ${metric.trend_description || metric.trend}
          </span>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${(feedbackHighlights.positive?.length > 0 || feedbackHighlights.improvement?.length > 0) ? `
  <div class="section">
    <h2>Customer Feedback Highlights</h2>
    <div class="feedback-section">
      ${feedbackHighlights.positive?.length > 0 ? `
        <div class="feedback-box positive">
          <h4>✓ Top Strengths</h4>
          <ul>
            ${feedbackHighlights.positive.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${feedbackHighlights.improvement?.length > 0 ? `
        <div class="feedback-box improvement">
          <h4>⚡ Areas for Improvement</h4>
          <ul>
            ${feedbackHighlights.improvement.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>The Power100 Experience</strong></p>
    <p>PowerConfidence Report™ - Trusted by Industry Leaders</p>
    <p>This report is confidential and intended solely for ${report.company_name}</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate PDF for a report
 *
 * DATABASE TABLES: partner_reports, strategic_partners
 * DATABASE FIELDS: report_data (JSONB), pdf_generated_at, pdf_url, pdf_file_size
 *
 * @param {number} reportId - Report ID
 * @returns {Object} PDF generation result with URL
 */
async function generateReportPDF(reportId) {
  console.log(`[PDF Generation] Starting for report ${reportId}`);

  // STEP 1: Get report data
  // DATABASE FIELDS: pr.report_data, pr.report_type, pr.quarter, pr.year,
  //                  sp.company_name, sp.logo_url, pr.custom_branding
  const result = await query(`
    SELECT
      pr.id,
      pr.report_data,
      pr.report_type,
      pr.quarter,
      pr.year,
      pr.custom_branding,
      sp.company_name,
      sp.logo_url,
      sp.description
    FROM partner_reports pr
    JOIN strategic_partners sp ON pr.partner_id = sp.id
    WHERE pr.id = $1
  `, [reportId]);

  if (result.rows.length === 0) {
    throw new Error(`Report ${reportId} not found`);
  }

  const report = result.rows[0];

  // STEP 2: Render HTML for PDF
  const html = renderReportHTML(report);

  // STEP 3: Generate PDF with Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });

  await browser.close();

  // STEP 4: Upload to S3
  const fileName = `reports/${report.report_type}/${report.quarter}-${report.year}/report-${reportId}.pdf`;

  const uploadParams = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    ACL: 'private',  // Use signed URLs for access
    Metadata: {
      reportId: reportId.toString(),
      reportType: report.report_type,
      quarter: report.quarter,
      year: report.year.toString()
    }
  };

  const uploadResult = await s3.upload(uploadParams).promise();

  // STEP 5: Update database with PDF info
  // DATABASE FIELDS: pdf_url, pdf_file_size, pdf_generated_at
  await query(`
    UPDATE partner_reports
    SET
      pdf_url = $1,
      pdf_file_size = $2,
      pdf_generated_at = NOW(),
      updated_at = NOW()
    WHERE id = $3
  `, [uploadResult.Location, pdfBuffer.length, reportId]);

  console.log(`[PDF Generation] ✅ PDF generated for report ${reportId}: ${uploadResult.Location}`);

  return {
    reportId,
    pdfUrl: uploadResult.Location,
    fileSize: pdfBuffer.length,
    generatedAt: new Date()
  };
}

/**
 * Generate secure share token for report
 *
 * @param {number} reportId - Report ID
 * @param {number} expiresInDays - Days until expiration (default 30)
 * @returns {Object} Share token and URL
 */
async function generateShareToken(reportId, expiresInDays = 30) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await query(`
    UPDATE partner_reports
    SET
      share_token = $1,
      share_expires_at = $2,
      is_public = true,
      updated_at = NOW()
    WHERE id = $3
  `, [token, expiresAt, reportId]);

  const shareUrl = `${process.env.FRONTEND_URL || 'https://tpx.power100.io'}/share/${token}`;

  console.log(`[Share Token] Generated for report ${reportId}: ${shareUrl}`);

  return {
    token,
    shareUrl,
    expiresAt
  };
}

/**
 * Get report by share token
 *
 * @param {string} token - Share token
 * @returns {Object} Report data
 */
async function getReportByShareToken(token) {
  const result = await query(`
    SELECT
      pr.*,
      sp.company_name,
      sp.logo_url
    FROM partner_reports pr
    JOIN strategic_partners sp ON pr.partner_id = sp.id
    WHERE pr.share_token = $1
      AND pr.is_public = true
      AND (pr.share_expires_at IS NULL OR pr.share_expires_at > NOW())
  `, [token]);

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired share link');
  }

  // Increment view count
  await query(`
    UPDATE partner_reports
    SET
      view_count = view_count + 1,
      last_public_view_at = NOW()
    WHERE share_token = $1
  `, [token]);

  return result.rows[0];
}

/**
 * Get signed URL for PDF download
 *
 * @param {number} reportId - Report ID
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {string} Signed download URL
 */
async function getPDFDownloadUrl(reportId, expiresIn = 3600) {
  // Get PDF URL from database
  // DATABASE FIELD: pdf_url
  const result = await query(`
    SELECT pdf_url FROM partner_reports WHERE id = $1
  `, [reportId]);

  if (result.rows.length === 0 || !result.rows[0].pdf_url) {
    throw new Error(`No PDF available for report ${reportId}`);
  }

  const pdfUrl = result.rows[0].pdf_url;
  const key = pdfUrl.split('.com/')[1];  // Extract S3 key from full URL

  // Generate signed URL
  const signedUrl = s3.getSignedUrl('getObject', {
    Bucket: S3_BUCKET,
    Key: key,
    Expires: expiresIn
  });

  // Increment download count
  // DATABASE FIELD: download_count
  await query(`
    UPDATE partner_reports
    SET
      download_count = download_count + 1,
      last_downloaded_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [reportId]);

  return signedUrl;
}

/**
 * Generate PDFs for all reports without PDF
 *
 * @returns {Object} Summary of PDF generation
 */
async function generateAllMissingPDFs() {
  console.log('[PDF Generation] Generating all missing PDFs');

  // Get reports without PDFs
  // DATABASE FIELD: pdf_url (NULL check)
  const result = await query(`
    SELECT id
    FROM partner_reports
    WHERE pdf_url IS NULL
      AND status IN ('generated', 'delivered', 'viewed')
    ORDER BY generation_date DESC
  `);

  const reports = result.rows;
  console.log(`[PDF Generation] Found ${reports.length} reports without PDFs`);

  const results = {
    total: reports.length,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  for (const report of reports) {
    try {
      await generateReportPDF(report.id);
      results.succeeded++;
    } catch (error) {
      console.error(`[PDF Generation] ❌ Failed for report ${report.id}:`, error.message);
      results.failed++;
      results.errors.push({
        reportId: report.id,
        error: error.message
      });
    }
  }

  console.log(`[PDF Generation] ✅ Batch complete: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

module.exports = {
  generateReportPDF,
  generateShareToken,
  getReportByShareToken,
  getPDFDownloadUrl,
  generateAllMissingPDFs
};
