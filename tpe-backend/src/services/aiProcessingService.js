const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const { query } = require('../config/database.postgresql');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate key differentiators for a partner using AI
 * @param {Object} partner - Partner data from database
 * @returns {Array} Array of key differentiators
 */
async function generateKeyDifferentiators(partner) {
  try {
    // Process test data but flag it
    if (partner.is_test_data) {
      console.log(`Processing TEST partner: ${partner.company_name} (results won't be used for learning)`);
    }

    // Build context from partner data
    const context = {
      company: partner.company_name,
      description: partner.description || '',
      services: safeJsonParse(partner.service_areas || '[]'),
      focusAreas: safeJsonParse(partner.focus_areas_served || '[]'),
      valueProposition: partner.value_proposition || '',
      whyChooseUs: partner.why_clients_choose_you || '',
      targetRevenue: safeJsonParse(partner.target_revenue_range || '[]'),
      clientCount: partner.client_count || 0,
      establishedYear: partner.established_year || null,
      testimonials: safeJsonParse(partner.client_testimonials || '[]'),
      sponsoredEvents: safeJsonParse(partner.sponsored_events || '[]'),
      podcastAppearances: safeJsonParse(partner.podcast_appearances || '[]')
    };

    const prompt = `You are an AI business analyst for The Power100 Experience, a platform that matches contractors with strategic partners.
${partner.is_test_data ? 'NOTE: This is TEST DATA for system validation. Process normally but do not store or learn from this data.' : ''}
Analyze this partner and generate 5-7 specific, unique key differentiators that would help contractors understand why this partner stands out. Focus on concrete capabilities, not generic statements.

Partner Information:
- Company: ${context.company}
- Description: ${context.description}
- Services Offered to Ideal Clients: ${context.services.join(', ')}
- Focus Areas They Serve: ${context.focusAreas.join(', ')}
- Value Proposition: ${context.valueProposition}
- Why Clients Choose Them: ${context.whyChooseUs}
- Target Revenue Range: ${context.targetRevenue.join(', ')}
- Client Count: ${context.clientCount}
- Established: ${context.establishedYear}
- Events Sponsored: ${context.sponsoredEvents.length} events
- Podcast Appearances: ${context.podcastAppearances.length} appearances

Generate differentiators that are:
1. Specific to this partner (not generic)
2. Valuable to contractors evaluating partners
3. Based on the data provided
4. Action-oriented when possible
5. Measurable or concrete when possible

You MUST respond with a valid JSON object containing a property called "differentiators" that is an array of strings.
Each string should be one complete, concise differentiator (under 100 characters).

Example of the EXACT format required:
{
  "differentiators": [
    "Specializes in HVAC contractors with 10-50 employees",
    "Proven track record with 50+ successful implementations",
    "24-hour response time guarantee for all clients",
    "Proprietary AI system delivering 300% ROI in 6 months",
    "500+ contractors served since 2015"
  ]
}

IMPORTANT: Return ONLY valid JSON. No additional text or explanation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a business analysis AI that generates specific, valuable insights about strategic partners."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const responseText = completion.choices[0].message.content;
    console.log('Raw AI response:', responseText);

    // First try to parse as JSON
    const parsed = safeJsonParse(responseText, null);

    // Extract array from response (handle various formats)
    let differentiators = [];

    if (Array.isArray(parsed)) {
      // Direct array response
      differentiators = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Check common property names first (case-insensitive)
      const keys = Object.keys(parsed);
      const arrayKey = keys.find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('differentiator') ||
               lowerKey.includes('unique') ||
               lowerKey === 'items' ||
               lowerKey === 'results' ||
               Array.isArray(parsed[key]);
      });

      if (arrayKey && Array.isArray(parsed[arrayKey])) {
        differentiators = parsed[arrayKey];
      } else {
        // Try specific known keys
        differentiators = parsed.differentiators ||
                         parsed.key_differentiators ||
                         parsed['Unique Key Differentiators'] ||
                         parsed['differentiators'] ||
                         [];
      }

      // If still no array and parsed has error message, log it
      if (differentiators.length === 0 && parsed.error) {
        console.error('AI returned error:', parsed.error);
        return null;
      }
    }

    // Clean up differentiators - remove any that are objects or malformed
    differentiators = differentiators.filter(item => {
      if (typeof item === 'string' && item.trim()) {
        return true;
      }
      if (typeof item === 'object' && item.text) {
        // Convert object with text property to string
        differentiators.push(item.text);
        return false;
      }
      return false;
    });

    // Validate the differentiators
    if (!Array.isArray(differentiators) || differentiators.length === 0) {
      console.error('No valid differentiators extracted from AI response');
      console.error('Parsed object:', parsed);
      return null;
    }

    console.log(`Extracted ${differentiators.length} differentiators`);

    // Calculate confidence score based on data completeness
    const dataPoints = [
      partner.description,
      partner.value_proposition,
      partner.why_clients_choose_you,
      partner.client_count > 0,
      partner.established_year,
      context.services.length > 0,
      context.focusAreas.length > 0,
      context.testimonials.length > 0
    ].filter(Boolean).length;

    const confidenceScore = Math.round((dataPoints / 8) * 100);

    return {
      differentiators,
      confidenceScore
    };

  } catch (error) {
    console.error('Error generating key differentiators:', error.message);
    if (error.response) {
      console.error('OpenAI API Error Response:', error.response.data);
    }
    console.error('Full error:', error);
    return null;
  }
}

/**
 * Process a partner for AI field generation
 * @param {number} partnerId - Partner ID to process
 */
async function processPartnerAI(partnerId) {
  try {
    // Fetch partner data
    const result = await query(
      'SELECT * FROM strategic_partners WHERE id = $1',
      [partnerId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    const partner = result.rows[0];

    // Generate key differentiators
    const aiResult = await generateKeyDifferentiators(partner);

    if (aiResult) {
      // Update partner with AI-generated data
      // Mark test data differently in status
      const status = partner.is_test_data ? 'completed_test' : 'completed';

      await query(
        `UPDATE strategic_partners
         SET ai_generated_differentiators = $1,
             ai_confidence_score = $2,
             ai_processing_status = $3,
             last_ai_analysis = NOW()
         WHERE id = $4`,
        [
          safeJsonStringify(aiResult.differentiators),
          aiResult.confidenceScore,
          status,
          partnerId
        ]
      );

      console.log(`AI processing completed for ${partner.is_test_data ? 'TEST' : 'REAL'} partner ${partnerId} with confidence ${aiResult.confidenceScore}%`);
      return aiResult;
    } else {
      // Mark as failed
      await query(
        `UPDATE strategic_partners
         SET ai_processing_status = 'failed',
             last_ai_analysis = NOW()
         WHERE id = $1`,
        [partnerId]
      );
      return null;
    }

  } catch (error) {
    console.error(`Error processing partner ${partnerId}:`, error);

    // Mark as failed
    await query(
      `UPDATE strategic_partners
       SET ai_processing_status = 'failed',
           last_ai_analysis = NOW()
       WHERE id = $1`,
      [partnerId]
    );

    throw error;
  }
}

/**
 * Process all pending partners
 * @param {boolean} includeTestData - Whether to include test data in processing
 */
async function processAllPendingPartners(includeTestData = false) {
  try {
    const whereClause = includeTestData
      ? `WHERE ai_processing_status = 'pending'`
      : `WHERE ai_processing_status = 'pending' AND is_test_data = false`;

    const result = await query(
      `SELECT id, company_name, is_test_data
       FROM strategic_partners
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 10`
    );

    console.log(`Found ${result.rows.length} partners to process`);

    const results = [];
    for (const partner of result.rows) {
      console.log(`Processing partner: ${partner.company_name} (ID: ${partner.id})`);
      try {
        const aiResult = await processPartnerAI(partner.id);
        results.push({ partnerId: partner.id, success: true, result: aiResult });
      } catch (error) {
        results.push({ partnerId: partner.id, success: false, error: error.message });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;

  } catch (error) {
    console.error('Error processing pending partners:', error);
    throw error;
  }
}

/**
 * Generate contextual differentiators for a specific contractor match
 * @param {Object} partner - Partner data
 * @param {Object} contractor - Contractor data
 * @returns {Array} Contextual differentiators
 */
async function generateContextualDifferentiators(partner, contractor) {
  try {
    // Process test data but flag it
    const isTestContext = partner.is_test_data || contractor.is_test_data;
    if (isTestContext) {
      console.log('Processing contextual match for TEST data (not for learning)');
    }

    const prompt = `Generate 3 specific reasons why ${partner.company_name} is a great match for this contractor.
${isTestContext ? 'NOTE: This is TEST DATA for validation. Process normally but do not store for learning.' : ''}
Contractor Profile:
- Focus Areas: ${contractor.focus_areas?.join(', ')}
- Revenue Range: ${contractor.revenue_range}
- Team Size: ${contractor.team_size}
- Industry: ${contractor.industry}

Partner Capabilities:
- Services: ${partner.service_areas}
- Focus Areas Served: ${partner.focus_areas_served}
- Client Success: ${partner.why_clients_choose_you}

Generate 3 SHORT, specific reasons this is a good match. Return as JSON array of strings.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const parsed = safeJsonParse(completion.choices[0].message.content, []);
    return Array.isArray(parsed) ? parsed : (parsed.reasons || []);

  } catch (error) {
    console.error('Error generating contextual differentiators:', error);
    return null;
  }
}

