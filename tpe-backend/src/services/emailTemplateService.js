// DATABASE-CHECKED: report_data structure verified November 1, 2025
// ================================================================
// Email Template Service
// ================================================================
// Purpose: Render HTML email templates for quarterly reports
// Data Source: report_data JSONB from partner_reports table
// Tables: partner_reports (report_data JSONB field)
// ================================================================

/**
 * Render email template for executive report or contractor report
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
 *
 * @param {Object} data - Template data
 * @param {string} data.companyName - Partner company name
 * @param {string} data.logoUrl - Partner logo URL
 * @param {string} data.quarter - Quarter (Q1, Q2, Q3, Q4)
 * @param {number} data.year - Year
 * @param {Object} data.reportData - Report data from JSONB (already parsed)
 * @param {string} data.reportUrl - URL to view full report
 * @returns {string} HTML email
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
  <!-- Header -->
  <div style="background: #ffffff; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; margin-bottom: 0;">
    <img src="${logoUrl || 'https://tpx.power100.io/logo.png'}" alt="${companyName}" style="max-width: 200px; height: auto; margin-bottom: 20px;">
    <h1 style="color: #FB0401; margin: 0; font-size: 24px;">${quarter} ${year} Executive Performance Report</h1>
  </div>

  <!-- Summary -->
  <div style="background: #ffffff; padding: 30px; margin-bottom: 0;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #FB0401;">
      <h2 style="margin-top: 0; color: #000; font-size: 20px;">Performance Summary</h2>
      <p style="margin: 10px 0;"><strong>Overall Satisfaction:</strong> <span style="font-size: 20px; color: #28a745;">${performance_summary?.overall_satisfaction || 'N/A'}/100</span></p>
      <p style="margin: 10px 0;"><strong>NPS Score:</strong> <span style="font-size: 20px; color: #28a745;">${performance_summary?.nps_score || 'N/A'}</span></p>
      <p style="margin: 10px 0;"><strong>Total Feedback:</strong> <span style="font-size: 20px; color: #28a745;">${performance_summary?.total_feedback || 0} responses</span></p>
    </div>
  </div>

  <!-- Custom Metrics -->
  <div style="background: #ffffff; padding: 30px; margin-bottom: 0;">
    <h2 style="color: #000; font-size: 20px; margin-top: 0;">Your Custom Metrics</h2>
    ${custom_metrics && custom_metrics.length > 0 ? custom_metrics.map(metric => `
      <div style="background: #fff; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <h3 style="margin-top: 0; color: #28a745; font-size: 18px;">${metric.name}</h3>
        <p style="font-size: 32px; font-weight: bold; margin: 10px 0; color: #000;">${metric.average || 'N/A'}</p>
        <p style="color: #6c757d; margin: 0; font-size: 14px;">Trend: <strong>${metric.trend || 'Stable'}</strong></p>
      </div>
    `).join('') : '<p style="color: #6c757d;">No custom metrics data available for this quarter.</p>'}
  </div>

  <!-- CTA Button -->
  <div style="background: #ffffff; padding: 30px; text-align: center;">
    <a href="${reportUrl}" style="display: inline-block; background: #FB0401; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Full Report</a>
  </div>

  <!-- Footer -->
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6;">
    <p style="margin: 10px 0;">This is your quarterly performance report from Power100 Experience.</p>
    <p style="margin: 10px 0;">Questions? Contact us at <a href="mailto:support@power100.io" style="color: #FB0401; text-decoration: none;">support@power100.io</a></p>
    <p style="margin: 10px 0; color: #adb5bd;">© ${year} Power100 Experience. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Render contractor report email template
 *
 * @param {Object} data - Template data
 * @param {string} data.contractorName - Contractor name
 * @param {string} data.contractorCompany - Contractor company name
 * @param {string} data.partnerName - Partner company name
 * @param {string} data.logoUrl - Partner logo URL
 * @param {string} data.quarter - Quarter (Q1, Q2, Q3, Q4)
 * @param {number} data.year - Year
 * @param {Object} data.reportData - Report data from JSONB (already parsed)
 * @param {string} data.reportUrl - URL to view full report
 * @returns {string} HTML email
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
  <!-- Header -->
  <div style="background: #ffffff; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; margin-bottom: 0;">
    <img src="${logoUrl || 'https://tpx.power100.io/logo.png'}" alt="${partnerName}" style="max-width: 200px; height: auto; margin-bottom: 20px;">
    <h1 style="color: #FB0401; margin: 0; font-size: 24px;">${quarter} ${year} Performance Report</h1>
    <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 16px;">For ${contractorCompany}</p>
  </div>

  <!-- Greeting -->
  <div style="background: #ffffff; padding: 30px; margin-bottom: 0;">
    <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${contractorName},</p>
    <p style="margin: 0; font-size: 16px; color: #6c757d;">Here's your quarterly performance comparison from <strong>${partnerName}</strong>. See how you're performing compared to peers in your revenue tier.</p>
  </div>

  <!-- Tier Performance -->
  <div style="background: #ffffff; padding: 30px; margin-bottom: 0;">
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
      <h2 style="margin-top: 0; color: #000; font-size: 20px;">Your Performance vs. Tier Average</h2>
      <p style="color: #6c757d; margin-bottom: 20px; font-size: 14px;">Revenue Tier: <strong>${current_tier_performance?.tier || 'N/A'}</strong></p>

      ${current_tier_performance?.metrics ? Object.entries(current_tier_performance.metrics).map(([metricName, metricData]) => {
        if (!metricData) return '';
        const color = metricData.trend === 'up' ? '#28a745' : (metricData.trend === 'down' ? '#dc3545' : '#6c757d');
        const arrow = metricData.trend === 'up' ? '▲' : (metricData.trend === 'down' ? '▼' : '●');
        return `
          <div style="border-bottom: 1px solid #dee2e6; padding: 15px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 16px;">${metricName}</strong>
              <span style="color: ${color}; font-size: 24px; font-weight: bold;">${arrow} ${metricData.variance}</span>
            </div>
            <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">${metricData.comparison}</p>
          </div>
        `;
      }).join('') : '<p style="color: #6c757d;">No performance metrics available for this quarter.</p>'}
    </div>
  </div>

  <!-- CTA Button -->
  <div style="background: #ffffff; padding: 30px; text-align: center;">
    <a href="${reportUrl}" style="display: inline-block; background: #28a745; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Detailed Report</a>
  </div>

  <!-- Footer -->
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6;">
    <p style="margin: 10px 0;">This report is provided by <strong>${partnerName}</strong> through Power100 Experience.</p>
    <p style="margin: 10px 0;">Questions about your performance? Contact ${partnerName} directly.</p>
    <p style="margin: 10px 0; color: #adb5bd;">© ${year} Power100 Experience. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

module.exports = {
  renderEmailTemplate,
  renderExecutiveReportEmail,
  renderContractorReportEmail
};
