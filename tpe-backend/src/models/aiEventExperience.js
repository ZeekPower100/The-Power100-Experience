const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class AiEventExperience {
  static async create(experienceData) {
    const sql = `
      INSERT INTO ai_event_experiences (
        event_id, contractor_id, profile_completed, custom_agenda,
        recommended_speakers, recommended_sponsors, prepared_questions,
        sessions_attended, speaker_alerts_sent, notes_captured,
        sponsor_visits, real_time_insights, speaker_ratings,
        event_summary, key_takeaways, action_items,
        follow_up_connections, engagement_score, value_received,
        would_recommend
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      experienceData.event_id,
      experienceData.contractor_id,
      experienceData.profile_completed || false,
      safeJsonStringify(experienceData.custom_agenda || null),
      safeJsonStringify(experienceData.recommended_speakers || []),
      safeJsonStringify(experienceData.recommended_sponsors || []),
      safeJsonStringify(experienceData.prepared_questions || []),
      safeJsonStringify(experienceData.sessions_attended || []),
      experienceData.speaker_alerts_sent || 0,
      safeJsonStringify(experienceData.notes_captured || []),
      safeJsonStringify(experienceData.sponsor_visits || []),
      safeJsonStringify(experienceData.real_time_insights || []),
      safeJsonStringify(experienceData.speaker_ratings || {}),
      experienceData.event_summary || null,
      safeJsonStringify(experienceData.key_takeaways || []),
      safeJsonStringify(experienceData.action_items || []),
      safeJsonStringify(experienceData.follow_up_connections || []),
      experienceData.engagement_score || null,
      experienceData.value_received || null,
      experienceData.would_recommend || null
    ];

    const result = await query(sql, values);
    return this.parseExperience(result.rows[0]);
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM ai_event_experiences WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.parseExperience(result.rows[0]) : null;
  }

  static async findByEventAndContractor(eventId, contractorId) {
    const result = await query(
      `SELECT * FROM ai_event_experiences
       WHERE event_id = $1 AND contractor_id = $2`,
      [eventId, contractorId]
    );
    return result.rows[0] ? this.parseExperience(result.rows[0]) : null;
  }

  static async findByContractor(contractorId) {
    const result = await query(
      `SELECT * FROM ai_event_experiences
       WHERE contractor_id = $1
       ORDER BY created_at DESC`,
      [contractorId]
    );
    return result.rows.map(row => this.parseExperience(row));
  }

  static async findByEvent(eventId) {
    const result = await query(
      `SELECT * FROM ai_event_experiences
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );
    return result.rows.map(row => this.parseExperience(row));
  }

  static async updatePreEvent(id, preEventData) {
    const sql = `
      UPDATE ai_event_experiences
      SET profile_completed = $2,
          custom_agenda = $3,
          recommended_speakers = $4,
          recommended_sponsors = $5,
          prepared_questions = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      preEventData.profile_completed || false,
      safeJsonStringify(preEventData.custom_agenda),
      safeJsonStringify(preEventData.recommended_speakers),
      safeJsonStringify(preEventData.recommended_sponsors),
      safeJsonStringify(preEventData.prepared_questions)
    ];

    const result = await query(sql, values);
    return this.parseExperience(result.rows[0]);
  }

  static async addSessionAttended(id, sessionData) {
    const sql = `
      UPDATE ai_event_experiences
      SET sessions_attended = sessions_attended || $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [id, safeJsonStringify([sessionData])];
    const result = await query(sql, values);
    return this.parseExperience(result.rows[0]);
  }

  static async addNote(id, note) {
    const sql = `
      UPDATE ai_event_experiences
      SET notes_captured = notes_captured || $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const noteWithTimestamp = {
      ...note,
      timestamp: new Date().toISOString()
    };

    const values = [id, safeJsonStringify([noteWithTimestamp])];
    const result = await query(sql, values);
    return this.parseExperience(result.rows[0]);
  }

  static async addRealTimeInsight(id, insight) {
    const sql = `
      UPDATE ai_event_experiences
      SET real_time_insights = real_time_insights || $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const insightWithTimestamp = {
      ...insight,
      timestamp: new Date().toISOString()
    };

    const values = [id, safeJsonStringify([insightWithTimestamp])];
    const result = await query(sql, values);
    return this.parseExperience(result.rows[0]);
  }

  static async updatePostEvent(id, postEventData) {
    const sql = `
      UPDATE ai_event_experiences
      SET speaker_ratings = $2,
          event_summary = $3,
          key_takeaways = $4,
          action_items = $5,
          follow_up_connections = $6,
          engagement_score = $7,
          value_received = $8,
          would_recommend = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      safeJsonStringify(postEventData.speaker_ratings),
      postEventData.event_summary,
      safeJsonStringify(postEventData.key_takeaways),
      safeJsonStringify(postEventData.action_items),
      safeJsonStringify(postEventData.follow_up_connections),
      postEventData.engagement_score,
      postEventData.value_received,
      postEventData.would_recommend
    ];

    const result = await query(sql, values);
    return this.parseExperience(result.rows[0]);
  }

  static async incrementSpeakerAlerts(id) {
    const sql = `
      UPDATE ai_event_experiences
      SET speaker_alerts_sent = speaker_alerts_sent + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id]);
    return this.parseExperience(result.rows[0]);
  }

  static async getHighEngagementExperiences(minScore = 80, limit = 20) {
    const result = await query(
      `SELECT * FROM ai_event_experiences
       WHERE engagement_score >= $1
       ORDER BY engagement_score DESC
       LIMIT $2`,
      [minScore, limit]
    );
    return result.rows.map(row => this.parseExperience(row));
  }

  static async getEventStats(eventId) {
    const sql = `
      SELECT
        COUNT(*) as total_attendees,
        AVG(engagement_score) as avg_engagement,
        SUM(CASE WHEN would_recommend = true THEN 1 ELSE 0 END) as would_recommend_count,
        SUM(CASE WHEN profile_completed = true THEN 1 ELSE 0 END) as profiles_completed,
        AVG(speaker_alerts_sent) as avg_alerts_sent,
        SUM(json_array_length(sessions_attended::json)) as total_sessions_attended,
        SUM(json_array_length(notes_captured::json)) as total_notes_captured
      FROM ai_event_experiences
      WHERE event_id = $1
    `;

    const result = await query(sql, [eventId]);
    return result.rows[0];
  }

  static async getContractorEventHistory(contractorId) {
    const sql = `
      SELECT
        e.*,
        ev.name as event_name,
        ev.date as event_date
      FROM ai_event_experiences e
      JOIN events ev ON e.event_id = ev.id
      WHERE e.contractor_id = $1
      ORDER BY ev.date DESC
    `;

    const result = await query(sql, [contractorId]);
    return result.rows.map(row => this.parseExperience(row));
  }

  static parseExperience(experience) {
    if (!experience) return null;

    return {
      ...experience,
      custom_agenda: safeJsonParse(experience.custom_agenda, null),
      recommended_speakers: safeJsonParse(experience.recommended_speakers, []),
      recommended_sponsors: safeJsonParse(experience.recommended_sponsors, []),
      prepared_questions: safeJsonParse(experience.prepared_questions, []),
      sessions_attended: safeJsonParse(experience.sessions_attended, []),
      notes_captured: safeJsonParse(experience.notes_captured, []),
      sponsor_visits: safeJsonParse(experience.sponsor_visits, []),
      real_time_insights: safeJsonParse(experience.real_time_insights, []),
      speaker_ratings: safeJsonParse(experience.speaker_ratings, {}),
      key_takeaways: safeJsonParse(experience.key_takeaways, []),
      action_items: safeJsonParse(experience.action_items, []),
      follow_up_connections: safeJsonParse(experience.follow_up_connections, [])
    };
  }
}

module.exports = AiEventExperience;