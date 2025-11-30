/**
 * AI Question Selector Service
 *
 * Intelligently selects the most appropriate question from the PCR question library
 * based on partner context, metric category, and historical performance.
 *
 * Flow:
 * 1. Fetch all questions for the metric category
 * 2. Analyze partner context (industry, services, past feedback)
 * 3. AI selects the best-fit question or falls back to default
 * 4. Track selection for analytics
 */

const { query } = require('../config/database');
const OpenAI = require('openai');

// Initialize OpenAI client (optional - falls back to default questions if not available)
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('[QuestionSelector] OpenAI initialized for AI question selection');
  }
} catch (e) {
  console.log('[QuestionSelector] OpenAI not available, using default question selection');
}

/**
 * Get all questions for a metric category
 */
async function getQuestionsForCategory(categoryName) {
  const result = await query(`
    SELECT
      q.id,
      q.question_text,
      q.question_type,
      q.scale_low_label,
      q.scale_high_label,
      q.context_keywords,
      q.is_default,
      q.usage_count as times_used,
      q.avg_response_rate as avg_completion_rate,
      c.name as category_name,
      c.display_name as category_display_name
    FROM pcr_question_library q
    JOIN pcr_metric_categories c ON q.metric_category_id = c.id
    WHERE c.name = $1 AND q.is_active = true
    ORDER BY q.is_default DESC, q.avg_response_rate DESC NULLS LAST
  `, [categoryName]);

  return result.rows;
}

/**
 * Get partner context for AI analysis
 */
async function getPartnerContext(partnerId) {
  const result = await query(`
    SELECT
      sp.company_name,
      sp.focus_areas,
      sp.services_offered,
      sp.target_revenue_range,
      sp.value_proposition,
      sp.key_differentiators,
      sp.ideal_customer,
      sp.geographical_coverage
    FROM strategic_partners sp
    WHERE sp.id = $1
  `, [partnerId]);

  return result.rows[0] || null;
}

/**
 * Get historical survey context (what questions worked well before)
 * Note: Since question library is new, historical data may not exist yet.
 * This query handles the actual power_card_responses schema with metric_X_score columns.
 */
async function getHistoricalContext(partnerId, categoryName) {
  try {
    // Get responses linked to templates using questions from this category
    // Scores are stored in metric_1_score, metric_2_score, metric_3_score
    const result = await query(`
      SELECT
        q.question_text,
        AVG(
          CASE
            WHEN t.metric_1_question_id = q.id THEN pr.metric_1_score
            WHEN t.metric_2_question_id = q.id THEN pr.metric_2_score
            WHEN t.metric_3_question_id = q.id THEN pr.metric_3_score
            ELSE NULL
          END
        ) as avg_score,
        COUNT(*) as response_count
      FROM power_card_responses pr
      JOIN power_card_templates t ON pr.template_id = t.id
      JOIN pcr_question_library q ON (
        t.metric_1_question_id = q.id OR
        t.metric_2_question_id = q.id OR
        t.metric_3_question_id = q.id
      )
      JOIN pcr_metric_categories c ON q.metric_category_id = c.id
      WHERE t.partner_id = $1 AND c.name = $2
      GROUP BY q.id, q.question_text
      HAVING COUNT(*) >= 3
      ORDER BY avg_score DESC NULLS LAST
      LIMIT 5
    `, [partnerId, categoryName]);

    return result.rows;
  } catch (error) {
    // Historical context is optional - if query fails, continue without it
    console.log('[QuestionSelector] No historical context available:', error.message);
    return [];
  }
}

/**
 * AI-powered question selection using OpenAI
 */
