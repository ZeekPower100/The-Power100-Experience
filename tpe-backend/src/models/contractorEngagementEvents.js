// Contractor Engagement Events Model
const { query } = require('../config/database');

class ContractorEngagementEvents {
  // Create a new engagement event
  static async create(data) {
    const sql = `
      INSERT INTO contractor_engagement_events (
        contractor_id, event_type, event_data, channel, session_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.event_type,
      data.event_data || {},
      data.channel || null,
      data.session_id || null
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all events for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_engagement_events
      WHERE contractor_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get events by type
  static async findByEventType(contractorId, eventType) {
    const sql = `
      SELECT * FROM contractor_engagement_events
      WHERE contractor_id = $1 AND event_type = $2
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId, eventType]);
    return result.rows;
  }

  // Get events by session
  static async findBySessionId(sessionId) {
    const sql = `
      SELECT * FROM contractor_engagement_events
      WHERE session_id = $1
      ORDER BY created_at ASC
    `;
    const result = await query(sql, [sessionId]);
    return result.rows;
  }

  // Get a single event by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_engagement_events WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get recent events
  static async findRecent(contractorId, limit = 50) {
    const sql = `
      SELECT * FROM contractor_engagement_events
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await query(sql, [contractorId, limit]);
    return result.rows;
  }

  // Get events within time range
  static async findByTimeRange(contractorId, startDate, endDate) {
    const sql = `
      SELECT * FROM contractor_engagement_events
      WHERE contractor_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId, startDate, endDate]);
    return result.rows;
  }

  // Batch create events
  static async createBatch(events) {
    const values = [];
    const placeholders = [];
    let paramCount = 1;

    events.forEach(event => {
      placeholders.push(`($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3}, $${paramCount+4})`);
      values.push(
        event.contractor_id,
        event.event_type,
        event.event_data || {},
        event.channel || null,
        event.session_id || null
      );
      paramCount += 5;
    });

    const sql = `
      INSERT INTO contractor_engagement_events (
        contractor_id, event_type, event_data, channel, session_id
      ) VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows;
  }

  // Get event count by type
  static async getEventCounts(contractorId) {
    const sql = `
      SELECT
        event_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM contractor_engagement_events
      WHERE contractor_id = $1
      GROUP BY event_type
      ORDER BY count DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get session summary
  static async getSessionSummary(sessionId) {
    const sql = `
      SELECT
        session_id,
        contractor_id,
        COUNT(*) as event_count,
        MIN(created_at) as session_start,
        MAX(created_at) as session_end,
        ARRAY_AGG(DISTINCT event_type) as event_types
      FROM contractor_engagement_events
      WHERE session_id = $1
      GROUP BY session_id, contractor_id
    `;
    const result = await query(sql, [sessionId]);
    return result.rows[0];
  }

  // Delete old events (for cleanup)
  static async deleteOldEvents(daysToKeep = 90) {
    const sql = `
      DELETE FROM contractor_engagement_events
      WHERE created_at < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING COUNT(*) as deleted_count
    `;
    const result = await query(sql);
    return result.rows[0];
  }

  // Get engagement patterns
  static async getEngagementPatterns(contractorId) {
    const sql = `
      SELECT
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions,
        ARRAY_AGG(DISTINCT event_type) as event_types
      FROM contractor_engagement_events
      WHERE contractor_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }
}

module.exports = ContractorEngagementEvents;