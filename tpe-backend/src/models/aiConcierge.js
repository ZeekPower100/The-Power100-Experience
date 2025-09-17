const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class AIConcierge {
  // ========================================
  // AI_CONCIERGE_CONVERSATIONS TABLE METHODS
  // Database columns: id, contractor_id, message_type, content, media_type, media_url, created_at
  // ========================================

  /**
   * Create a new conversation message
   * @param {Object} data - Message data matching database columns exactly
   */
  static async createConversationMessage(data) {
    try {
      const sql = `
        INSERT INTO ai_concierge_conversations (
          contractor_id,
          message_type,
          content,
          media_type,
          media_url,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        data.contractor_id,
        data.message_type,
        data.content,
        data.media_type || null,
        data.media_url || null,
        data.created_at || new Date()
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating conversation message: ${error.message}`);
    }
  }

  /**
   * Get conversations for a contractor
   * @param {string} contractor_id - Contractor ID (using exact database column name)
   * @param {number} limit - Max results
   * @param {number} offset - Skip results
   */
  static async getConversations(contractor_id, limit = 50, offset = 0) {
    try {
      const sql = `
        SELECT
          id,
          contractor_id,
          message_type,
          content,
          media_type,
          media_url,
          created_at
        FROM ai_concierge_conversations
        WHERE contractor_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(sql, [contractor_id, limit, offset]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching conversations: ${error.message}`);
    }
  }

  /**
   * Get conversation count for a contractor
   * @param {string} contractor_id - Contractor ID (using exact database column name)
   */
  static async getConversationCount(contractor_id) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ai_concierge_conversations
        WHERE contractor_id = $1
      `;

      const result = await query(sql, [contractor_id]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Error counting conversations: ${error.message}`);
    }
  }

  /**
   * Delete all conversations for a contractor
   * @param {string} contractor_id - Contractor ID (using exact database column name)
   */
  static async deleteConversations(contractor_id) {
    try {
      const sql = `
        DELETE FROM ai_concierge_conversations
        WHERE contractor_id = $1
        RETURNING *
      `;

      const result = await query(sql, [contractor_id]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error deleting conversations: ${error.message}`);
    }
  }

  // ========================================
  // AI_CONCIERGE_SESSIONS TABLE METHODS
  // Database columns: id, contractor_id, session_id, session_type, session_status, session_data, started_at, ended_at, duration_minutes
  // ========================================

  /**
   * Create a new session
   * @param {Object} data - Session data matching database columns exactly
   */
  static async createSession(data) {
    try {
      const sql = `
        INSERT INTO ai_concierge_sessions (
          contractor_id,
          session_id,
          session_type,
          session_status,
          session_data,
          started_at,
          ended_at,
          duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        data.contractor_id,
        data.session_id,
        data.session_type,
        data.session_status || 'active',
        data.session_data ? safeJsonStringify(data.session_data) : null,
        data.started_at || new Date(),
        data.ended_at || null,
        data.duration_minutes || null
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating session: ${error.message}`);
    }
  }

  /**
   * Get session by session_id
   * @param {string} session_id - Session ID (using exact database column name)
   */
  static async getSessionById(session_id) {
    try {
      const sql = `
        SELECT * FROM ai_concierge_sessions
        WHERE session_id = $1
      `;

      const result = await query(sql, [session_id]);
      if (result.rows.length > 0) {
        const session = result.rows[0];
        // Parse session_data if it exists
        if (session.session_data) {
          session.session_data = safeJsonParse(session.session_data, {});
        }
        return session;
      }
      return null;
    } catch (error) {
      throw new Error(`Error fetching session: ${error.message}`);
    }
  }

  /**
   * Get sessions for a contractor
   * @param {number} contractor_id - Contractor ID (using exact database column name)
   */
  static async getSessionsByContractor(contractor_id, limit = 10) {
    try {
      const sql = `
        SELECT * FROM ai_concierge_sessions
        WHERE contractor_id = $1
        ORDER BY started_at DESC
        LIMIT $2
      `;

      const result = await query(sql, [contractor_id, limit]);
      return result.rows.map(session => {
        if (session.session_data) {
          session.session_data = safeJsonParse(session.session_data, {});
        }
        return session;
      });
    } catch (error) {
      throw new Error(`Error fetching sessions: ${error.message}`);
    }
  }

  /**
   * Update session
   * @param {string} session_id - Session ID (using exact database column name)
   * @param {Object} updates - Fields to update (using exact database column names)
   */
  static async updateSession(session_id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Only update fields that exist in the database
      const allowedFields = ['session_type', 'session_status', 'session_data', 'ended_at', 'duration_minutes'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          fields.push(`${field} = $${paramCount}`);
          if (field === 'session_data' && typeof updates[field] === 'object') {
            values.push(safeJsonStringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
          paramCount++;
        }
      }

      if (fields.length === 0) return null;

      values.push(session_id);

      const sql = `
        UPDATE ai_concierge_sessions
        SET ${fields.join(', ')}
        WHERE session_id = $${paramCount}
        RETURNING *
      `;

      const result = await query(sql, values);
      if (result.rows.length > 0) {
        const session = result.rows[0];
        if (session.session_data) {
          session.session_data = safeJsonParse(session.session_data, {});
        }
        return session;
      }
      return null;
    } catch (error) {
      throw new Error(`Error updating session: ${error.message}`);
    }
  }

  /**
   * End a session and calculate duration
   * @param {string} session_id - Session ID (using exact database column name)
   */
  static async endSession(session_id) {
    try {
      // First get the session to calculate duration
      const session = await this.getSessionById(session_id);
      if (!session) return null;

      const ended_at = new Date();
      const started_at = new Date(session.started_at);
      const duration_minutes = Math.round((ended_at - started_at) / 60000);

      return await this.updateSession(session_id, {
        session_status: 'completed',
        ended_at,
        duration_minutes
      });
    } catch (error) {
      throw new Error(`Error ending session: ${error.message}`);
    }
  }
}

module.exports = AIConcierge;