async function selectQuestionWithAI(questions, partnerContext, historicalContext, metricCategory) {
  if (!openai) {
    console.log('[QuestionSelector] OpenAI not configured, using default question');
    return selectDefaultQuestion(questions);
  }

  const prompt = buildSelectionPrompt(questions, partnerContext, historicalContext, metricCategory);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const aiResponse = response.choices[0]?.message?.content || '';
    const selectedId = parseAISelection(aiResponse, questions);

    if (selectedId) {
      const selected = questions.find(q => q.id === selectedId);
      return {
        question: selected,
        selection_method: 'ai',
        ai_reasoning: aiResponse
      };
    }
  } catch (error) {
    console.error('[QuestionSelector] AI selection error:', error.message);
  }

  // Fallback to default
  return selectDefaultQuestion(questions);
}

/**
 * Build the prompt for AI question selection
 */
function buildSelectionPrompt(questions, partnerContext, historicalContext, metricCategory) {
  // Handle services - could be array or string
  let servicesStr = 'Various';
  if (partnerContext?.services_offered) {
    servicesStr = Array.isArray(partnerContext.services_offered)
      ? partnerContext.services_offered.join(', ')
      : partnerContext.services_offered;
  }

  let prompt = `You are selecting the best survey question for measuring "${metricCategory}" in a PowerCard survey.

PARTNER CONTEXT:
- Company: ${partnerContext?.company_name || 'Unknown'}
- Focus Areas: ${partnerContext?.focus_areas || 'General'}
- Services: ${servicesStr}
- Value Proposition: ${partnerContext?.value_proposition || 'Not specified'}

`;

  if (historicalContext?.length > 0) {
    prompt += `HISTORICAL PERFORMANCE (questions that worked well):
${historicalContext.map(h => `- "${h.question_text}" (avg score: ${parseFloat(h.avg_score).toFixed(1)}, ${h.response_count} responses)`).join('\n')}

`;
  }

  prompt += `AVAILABLE QUESTIONS:
${questions.map((q, i) => `${i + 1}. [ID:${q.id}] "${q.question_text}"
   Type: ${q.question_type} | Scale: ${q.scale_low_label} → ${q.scale_high_label}
   Keywords: ${q.context_keywords?.join(', ') || 'none'}${q.is_default ? ' [DEFAULT]' : ''}`).join('\n\n')}

SELECT THE BEST QUESTION:
Consider:
1. Relevance to partner's services and value proposition
2. Question type that fits the measurement goal
3. Historical performance if available
4. Clear, actionable scale anchors

Respond with ONLY the question ID number (e.g., "ID:5") followed by a brief reason (1 sentence).`;

  return prompt;
}

/**
 * Parse the AI response to extract selected question ID
 */
function parseAISelection(aiResponse, questions) {
  // Look for ID:X pattern
  const idMatch = aiResponse.match(/ID[:\s]*(\d+)/i);
  if (idMatch) {
    const id = parseInt(idMatch[1]);
    if (questions.some(q => q.id === id)) {
      return id;
    }
  }

  // Look for just a number at the start
  const numMatch = aiResponse.match(/^\s*(\d+)/);
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1;
    if (idx >= 0 && idx < questions.length) {
      return questions[idx].id;
    }
  }

  return null;
}

/**
 * Select the default question as fallback
 */
function selectDefaultQuestion(questions) {
  const defaultQ = questions.find(q => q.is_default);
  const selected = defaultQ || questions[0];

  return {
    question: selected,
    selection_method: 'default',
    ai_reasoning: null
  };
}

/**
 * Record that a question was used (for analytics)
 */
async function recordQuestionUsage(questionId) {
  await query(`
    UPDATE pcr_question_library
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = $1
  `, [questionId]);
}

/**
 * Main function: Select the best question for a metric
 */
