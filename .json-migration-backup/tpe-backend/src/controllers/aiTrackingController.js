/**
 * AI Behavioral Tracking Controller
 * Handles all AI-related tracking, analytics, and insights for contractors
 */

const { pool } = require('../config/database');

const aiTrackingController = {
  // ==========================================
  // ENGAGEMENT EVENT TRACKING
  // ==========================================
  
  /**
   * Track a contractor engagement event
   * Triggers automatic score updates via database triggers
   */
  async trackEvent(req, res) {
    try {
      const { contractor_id } = req.params;
      const { 
        event_type, 
        event_data = {}, 
        channel = 'web',
        session_id 
      } = req.body;

      // Validate required fields
      if (!event_type) {
        return res.status(400).json({
          success: false,
          error: 'Event type is required'
        });
      }

      // Insert engagement event (triggers auto-update)
      const result = await pool.query(
        `INSERT INTO contractor_engagement_events 
         (contractor_id, event_type, event_data, channel, session_id, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [contractor_id, event_type, JSON.stringify(event_data), channel, session_id]
      );

      // Get updated contractor metrics
      const contractor = await pool.query(
        `SELECT engagement_score, churn_risk, lifecycle_stage, next_best_action
         FROM contractors WHERE id = $1`,
        [contractor_id]
      );

      res.json({
        success: true,
        event: result.rows[0],
        updated_metrics: contractor.rows[0]
      });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track event'
      });
    }
  },

  /**
   * Track bulk events for a contractor
   */
  async trackBulkEvents(req, res) {
    try {
      const { contractor_id } = req.params;
      const { events } = req.body;
      
      console.log('Bulk events - contractor_id:', contractor_id);
      console.log('Bulk events - events:', events);

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Events array is required'
        });
      }

      // Use transaction for bulk insert
      await pool.query('BEGIN');
      
      const results = [];
      try {
        for (const event of events) {
          const result = await pool.query(
            `INSERT INTO contractor_engagement_events 
             (contractor_id, event_type, event_data, channel, session_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, event_type, created_at`,
            [
              contractor_id,
              event.event_type,
              JSON.stringify(event.event_data || {}),
              event.channel || 'web',
              event.session_id
            ]
          );
          results.push(result.rows[0]);
        }

        await pool.query('COMMIT');

        // Get updated metrics
        const contractor = await pool.query(
          `SELECT engagement_score, churn_risk, lifecycle_stage, next_best_action
           FROM contractors WHERE id = $1`,
          [contractor_id]
        );

        res.json({
          success: true,
          events_tracked: results.length,
          events: results,
          updated_metrics: contractor.rows[0]
        });
      } catch (innerError) {
        await pool.query('ROLLBACK');
        throw innerError;
      }
    } catch (error) {
      console.error('Error tracking bulk events:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to track events'
      });
    }
  },

  // ==========================================
  // BUSINESS GOALS & CHALLENGES
  // ==========================================

  /**
   * Add or update contractor business goals
   */
  async upsertBusinessGoals(req, res) {
    try {
      const { contractor_id } = req.params;
      const { goals } = req.body;

      if (!Array.isArray(goals)) {
        return res.status(400).json({
          success: false,
          error: 'Goals must be an array'
        });
      }

      const results = [];
      for (const goal of goals) {
        const result = await pool.query(
          `INSERT INTO contractor_business_goals 
           (contractor_id, goal, timeline, priority, current_progress)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
           goal = EXCLUDED.goal,
           timeline = EXCLUDED.timeline,
           priority = EXCLUDED.priority,
           current_progress = EXCLUDED.current_progress,
           updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            contractor_id,
            goal.goal,
            goal.timeline,
            goal.priority || 3,
            goal.current_progress || 0
          ]
        );
        results.push(result.rows[0]);
      }

      res.json({
        success: true,
        goals: results
      });
    } catch (error) {
      console.error('Error upserting goals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save goals'
      });
    }
  },

  /**
   * Track contractor challenges
   */
  async trackChallenges(req, res) {
    try {
      const { contractor_id } = req.params;
      const { challenges } = req.body;

      const results = [];
      for (const challenge of challenges) {
        const result = await pool.query(
          `INSERT INTO contractor_challenges 
           (contractor_id, challenge, severity, attempted_solutions, open_to_solutions)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            contractor_id,
            challenge.challenge,
            challenge.severity || 'medium',
            challenge.attempted_solutions || [],
            challenge.open_to_solutions !== false
          ]
        );
        results.push(result.rows[0]);
      }

      res.json({
        success: true,
        challenges: results
      });
    } catch (error) {
      console.error('Error tracking challenges:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track challenges'
      });
    }
  },

  // ==========================================
  // RECOMMENDATIONS & CONTENT ENGAGEMENT
  // ==========================================

  /**
   * Track content recommendations
   */
  async trackRecommendation(req, res) {
    try {
      const { contractor_id } = req.params;
      const {
        entity_type,
        entity_id,
        entity_name,
        reason,
        confidence_score = 50
      } = req.body;

      const result = await pool.query(
        `INSERT INTO contractor_recommendations 
         (contractor_id, entity_type, entity_id, entity_name, reason, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [contractor_id, entity_type, entity_id, entity_name, reason, confidence_score]
      );

      res.json({
        success: true,
        recommendation: result.rows[0]
      });
    } catch (error) {
      console.error('Error tracking recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track recommendation'
      });
    }
  },

  /**
   * Update recommendation engagement
   */
  async updateRecommendationEngagement(req, res) {
    try {
      const { recommendation_id } = req.params;
      const { engagement, feedback, outcome } = req.body;

      const result = await pool.query(
        `UPDATE contractor_recommendations 
         SET engagement = $1, feedback = $2, outcome = $3, engaged_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [engagement, feedback, outcome, recommendation_id]
      );

      res.json({
        success: true,
        recommendation: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update recommendation'
      });
    }
  },

  /**
   * Track content engagement
   */
  async trackContentEngagement(req, res) {
    try {
      const { contractor_id } = req.params;
      const {
        content_type,
        content_id,
        content_title,
        engagement_type,
        progress,
        time_spent,
        rating,
        notes
      } = req.body;

      const result = await pool.query(
        `INSERT INTO contractor_content_engagement 
         (contractor_id, content_type, content_id, content_title, engagement_type, 
          progress, time_spent, rating, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          contractor_id,
          content_type,
          content_id,
          content_title,
          engagement_type,
          progress || 0,
          time_spent,
          rating,
          notes
        ]
      );

      res.json({
        success: true,
        engagement: result.rows[0]
      });
    } catch (error) {
      console.error('Error tracking content engagement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track content engagement'
      });
    }
  },

  // ==========================================
  // ANALYTICS & INSIGHTS
  // ==========================================

  /**
   * Get contractor AI profile with all behavioral data
   */
  async getContractorAIProfile(req, res) {
    try {
      const { contractor_id } = req.params;

      // Get contractor with AI fields
      const contractor = await pool.query(
        `SELECT 
          c.*,
          COUNT(DISTINCT cg.id) as total_goals,
          COUNT(DISTINCT cc.id) FILTER (WHERE cc.resolved = false) as open_challenges,
          COUNT(DISTINCT ai.id) as total_interactions,
          COUNT(DISTINCT cr.id) as total_recommendations
        FROM contractors c
        LEFT JOIN contractor_business_goals cg ON c.id = cg.contractor_id
        LEFT JOIN contractor_challenges cc ON c.id = cc.contractor_id
        LEFT JOIN ai_interactions ai ON c.id = ai.contractor_id
        LEFT JOIN contractor_recommendations cr ON c.id = cr.contractor_id
        WHERE c.id = $1
        GROUP BY c.id`,
        [contractor_id]
      );

      if (contractor.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Contractor not found'
        });
      }

      // Get recent engagement events
      const recentEvents = await pool.query(
        `SELECT event_type, channel, created_at
         FROM contractor_engagement_events
         WHERE contractor_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [contractor_id]
      );

      // Get active goals
      const goals = await pool.query(
        `SELECT * FROM contractor_business_goals
         WHERE contractor_id = $1 AND completed_at IS NULL
         ORDER BY priority DESC`,
        [contractor_id]
      );

      // Get open challenges
      const challenges = await pool.query(
        `SELECT * FROM contractor_challenges
         WHERE contractor_id = $1 AND resolved = false
         ORDER BY severity`,
        [contractor_id]
      );

      // Get recent recommendations
      const recommendations = await pool.query(
        `SELECT * FROM contractor_recommendations
         WHERE contractor_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [contractor_id]
      );

      // Get content engagement summary
      const contentEngagement = await pool.query(
        `SELECT 
          content_type,
          COUNT(*) as count,
          AVG(progress) as avg_progress,
          AVG(rating) as avg_rating
         FROM contractor_content_engagement
         WHERE contractor_id = $1
         GROUP BY content_type`,
        [contractor_id]
      );

      res.json({
        success: true,
        profile: {
          ...contractor.rows[0],
          recent_events: recentEvents.rows,
          active_goals: goals.rows,
          open_challenges: challenges.rows,
          recent_recommendations: recommendations.rows,
          content_engagement_summary: contentEngagement.rows
        }
      });
    } catch (error) {
      console.error('Error getting AI profile:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get AI profile'
      });
    }
  },

  /**
   * Get engagement analytics for a contractor
   */
  async getEngagementAnalytics(req, res) {
    try {
      const { contractor_id } = req.params;
      const { days = 30 } = req.query;

      // Get daily engagement stats
      const dailyStats = await pool.query(
        `SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total_events,
          COUNT(DISTINCT session_id) as unique_sessions,
          array_agg(DISTINCT event_type) as event_types,
          array_agg(DISTINCT channel) as channels
         FROM contractor_engagement_events
         WHERE contractor_id = $1 
         AND created_at > CURRENT_DATE - INTERVAL '${days} days'
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY date DESC`,
        [contractor_id]
      );

      // Get metrics history
      const metricsHistory = await pool.query(
        `SELECT * FROM contractor_metrics_history
         WHERE contractor_id = $1
         AND calculated_at > CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY calculated_at DESC`,
        [contractor_id]
      );

      // Get communication stats
      const communicationStats = await pool.query(
        `SELECT 
          channel,
          direction,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened,
          COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
          COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied
         FROM contractor_communications
         WHERE contractor_id = $1
         AND created_at > CURRENT_DATE - INTERVAL '${days} days'
         GROUP BY channel, direction`,
        [contractor_id]
      );

      res.json({
        success: true,
        analytics: {
          daily_engagement: dailyStats.rows,
          metrics_history: metricsHistory.rows,
          communication_stats: communicationStats.rows
        }
      });
    } catch (error) {
      console.error('Error getting engagement analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get engagement analytics'
      });
    }
  },

  /**
   * Get at-risk contractors
   */
  async getAtRiskContractors(req, res) {
    try {
      const atRisk = await pool.query(
        `SELECT 
          id, name, company_name, email, phone,
          engagement_score, churn_risk, lifecycle_stage,
          next_best_action, last_ai_analysis
         FROM contractors
         WHERE lifecycle_stage = 'at_risk' 
         OR churn_risk > 70
         OR (engagement_score < 30 AND current_stage = 'completed')
         ORDER BY churn_risk DESC, engagement_score ASC`
      );

      res.json({
        success: true,
        at_risk_contractors: atRisk.rows
      });
    } catch (error) {
      console.error('Error getting at-risk contractors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get at-risk contractors'
      });
    }
  },

  /**
   * Get power users
   */
  async getPowerUsers(req, res) {
    try {
      const powerUsers = await pool.query(
        `SELECT 
          c.id, c.name, c.company_name, c.email,
          c.engagement_score, c.lifecycle_stage,
          COUNT(DISTINCT cee.id) as total_events_30d,
          COUNT(DISTINCT cce.content_id) as content_consumed,
          AVG(cce.rating) as avg_content_rating
         FROM contractors c
         LEFT JOIN contractor_engagement_events cee ON c.id = cee.contractor_id
           AND cee.created_at > CURRENT_DATE - INTERVAL '30 days'
         LEFT JOIN contractor_content_engagement cce ON c.id = cce.contractor_id
         WHERE c.lifecycle_stage = 'power_user' 
         OR c.engagement_score >= 80
         GROUP BY c.id
         ORDER BY c.engagement_score DESC`
      );

      res.json({
        success: true,
        power_users: powerUsers.rows
      });
    } catch (error) {
      console.error('Error getting power users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get power users'
      });
    }
  },

  /**
   * Update contractor preferences
   */
  async updatePreferences(req, res) {
    try {
      const { contractor_id } = req.params;
      const { communication_preferences, learning_preferences } = req.body;

      const updates = [];
      const values = [contractor_id];
      let paramCount = 1;

      if (communication_preferences) {
        updates.push(`communication_preferences = $${++paramCount}`);
        values.push(JSON.stringify(communication_preferences));
      }

      if (learning_preferences) {
        updates.push(`learning_preferences = $${++paramCount}`);
        values.push(JSON.stringify(learning_preferences));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No preferences to update'
        });
      }

      const result = await pool.query(
        `UPDATE contractors 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING communication_preferences, learning_preferences`,
        values
      );

      res.json({
        success: true,
        preferences: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  },

  /**
   * Log AI interaction
   */
  async logAIInteraction(req, res) {
    try {
      const { contractor_id } = req.params;
      const {
        interaction_type,
        query,
        response,
        context,
        helpful,
        action_taken,
        outcome,
        session_id
      } = req.body;

      const result = await pool.query(
        `INSERT INTO ai_interactions 
         (contractor_id, interaction_type, query, response, context, 
          helpful, action_taken, outcome, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          contractor_id,
          interaction_type,
          query,
          response,
          JSON.stringify(context || {}),
          helpful,
          action_taken,
          outcome,
          session_id
        ]
      );

      res.json({
        success: true,
        interaction: result.rows[0]
      });
    } catch (error) {
      console.error('Error logging AI interaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log AI interaction'
      });
    }
  }
};

module.exports = aiTrackingController;