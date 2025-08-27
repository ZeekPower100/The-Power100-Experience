const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get dashboard statistics
const getDashboardStats = async (req, res, next) => {
  // Get contractor stats
  const contractorStats = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE current_stage = 'completed') as completed,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_this_week,
      ROUND(
        COUNT(*) FILTER (WHERE current_stage = 'completed')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as completion_rate
    FROM contractors
  `);

  // Get partner stats
  const partnerStats = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true) as active,
      AVG(powerconfidence_score) as avg_confidence_score
    FROM strategic_partners
  `);

  // Get booking stats
  const bookingStats = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_date > CURRENT_TIMESTAMP) as upcoming,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_this_week
    FROM demo_bookings
  `);

  // Get recent activity
  const recentActivity = await query(`
    (
      SELECT 
        'contractor' as type,
        id,
        name as title,
        company_name as subtitle,
        created_at,
        current_stage as status
      FROM contractors
      ORDER BY created_at DESC
      LIMIT 5
    )
    UNION ALL
    (
      SELECT 
        'booking' as type,
        b.id,
        c.name as title,
        p.company_name as subtitle,
        b.created_at,
        b.status
      FROM demo_bookings b
      JOIN contractors c ON b.contractor_id = c.id
      JOIN strategic_partners p ON b.partner_id = p.id
      ORDER BY b.created_at DESC
      LIMIT 5
    )
    ORDER BY created_at DESC
    LIMIT 10
  `);

  // Get funnel conversion stats
  const funnelStats = await query(`
    SELECT 
      COUNT(*) as total_started,
      COUNT(*) FILTER (WHERE current_stage != 'verification') as past_verification,
      COUNT(*) FILTER (WHERE current_stage NOT IN ('verification', 'focus_selection')) as past_focus,
      COUNT(*) FILTER (WHERE current_stage NOT IN ('verification', 'focus_selection', 'profiling')) as past_profiling,
      COUNT(*) FILTER (WHERE current_stage NOT IN ('verification', 'focus_selection', 'profiling', 'matching')) as past_matching,
      COUNT(*) FILTER (WHERE current_stage = 'completed') as completed
    FROM contractors
  `);

  res.status(200).json({
    success: true,
    stats: {
      contractors: contractorStats.rows[0],
      partners: partnerStats.rows[0],
      bookings: bookingStats.rows[0],
      recentActivity: recentActivity.rows,
      funnel: funnelStats.rows[0]
    }
  });
};

// Export contractors data
const exportContractors = async (req, res, next) => {
  const { format = 'json', stage, startDate, endDate } = req.query;

  let queryText = 'SELECT * FROM contractors';
  const conditions = [];
  const values = [];

  if (stage) {
    conditions.push(`current_stage = $${values.length + 1}`);
    values.push(stage);
  }

  if (startDate) {
    conditions.push(`created_at >= $${values.length + 1}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(`created_at <= $${values.length + 1}`);
    values.push(endDate);
  }

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }

  queryText += ' ORDER BY created_at DESC';

  const result = await query(queryText, values);

  if (format === 'csv') {
    const csv = convertToCSV(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contractors.csv');
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
};

// Export partners data
const exportPartners = async (req, res, next) => {
  const { format = 'json', active } = req.query;

  let queryText = 'SELECT * FROM strategic_partners';
  
  if (active !== undefined) {
    queryText += ` WHERE is_active = ${active === 'true'}`;
  }

  queryText += ' ORDER BY power_confidence_score DESC';

  const result = await query(queryText);

  if (format === 'csv') {
    const csv = convertToCSV(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=partners.csv');
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
};

// Export bookings data
const exportBookings = async (req, res, next) => {
  const { format = 'json', status, startDate, endDate } = req.query;

  let queryText = `
    SELECT 
      b.*,
      c.name as contractor_name,
      c.company_name as contractor_company,
      p.company_name as partner_name
    FROM demo_bookings b
    JOIN contractors c ON b.contractor_id = c.id
    JOIN strategic_partners p ON b.partner_id = p.id
  `;

  const conditions = [];
  const values = [];

  if (status) {
    conditions.push(`b.status = $${values.length + 1}`);
    values.push(status);
  }

  if (startDate) {
    conditions.push(`b.scheduled_date >= $${values.length + 1}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(`b.scheduled_date <= $${values.length + 1}`);
    values.push(endDate);
  }

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }

  queryText += ' ORDER BY b.scheduled_date DESC';

  const result = await query(queryText, values);

  if (format === 'csv') {
    const csv = convertToCSV(result.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle arrays and objects
      if (Array.isArray(value)) {
        return `"${value.join('; ')}"`;
      }
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value)}"`;
      }
      // Escape quotes and handle commas
      return `"${String(value || '').replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
};

module.exports = {
  getDashboardStats,
  exportContractors,
  exportPartners,
  exportBookings
};