async function selectQuestion(categoryName, partnerId, options = {}) {
  const { useAI = true, forceQuestionId = null } = options;

  // If a specific question is forced, use it
  if (forceQuestionId) {
    const result = await query(`
      SELECT
        q.*,
        c.name as category_name,
        c.display_name as category_display_name
      FROM pcr_question_library q
      JOIN pcr_metric_categories c ON q.metric_category_id = c.id
      WHERE q.id = $1
    `, [forceQuestionId]);

    if (result.rows[0]) {
      await recordQuestionUsage(forceQuestionId);
      return {
        question: result.rows[0],
        selection_method: 'manual',
        ai_reasoning: null
      };
    }
  }

  // Get all questions for this category
  const questions = await getQuestionsForCategory(categoryName);

  if (questions.length === 0) {
    throw new Error(`No questions found for category: ${categoryName}`);
  }

  // If only one question or AI disabled, use default
  if (questions.length === 1 || !useAI) {
    const result = selectDefaultQuestion(questions);
    await recordQuestionUsage(result.question.id);
    return result;
  }

  // Get context for AI selection
  const [partnerContext, historicalContext] = await Promise.all([
    getPartnerContext(partnerId),
    getHistoricalContext(partnerId, categoryName)
  ]);

  // AI selection
  const result = await selectQuestionWithAI(
    questions,
    partnerContext,
    historicalContext,
    categoryName
  );

  await recordQuestionUsage(result.question.id);
  return result;
}

/**
 * Select questions for all three metrics of a template
 */
async function selectQuestionsForTemplate(partnerId, metrics, options = {}) {
  const selections = {};

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i];
    const categoryName = metric.category_name || mapMetricToCategory(metric.name);

    try {
      const selection = await selectQuestion(categoryName, partnerId, {
        ...options,
        forceQuestionId: metric.forced_question_id
      });

      selections[`metric_${i + 1}`] = {
        metric_name: metric.name,
        category: categoryName,
        ...selection
      };
    } catch (error) {
      console.error(`[QuestionSelector] Error selecting for ${metric.name}:`, error.message);
      selections[`metric_${i + 1}`] = {
        metric_name: metric.name,
        category: categoryName,
        question: null,
        selection_method: 'error',
        error: error.message
      };
    }
  }

  return selections;
}

/**
 * Map metric display names to category names
 */
function mapMetricToCategory(metricName) {
  const mapping = {
    'Closing Rate': 'closing_rate',
    'Cancellation Rates': 'cancellation_reduction',
    'Cancellation Reduction': 'cancellation_reduction',
    'Customer Experience': 'customer_experience',
    'Lead Quality': 'lead_quality',
    'Response Time': 'response_time',
    'ROI': 'roi_value',
    'ROI & Value': 'roi_value',
    'Communication': 'communication',
    'Professionalism': 'professionalism',
    'Technical Quality': 'technical_quality',
    'Business Growth': 'business_growth'
  };

  return mapping[metricName] || metricName.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Get all categories with their question counts
 */
async function getAllCategories() {
  const result = await query(`
    SELECT
      c.*,
      COUNT(q.id) as question_count,
      COUNT(CASE WHEN q.is_default THEN 1 END) as default_count
    FROM pcr_metric_categories c
    LEFT JOIN pcr_question_library q ON c.id = q.metric_category_id AND q.is_active = true
    GROUP BY c.id
    ORDER BY c.display_name
  `);

  return result.rows;
}

/**
 * Add a new question to the library
 */
async function addQuestion(categoryId, questionData, createdBy = 'admin') {
  const result = await query(`
    INSERT INTO pcr_question_library (
      metric_category_id,
      question_text,
      question_type,
      scale_low_label,
      scale_high_label,
      context_keywords,
      is_default,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    categoryId,
    questionData.question_text,
    questionData.question_type || 'satisfaction',
    questionData.scale_low_label || 'Poor',
    questionData.scale_high_label || 'Excellent',
    questionData.context_keywords || [],
    questionData.is_default || false,
    createdBy
  ]);

  return result.rows[0];
}

module.exports = {
  selectQuestion,
  selectQuestionsForTemplate,
  getQuestionsForCategory,
  getAllCategories,
  addQuestion,
  mapMetricToCategory
};
