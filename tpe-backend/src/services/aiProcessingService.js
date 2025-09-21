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

/**
 * Process AI extraction for a book
 */
async function processBookAI(bookId) {
  try {
    // Fetch book data
    const result = await query(
      'SELECT * FROM books WHERE id = $1',
      [bookId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const book = result.rows[0];
    console.log(`📚 Processing book AI for: ${book.title}`);

    // Prepare content for AI extraction
    const bookContent = {
      title: book.title,
      author: book.author,
      description: book.description,
      key_takeaways: book.key_takeaways,
      table_of_contents: book.table_of_contents,
      chapter_summaries: book.chapter_summaries,
      topics: book.topics,
      focus_areas_covered: book.focus_areas_covered,
      target_audience: book.target_audience,
      intended_solutions: book.intended_solutions,
      book_goals: book.book_goals,
      testimonials: book.testimonials
    };

    // Extract AI insights using OpenAI
    const prompt = `Analyze this business book and extract the following:

Book Title: ${book.title}
Author: ${book.author}
Description: ${book.description || ''}
Key Takeaways: ${book.key_takeaways || ''}
Table of Contents: ${book.table_of_contents || ''}
Chapter Summaries: ${book.chapter_summaries || ''}
Topics: ${book.topics || ''}
Focus Areas: ${book.focus_areas_covered || ''}
Target Audience: ${book.target_audience || ''}
Book Goals: ${book.book_goals || ''}

Please extract and provide:
1. AI Summary - A concise 2-3 paragraph executive summary
2. AI Insights - 5-7 key business insights from the book (as an array of strings)
3. AI Tags - 5-10 relevant tags for categorization
4. Actionable Items - 5 specific actions readers can implement
5. Implementation Difficulty - Scale of 1-10 (1=easy, 10=very complex)
6. Time to Value - Estimated time to see results from implementing concepts
7. Chapter Highlights - Key point from each chapter (if table of contents provided)

Format your response as a JSON object with these exact keys:
{
  "ai_summary": "Executive summary text here...",
  "ai_insights": ["insight1", "insight2", "insight3", "insight4", "insight5"],
  "ai_tags": ["tag1", "tag2", ...],
  "actionable_items": ["action1", "action2", ...],
  "implementation_difficulty": 5,
  "time_to_value": "3-6 months",
  "chapter_highlights": {...}
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business book analyst specializing in extracting actionable insights for contractors and home improvement businesses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0].message.content;
    const aiData = safeJsonParse(aiResponse, {});

    // Update book with AI-generated data
    await query(
      `UPDATE books
       SET ai_summary = $1,
           ai_insights = $2,
           ai_tags = $3,
           actionable_ratio = $4,
           implementation_guides = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        aiData.ai_summary || null,
        safeJsonStringify(aiData.ai_insights || []),  // ai_insights needs to be JSON
        safeJsonStringify(aiData.ai_tags || []),
        aiData.implementation_difficulty || null,
        safeJsonStringify(aiData.actionable_items || []),
        bookId
      ]
    );

    console.log(`✅ Book AI processing completed for: ${book.title}`);

    return {
      success: true,
      bookId,
      title: book.title,
      ai_fields: aiData
    };
  } catch (error) {
    console.error(`❌ Error processing book AI for ${bookId}:`, error);

    // Mark as failed in database
    await query(
      `UPDATE books SET updated_at = NOW() WHERE id = $1`,
      [bookId]
    );

    throw error;
  }
}

/**
 * Process AI extraction for a video
 */
async function processVideoAI(videoId) {
  try {
    // Fetch video data
    const result = await query(
      'SELECT * FROM video_content WHERE id = $1',
      [videoId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = result.rows[0];
    console.log(`🎥 Processing video AI for: ${video.title}`);

    // Check if it's a partner demo video
    const isPartnerVideo = video.entity_type === 'partner';
    let partnerContext = '';

    if (isPartnerVideo) {
      // Fetch partner details for context
      const partnerResult = await query(
        'SELECT company_name, description, value_proposition FROM strategic_partners WHERE id = $1',
        [video.entity_id]
      );

      if (partnerResult.rows.length > 0) {
        const partner = partnerResult.rows[0];
        partnerContext = `
Partner Company: ${partner.company_name}
Partner Description: ${partner.description || ''}
Value Proposition: ${partner.value_proposition || ''}`;
      }
    }

    // Extract AI insights using OpenAI
    const prompt = `Analyze this ${isPartnerVideo ? 'partner demo' : 'business'} video and provide insights:

Video Title: ${video.title}
Description: ${video.description || ''}
Duration: ${video.duration_seconds ? `${Math.round(video.duration_seconds/60)} minutes` : 'Unknown'}
Type: ${video.video_type || 'Demo'}
${partnerContext}

Based on the video information${isPartnerVideo ? ' and knowing this is a partner demo video' : ''}, provide:

1. ai_summary - A comprehensive 2-3 paragraph summary of what this video covers and its key value
2. ai_insights - An array of 5-7 key insights or takeaways (as an array of strings)
3. ai_key_topics - An array of 5-8 main topics covered (as an array of strings)
4. ai_sentiment_analysis - Analysis of tone and sentiment as an object with:
   - overall_tone: (professional/casual/energetic/calm)
   - confidence_level: (high/medium/low)
   - authenticity_score: (1-10)
   - engagement_potential: (high/medium/low)
5. ai_engagement_score - Overall engagement score (1-100) based on likely viewer retention

${isPartnerVideo ? `
For partner demo videos, specifically evaluate:
- How clearly they communicate their value proposition
- Professional quality of the presentation
- Strength of their call-to-action
- Technical competence demonstrated
- Overall persuasiveness for contractors` : ''}

Return as JSON with these exact field names.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI video analyst specializing in business and partner demo videos. Extract actionable insights and evaluate video effectiveness. Always return valid JSON only with no additional text."
        },
        {
          role: "user",
          content: prompt + "\n\nReturn ONLY valid JSON with no additional text or markdown."
        }
      ],
      temperature: 0.3
    });

    // Clean up any potential markdown or extra text
    let responseContent = completion.choices[0].message.content;
    // Remove markdown code blocks if present
    responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const aiData = JSON.parse(responseContent);

    // Update video with AI-generated data
    await query(
      `UPDATE video_content
       SET ai_summary = $1,
           ai_insights = $2,
           ai_key_topics = $3,
           ai_sentiment_analysis = $4,
           ai_engagement_score = $5,
           ai_processing_status = 'completed',
           last_ai_analysis = NOW()
       WHERE id = $6`,
      [
        aiData.ai_summary || '',
        safeJsonStringify(aiData.ai_insights || []),
        safeJsonStringify(aiData.ai_key_topics || []),
        safeJsonStringify(aiData.ai_sentiment_analysis || {}),
        aiData.ai_engagement_score || 50,  // Default to 50 if not provided
        videoId
      ]
    );

    console.log(`✅ Video AI processing completed for: ${video.title}`);

    return {
      success: true,
      videoId,
      title: video.title,
      ai_fields: aiData
    };

  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);

    // Mark as failed
    await query(
      `UPDATE video_content
       SET ai_processing_status = 'failed',
           last_ai_analysis = NOW()
       WHERE id = $1`,
      [videoId]
    );

    throw error;
  }
}

module.exports = {
  generateKeyDifferentiators,
  processPartnerAI,
  processAllPendingPartners,
  generateContextualDifferentiators,
  markPartnersForReprocessing,
  triggerPartnerReprocessing,
  processBookAI,
  processVideoAI
};