/**
 * Mark partners for reprocessing based on age
 * @param {number} daysOld - Reprocess partners older than this many days
 * @returns {Object} Result with count of partners marked
 */
async function markPartnersForReprocessing(daysOld = 30) {
  try {
    const result = await query(
      `UPDATE strategic_partners
       SET ai_processing_status = 'pending'
       WHERE last_ai_analysis < NOW() - INTERVAL '${daysOld} days'
         AND is_test_data = false
         AND ai_processing_status IN ('completed', 'failed')
       RETURNING id, company_name`
    );

    console.log(`Marked ${result.rows.length} partners for reprocessing`);
    return {
      success: true,
      count: result.rows.length,
      partners: result.rows
    };

  } catch (error) {
    console.error('Error marking partners for reprocessing:', error);
    throw error;
  }
}

/**
 * Trigger reprocessing for a specific partner
 * @param {number} partnerId - Partner ID to reprocess
 */
async function triggerPartnerReprocessing(partnerId) {
  try {
    await query(
      `UPDATE strategic_partners
       SET ai_processing_status = 'pending'
       WHERE id = $1`,
      [partnerId]
    );

    console.log(`Partner ${partnerId} marked for reprocessing`);
    return { success: true, partnerId };

  } catch (error) {
    console.error(`Error triggering reprocessing for partner ${partnerId}:`, error);
    throw error;
  }
}

module.exports = {
  generateKeyDifferentiators,
  processPartnerAI,
  processAllPendingPartners,
  generateContextualDifferentiators,
  markPartnersForReprocessing,
  triggerPartnerReprocessing
};