const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * PCR (Power Confidence Rating) Scoring Service
 * Handles conversational feedback collection and sentiment analysis for event experiences
 * ALL FIELD NAMES MATCH DATABASE COLUMNS EXACTLY - SOURCE OF TRUTH
 *
 * Database columns (event_pcr_scores):
 * - id, event_id, contractor_id, pcr_type, entity_id, entity_name
 * - explicit_score, sentiment_score, final_pcr_score
 * - question_asked, response_received, conversation_context
 * - sentiment_analysis, confidence_level
 * - requested_at, responded_at, created_at, updated_at
 */
class PCRScoringService {
  /**
   * Request PCR score for a specific recommendation
   * Sends SMS asking for 1-5 rating
   */
  async requestPCRScore(event_id, contractor_id, pcr_type, entity_id, entity_name) {
    try {
      // Build personalized question based on type
      const question_asked = this.buildPCRQuestion(pcr_type, entity_name);

      // Create PCR request record using EXACT column names
      await query(`
        INSERT INTO event_pcr_scores (
          event_id,
          contractor_id,
          pcr_type,
          entity_id,
          entity_name,
          question_asked,
          requested_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
        ON CONFLICT (event_id, contractor_id, pcr_type, entity_id)
        DO UPDATE SET
          question_asked = EXCLUDED.question_asked,
          requested_at = NOW(),
          updated_at = NOW()
      `, [event_id, contractor_id, pcr_type, entity_id, entity_name, question_asked]);

      // Get contractor phone using EXACT column names
      const contractorResult = await query(`
        SELECT ea.real_phone, c.phone, c.name
        FROM contractors c
        LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
        WHERE c.id = $2
      `, [event_id, contractor_id]);

      if (contractorResult.rows.length === 0) {
        return { success: false, error: 'Contractor not found' };
      }

      const contractor = contractorResult.rows[0];
      const phone = contractor.real_phone || contractor.phone;

      // Send via n8n webhook
      const N8N_WEBHOOK_BASE = process.env.NODE_ENV === 'production'
        ? (process.env.N8N_WEBHOOK_URL || 'https://n8n.srv918843.hstgr.cloud')
        : (process.env.N8N_DEV_WEBHOOK_URL || 'https://n8n.srv918843.hstgr.cloud');

      const webhookPath = process.env.NODE_ENV === 'production'
        ? '/webhook/event-pcr-request'
        : '/webhook/event-pcr-request-dev';

      const payload = {
        event_type: 'pcr_request',
        event_id: event_id,
        contractor_id: contractor_id,
        phone: phone,
        message: question_asked,
        pcr_info: {
          type: pcr_type,
          entity_id: entity_id,
          entity_name: entity_name
        }
      };

      const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(payload)
      });

