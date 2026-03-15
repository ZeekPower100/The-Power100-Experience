// DATABASE-CHECKED: companies, communications, account_notes, account_tasks, company_intel, users, user_pillar_assignments, pillars verified 2026-03-15
// ================================================================
// Rankings Database Service
// ================================================================
// Purpose: High-level data access for the Rankings database (power_rankings_db)
// Used by: Rankings Rep Agent tools, salesAgentController
// Database: power_rankings_db (same RDS instance, separate DB)
// ================================================================

const { rankingsQuery } = require('../config/database.rankings');

const rankingsDbService = {
  // ============================================================
  // READ Operations
  // ============================================================

  /**
   * Get full company profile with scoring factors
   * @param {number} companyId
   * @returns {Promise<object|null>}
   */
  async getCompany(companyId) {
    try {
      const result = await rankingsQuery(`
        SELECT c.id, c.company_name, c.city, c.state, c.address, c.website, c.phone,
               c.rating, c.review_count, c.services, c.status,
               c.ceo_name, c.ceo_title, c.ceo_linkedin, c.company_linkedin,
               c.tenure, c.tenure_years, c.estimated_revenue,
               c.employee_count_min, c.employee_count_max, c.years_in_business, c.founded_year,
               c.email, c.facebook, c.twitter, c.instagram,
               c.score, c.rank_grade, c.scoring_factors,
               c.community_involvement, c.location_count,
               c.is_client, c.is_hip200, c.revenue_verified, c.revenue_source,
               c.metro_area, c.market_type,
               c.pillar_id, p.name as pillar_name, p.slug as pillar_slug,
               c.created_at, c.updated_at
        FROM companies c
        LEFT JOIN pillars p ON c.pillar_id = p.id
        WHERE c.id = $1
      `, [companyId]);

      if (result.rows.length === 0) return null;

      const company = result.rows[0];
      // Parse JSON text fields
      if (company.scoring_factors && typeof company.scoring_factors === 'string') {
        try { company.scoring_factors = JSON.parse(company.scoring_factors); } catch (e) { /* keep as string */ }
      }
      if (company.services && typeof company.services === 'string') {
        try { company.services = JSON.parse(company.services); } catch (e) { /* keep as string */ }
      }
      return company;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getCompany:', error.message);
      throw error;
    }
  },

  /**
   * Get recent communications for a company
   * @param {number} companyId
   * @param {number} limit - Max records to return (default 20)
   * @returns {Promise<Array>}
   */
  async getCompanyCommunications(companyId, limit = 20) {
    try {
      const result = await rankingsQuery(`
        SELECT c.id, c.company_id, c.user_id, c.comm_type, c.direction,
               c.subject, c.content, c.status, c.call_duration,
               c.call_disposition, c.ai_generated, c.ai_summary,
               c.created_at,
               u.full_name as rep_name
        FROM communications c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.company_id = $1
        ORDER BY c.created_at DESC
        LIMIT $2
      `, [companyId, limit]);

      return result.rows;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getCompanyCommunications:', error.message);
      throw error;
    }
  },

  /**
   * Get account notes for a company
   * @param {number} companyId
   * @returns {Promise<Array>}
   */
  async getCompanyNotes(companyId) {
    try {
      const result = await rankingsQuery(`
        SELECT n.id, n.company_id, n.user_id, n.note_type, n.content,
               n.is_pinned, n.created_at, n.updated_at,
               u.full_name as author_name
        FROM account_notes n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.company_id = $1
        ORDER BY n.is_pinned DESC, n.created_at DESC
      `, [companyId]);

      return result.rows;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getCompanyNotes:', error.message);
      throw error;
    }
  },

  /**
   * Get account tasks for a company
   * @param {number} companyId
   * @param {string} status - Filter by status (null = all)
   * @returns {Promise<Array>}
   */
  async getCompanyTasks(companyId, status = null) {
    try {
      let sql = `
        SELECT t.id, t.company_id, t.user_id, t.task_type, t.title,
               t.description, t.priority, t.status, t.due_date,
               t.completed_at, t.ai_generated, t.ai_reasoning,
               t.ai_talking_points, t.created_at, t.updated_at,
               u.full_name as assigned_to
        FROM account_tasks t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.company_id = $1
      `;
      const params = [companyId];

      if (status) {
        sql += ` AND t.status = $2`;
        params.push(status);
      }

      sql += ` ORDER BY t.due_date ASC NULLS LAST, t.priority ASC, t.created_at DESC`;

      const result = await rankingsQuery(sql, params);
      return result.rows;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getCompanyTasks:', error.message);
      throw error;
    }
  },

  /**
   * Get company intelligence/news
   * @param {number} companyId
   * @returns {Promise<Array>}
   */
  async getCompanyIntel(companyId) {
    try {
      const result = await rankingsQuery(`
        SELECT id, company_id, intel_type, title, content,
               source_url, source_platform, published_at,
               gathered_at, expires_at, created_at
        FROM company_intel
        WHERE company_id = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY gathered_at DESC
        LIMIT 20
      `, [companyId]);

      return result.rows;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getCompanyIntel:', error.message);
      throw error;
    }
  },

  /**
   * Get rep user profile with pillar assignments
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async getRepUser(userId) {
    try {
      const result = await rankingsQuery(`
        SELECT u.id, u.username, u.role, u.full_name, u.email, u.phone,
               u.is_active, u.last_login_at, u.created_at
        FROM users u
        WHERE u.id = $1
      `, [userId]);

      if (result.rows.length === 0) return null;

      const user = result.rows[0];

      // Get pillar assignments
      const pillarsResult = await rankingsQuery(`
        SELECT p.id, p.name, p.slug, p.market_type, p.description
        FROM user_pillar_assignments upa
        JOIN pillars p ON upa.pillar_id = p.id
        WHERE upa.user_id = $1
      `, [userId]);

      user.pillars = pillarsResult.rows;
      return user;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getRepUser:', error.message);
      throw error;
    }
  },

  /**
   * Get top companies in rep's assigned pillars
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRepPillarCompanies(userId, limit = 25) {
    try {
      const result = await rankingsQuery(`
        SELECT c.id, c.company_name, c.city, c.state, c.score, c.rank_grade,
               c.ceo_name, c.estimated_revenue, c.employee_count_max,
               c.is_client, c.status, c.pillar_id,
               p.name as pillar_name
        FROM companies c
        JOIN pillars p ON c.pillar_id = p.id
        JOIN user_pillar_assignments upa ON c.pillar_id = upa.pillar_id
        WHERE upa.user_id = $1
          AND c.status != 'disqualified'
        ORDER BY c.score DESC NULLS LAST
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      console.error('[Rankings DB Service] Error in getRepPillarCompanies:', error.message);
      throw error;
    }
  },

  // ============================================================
  // WRITE Operations
  // ============================================================

  /**
   * Log a communication to the rankings database
   * @param {object} data - { company_id, user_id, comm_type, direction, subject, content, status, call_duration, call_disposition, ai_generated, ai_summary }
   * @returns {Promise<object>}
   */
  async logCommunication(data) {
    try {
      const result = await rankingsQuery(`
        INSERT INTO communications
          (company_id, user_id, comm_type, direction, subject, content, status,
           call_duration, call_disposition, ai_generated, ai_summary, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *
      `, [
        data.company_id,
        data.user_id || null,
        data.comm_type,
        data.direction || 'outbound',
        data.subject || null,
        data.content || null,
        data.status || 'completed',
        data.call_duration || null,
        data.call_disposition || null,
        data.ai_generated || false,
        data.ai_summary || null
      ]);

      console.log(`[Rankings DB Service] Communication logged: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      console.error('[Rankings DB Service] Error in logCommunication:', error.message);
      throw error;
    }
  },

  /**
   * Create an account note
   * @param {object} data - { company_id, user_id, note_type, content, is_pinned }
   * @returns {Promise<object>}
   */
  async createAccountNote(data) {
    try {
      const result = await rankingsQuery(`
        INSERT INTO account_notes
          (company_id, user_id, note_type, content, is_pinned, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [
        data.company_id,
        data.user_id || null,
        data.note_type || 'manual',
        data.content,
        data.is_pinned || false
      ]);

      console.log(`[Rankings DB Service] Note created: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      console.error('[Rankings DB Service] Error in createAccountNote:', error.message);
      throw error;
    }
  },

  /**
   * Create an account task
   * @param {object} data - { company_id, user_id, task_type, title, description, priority, due_date, ai_generated, ai_reasoning, ai_talking_points }
   * @returns {Promise<object>}
   */
  async createAccountTask(data) {
    try {
      const result = await rankingsQuery(`
        INSERT INTO account_tasks
          (company_id, user_id, task_type, title, description, priority, status,
           due_date, ai_generated, ai_reasoning, ai_talking_points, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        data.company_id,
        data.user_id || null,
        data.task_type || 'follow_up',
        data.title,
        data.description || null,
        data.priority || 'medium',
        data.due_date || null,
        data.ai_generated || false,
        data.ai_reasoning || null,
        data.ai_talking_points || null
      ]);

      console.log(`[Rankings DB Service] Task created: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      console.error('[Rankings DB Service] Error in createAccountTask:', error.message);
      throw error;
    }
  }
};

module.exports = rankingsDbService;
