const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get all bookings (admin)
const getAllBookings = async (req, res, next) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let queryText = `
    SELECT b.*,
           c.name as contractor_name,
           c.company_name as contractor_company,
           c.email as contractor_email,
           c.phone as contractor_phone,
           p.company_name as partner_name,
           p.contact_email as partner_email
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

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }

  queryText += ' ORDER BY b.scheduled_date DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
  values.push(limit, offset);

  const result = await query(queryText, values);

  res.status(200).json({
    success: true,
    count: result.rows.length,
    bookings: result.rows
  });
};

// Get single booking (admin)
const getBooking = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(`
    SELECT b.*,
           row_to_json(c) as contractor,
           row_to_json(p) as partner
    FROM demo_bookings b
    JOIN contractors c ON b.contractor_id = c.id
    JOIN strategic_partners p ON b.partner_id = p.id
    WHERE b.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    booking: result.rows[0]
  });
};

// Update booking (admin)
const updateBooking = async (req, res, next) => {
  const { id } = req.params;
  const { status, scheduled_date, notes, meeting_link } = req.body;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (status) {
    updates.push(`status = $${paramCount}`);
    values.push(status);
    paramCount++;
  }

  if (scheduled_date) {
    updates.push(`scheduled_date = $${paramCount}`);
    values.push(scheduled_date);
    paramCount++;
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramCount}`);
    values.push(notes);
    paramCount++;
  }

  if (meeting_link !== undefined) {
    updates.push(`meeting_link = $${paramCount}`);
    values.push(meeting_link);
    paramCount++;
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  const result = await query(
    `UPDATE demo_bookings 
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    booking: result.rows[0]
  });
};

// Delete booking (admin)
const deleteBooking = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM demo_bookings WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Booking deleted successfully'
  });
};

// Get booking statistics (admin)
const getBookingStats = async (req, res, next) => {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
      COUNT(*) FILTER (WHERE scheduled_date > CURRENT_TIMESTAMP) as upcoming,
      COUNT(*) FILTER (WHERE scheduled_date < CURRENT_TIMESTAMP AND status = 'scheduled') as overdue,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_this_week,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as new_this_month,
      ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as completion_rate
    FROM demo_bookings
  `);

  // Get bookings by partner
  const byPartner = await query(`
    SELECT 
      p.company_name,
      COUNT(b.id) as total_bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
      ROUND(
        COUNT(b.id) FILTER (WHERE b.status = 'completed')::numeric / 
        NULLIF(COUNT(b.id), 0) * 100, 2
      ) as completion_rate
    FROM strategic_partners p
    LEFT JOIN demo_bookings b ON p.id = b.partner_id
    GROUP BY p.id, p.company_name
    ORDER BY total_bookings DESC
    LIMIT 10
  `);

  res.status(200).json({
    success: true,
    stats: {
      overview: stats.rows[0],
      byPartner: byPartner.rows
    }
  });
};

module.exports = {
  getAllBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getBookingStats
};