      if (response.ok) {
        console.log(`[PCRScoring] Requested ${pcr_type} PCR for contractor ${contractor_id}`);
        return { success: true, question_asked };
      } else {
        console.error(`[PCRScoring] Failed to send PCR request webhook`);
        return { success: false, error: 'Failed to send SMS' };
      }
    } catch (error) {
      console.error('[PCRScoring] Error requesting PCR score:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build appropriate question based on PCR type
   */
  buildPCRQuestion(pcr_type, entity_name) {
    const templates = {
      speaker: `How would you rate ${entity_name}'s session? Reply with 1-5 (1=Poor, 5=Excellent) 🎤`,
      sponsor: `How was your conversation at the ${entity_name} booth? Rate 1-5 (1=Not helpful, 5=Very helpful) 🤝`,
      session: `How valuable was "${entity_name}" for you? Rate 1-5 (1=Not valuable, 5=Very valuable) 📊`,
      peer_match: `How was your connection with ${entity_name}? Rate 1-5 (1=Not useful, 5=Very useful) 👥`,
      overall_event: `Overall, how would you rate this event? Reply 1-5 (1=Poor, 5=Excellent) ⭐`
    };

    return templates[pcr_type] || `Rate your experience with ${entity_name} (1-5):`;
  }

  /**
   * Process SMS response with explicit PCR score
   * Handles "3", "5/5", "4 - great session", etc.
   */
  async processExplicitScore(event_id, contractor_id, pcr_type, entity_id, response_received) {
    try {
      // Extract numeric score from response (1-5)
      // Use word boundary to avoid extracting numbers from unrelated text
      const scoreMatch = response_received.match(/\b([1-5])\b/);
      if (!scoreMatch) {
        console.log('[PCRScoring] No explicit score found in response');
        return null;
      }

      const explicit_score = parseInt(scoreMatch[1]);

      // Also run sentiment analysis on the full response
      const sentimentResult = await this.analyzeSentiment(response_received);

      // Calculate final PCR score (weighted: 70% explicit, 30% sentiment)
      const final_pcr_score = this.calculateFinalScore(explicit_score, sentimentResult.sentiment_score);

      // Insert or update database using EXACT column names
      await query(`
        INSERT INTO event_pcr_scores (
          event_id,
          contractor_id,
          pcr_type,
          entity_id,
          explicit_score,
          sentiment_score,
          final_pcr_score,
          response_received,
          sentiment_analysis,
          confidence_level,
          responded_at,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
        ON CONFLICT (event_id, contractor_id, pcr_type, entity_id)
        DO UPDATE SET
          explicit_score = EXCLUDED.explicit_score,
          sentiment_score = EXCLUDED.sentiment_score,
          final_pcr_score = EXCLUDED.final_pcr_score,
          response_received = EXCLUDED.response_received,
          sentiment_analysis = EXCLUDED.sentiment_analysis,
          confidence_level = EXCLUDED.confidence_level,
          responded_at = NOW(),
          updated_at = NOW()
      `, [
        event_id,
        contractor_id,
        pcr_type,
        entity_id,
        explicit_score,
        sentimentResult.sentiment_score,
        final_pcr_score,
        response_received,
        safeJsonStringify(sentimentResult),
        sentimentResult.confidence
      ]);

      console.log(`[PCRScoring] Recorded PCR: ${pcr_type} = ${final_pcr_score} (explicit: ${explicit_score}, sentiment: ${sentimentResult.sentiment_score})`);

      return {
        success: true,
        explicit_score: explicit_score,
        sentiment_score: sentimentResult.sentiment_score,
        final_pcr_score: final_pcr_score
      };
    } catch (error) {
      console.error('[PCRScoring] Error processing explicit score:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze sentiment from ANY SMS response
   * Used for both explicit PCR responses and general conversation
   */
  async analyzeSentiment(response_received) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis expert for event feedback. Analyze the sentiment of responses and return a JSON object with:
            {
              "sentiment_score": 0.0-1.0 (0=very negative, 0.5=neutral, 1.0=very positive),
              "confidence": 0.0-1.0 (how confident you are in this score),
              "sentiment_category": "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
              "key_indicators": ["array", "of", "words/phrases", "that", "indicate", "sentiment"],
              "emotional_tone": "description of emotional tone",
              "actionable_feedback": "any specific feedback or suggestions mentioned"
            }

            Be nuanced - detect sarcasm, mixed feelings, and context.`
          },
          {
            role: 'user',
            content: `Analyze this response: "${response_received}"`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = safeJsonParse(completion.choices[0].message.content, {
        sentiment_score: 0.5,
        confidence: 0.5,
        sentiment_category: 'neutral',
        key_indicators: [],
        emotional_tone: 'neutral',
        actionable_feedback: null
      });

      return analysis;
    } catch (error) {
      console.error('[PCRScoring] Error analyzing sentiment:', error);
      return {
        sentiment_score: 0.5,
        confidence: 0.0,
        sentiment_category: 'neutral',
        error: error.message
      };
    }
  }

  /**
   * Calculate final PCR score from explicit and sentiment scores
   * Weighted: 70% explicit (if provided), 30% sentiment
   */
  calculateFinalScore(explicit_score, sentiment_score) {
    if (explicit_score) {
      // Have explicit score: 70% explicit, 30% sentiment
      const sentimentOn5Scale = sentiment_score * 5; // Convert 0-1 to 0-5
      const final_pcr_score = (explicit_score * 0.7) + (sentimentOn5Scale * 0.3);
      return parseFloat(final_pcr_score.toFixed(2));
    } else {
      // Only sentiment: convert to 5-point scale
      return parseFloat((sentiment_score * 5).toFixed(2));
    }
  }

  /**
   * Get overall event PCR score
   * Aggregates all individual element PCRs
   */
  async getEventPCR(event_id) {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_scores,
          AVG(final_pcr_score) as average_pcr,
          MIN(final_pcr_score) as lowest_pcr,
          MAX(final_pcr_score) as highest_pcr,
          COUNT(CASE WHEN explicit_score IS NOT NULL THEN 1 END) as explicit_count,
          COUNT(CASE WHEN explicit_score IS NULL THEN 1 END) as sentiment_only_count
        FROM event_pcr_scores
        WHERE event_id = $1
          AND responded_at IS NOT NULL
      `, [event_id]);

      if (result.rows.length === 0 || result.rows[0].total_scores === '0') {
        return {
          event_id: event_id,
          overall_pcr: 0,
          total_scores: 0,
          message: 'No PCR scores yet'
        };
      }

      const stats = result.rows[0];

      return {
        event_id: event_id,
        overall_pcr: parseFloat(stats.average_pcr).toFixed(2),
        total_scores: parseInt(stats.total_scores),
        score_range: {
          lowest: parseFloat(stats.lowest_pcr),
          highest: parseFloat(stats.highest_pcr)
        },
        score_types: {
          explicit_count: parseInt(stats.explicit_count),
          sentiment_only_count: parseInt(stats.sentiment_only_count)
        }
      };
    } catch (error) {
      console.error('[PCRScoring] Error getting event PCR:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get PCR breakdown by type (speakers, sponsors, sessions, etc.)
   */
  async getPCRBreakdown(event_id) {
    try {
      const result = await query(`
        SELECT
          pcr_type,
          entity_name,
          COUNT(*) as response_count,
          AVG(final_pcr_score) as average_score,
          AVG(explicit_score) as average_explicit,
          AVG(sentiment_score) as average_sentiment
        FROM event_pcr_scores
        WHERE event_id = $1
          AND responded_at IS NOT NULL
        GROUP BY pcr_type, entity_name
        ORDER BY pcr_type, average_score DESC
      `, [event_id]);

      const breakdown = {
        speakers: [],
        sponsors: [],
        sessions: [],
        peer_matches: [],
        overall: []
      };

      result.rows.forEach(row => {
        const item = {
          name: row.entity_name,
          response_count: parseInt(row.response_count),
          average_pcr: parseFloat(row.average_score).toFixed(2),
          explicit_avg: row.average_explicit ? parseFloat(row.average_explicit).toFixed(2) : null,
          sentiment_avg: row.average_sentiment ? parseFloat(row.average_sentiment).toFixed(2) : null
        };

        if (row.pcr_type === 'speaker') breakdown.speakers.push(item);
        else if (row.pcr_type === 'sponsor') breakdown.sponsors.push(item);
        else if (row.pcr_type === 'session') breakdown.sessions.push(item);
        else if (row.pcr_type === 'peer_match') breakdown.peer_matches.push(item);
        else if (row.pcr_type === 'overall_event') breakdown.overall.push(item);
      });

      return breakdown;
    } catch (error) {
      console.error('[PCRScoring] Error getting PCR breakdown:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-request PCR after recommendation is acted upon
   * Called when contractor attends session, visits booth, etc.
   */
  async autoRequestPCR(event_id, contractor_id, pcr_type, entity_id, entity_name, delayMinutes = 30) {
    try {
      // Schedule PCR request for after the experience
      // For now, we'll send immediately, but in production this would be scheduled
      console.log(`[PCRScoring] Auto-requesting PCR for ${pcr_type} after ${delayMinutes} minutes`);

      // In production, this would trigger a delayed job
      // For now, let's just log it
      return {
        success: true,
        scheduled_for: new Date(Date.now() + delayMinutes * 60000).toISOString(),
        pcr_type: pcr_type,
        entity_name: entity_name
      };
    } catch (error) {
      console.error('[PCRScoring] Error auto-requesting PCR:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PCRScoringService();