const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class EpisodeTranscripts {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO episode_transcripts (
          episode_id, full_transcript, transcript_confidence, word_count, language,
          speakers_identified, speaker_segments, host_speaking_percentage, ai_summary,
          episode_type, key_topics, actionable_insights, tips_and_strategies,
          tools_mentioned, metrics_discussed, content_depth_score, practical_value_score,
          audio_quality_score, conversation_flow_score, contractor_relevance_score,
          focus_area_alignment, target_audience_fit, transcription_time_seconds,
          analysis_time_seconds, total_tokens_used, processing_cost_usd,
          whisper_model_used, gpt_model_used
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING *
      `;
      const values = [
        data.episode_id,
        data.full_transcript,
        data.transcript_confidence,
        data.word_count,
        data.language || 'en',
        data.speakers_identified,
        safeJsonStringify(data.speaker_segments || []),
        data.host_speaking_percentage,
        data.ai_summary,
        data.episode_type,
        data.key_topics || [],
        safeJsonStringify(data.actionable_insights || []),
        safeJsonStringify(data.tips_and_strategies || []),
        safeJsonStringify(data.tools_mentioned || []),
        safeJsonStringify(data.metrics_discussed || []),
        data.content_depth_score,
        data.practical_value_score,
        data.audio_quality_score,
        data.conversation_flow_score,
        data.contractor_relevance_score,
        safeJsonStringify(data.focus_area_alignment || {}),
        data.target_audience_fit,
        data.transcription_time_seconds,
        data.analysis_time_seconds,
        data.total_tokens_used,
        data.processing_cost_usd,
        data.whisper_model_used,
        data.gpt_model_used
      ];
      const result = await query(sql, values);
      return this.parseTranscript(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating episode transcript: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM episode_transcripts WHERE id = $1', [id]);
      return result.rows[0] ? this.parseTranscript(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding episode transcript: ${error.message}`);
    }
  }

  static async getByEpisodeId(episodeId) {
    try {
      const result = await query(
        'SELECT * FROM episode_transcripts WHERE episode_id = $1 ORDER BY created_at DESC',
        [episodeId]
      );
      return result.rows.map(row => this.parseTranscript(row));
    } catch (error) {
      throw new Error(`Error fetching transcripts by episode: ${error.message}`);
    }
  }

  static async findByTopic(topic) {
    try {
      const result = await query(
        'SELECT * FROM episode_transcripts WHERE $1 = ANY(key_topics) ORDER BY created_at DESC',
        [topic]
      );
      return result.rows.map(row => this.parseTranscript(row));
    } catch (error) {
      throw new Error(`Error finding transcripts by topic: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'episode_id', 'full_transcript', 'transcript_confidence', 'word_count', 'language',
        'speakers_identified', 'speaker_segments', 'host_speaking_percentage', 'ai_summary',
        'episode_type', 'key_topics', 'actionable_insights', 'tips_and_strategies',
        'tools_mentioned', 'metrics_discussed', 'content_depth_score', 'practical_value_score',
        'audio_quality_score', 'conversation_flow_score', 'contractor_relevance_score',
        'focus_area_alignment', 'target_audience_fit', 'transcription_time_seconds',
        'analysis_time_seconds', 'total_tokens_used', 'processing_cost_usd',
        'whisper_model_used', 'gpt_model_used'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          if (['speaker_segments', 'actionable_insights', 'tips_and_strategies',
               'tools_mentioned', 'metrics_discussed', 'focus_area_alignment'].includes(key)) {
            fields.push(`${key} = $${paramCount}`);
            values.push(safeJsonStringify(data[key]));
          } else {
            fields.push(`${key} = $${paramCount}`);
            values.push(data[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      values.push(id);

      const sql = `
        UPDATE episode_transcripts
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseTranscript(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating episode transcript: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM episode_transcripts WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseTranscript(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting episode transcript: ${error.message}`);
    }
  }


  static async searchTranscripts(searchTerm, limit = 20) {
    try {
      const result = await query(
        `SELECT * FROM episode_transcripts
         WHERE full_transcript ILIKE $1
         ORDER BY transcript_confidence DESC
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );
      return result.rows.map(row => this.parseTranscript(row));
    } catch (error) {
      throw new Error(`Error searching transcripts: ${error.message}`);
    }
  }

  static parseTranscript(transcript) {
    if (!transcript) return null;
    return {
      ...transcript,
      speaker_segments: safeJsonParse(transcript.speaker_segments, []),
      actionable_insights: safeJsonParse(transcript.actionable_insights, []),
      tips_and_strategies: safeJsonParse(transcript.tips_and_strategies, []),
      tools_mentioned: safeJsonParse(transcript.tools_mentioned, []),
      metrics_discussed: safeJsonParse(transcript.metrics_discussed, []),
      focus_area_alignment: safeJsonParse(transcript.focus_area_alignment, {})
    };
  }
}

module.exports = EpisodeTranscripts;