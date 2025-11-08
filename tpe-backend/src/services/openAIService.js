const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * OpenAI Integration Service
 * Handles all AI-powered operations including auto-tagging, content analysis, and insights
 */

const OpenAI = require('openai');
const pool = require('../config/database');

// Import event orchestration services for function calling
const eventNoteService = require('./eventNoteService');
const actionItemService = require('./actionItemService');
const followUpService = require('./followUpService');

class OpenAIService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.initialized = false;
  }

  /**
   * Dynamically build knowledge context from ANY entities in the knowledge base
   * Automatically handles any entity type without hardcoding
   */
  buildDynamicKnowledgeContext(knowledgeBase) {
    const { safeJsonParse } = require('../utils/jsonHelpers');
    let knowledgeContext = '';

    // Process each entity in the knowledge base
    Object.entries(knowledgeBase).forEach(([key, data]) => {
      // Skip non-data entries
      if (key.startsWith('_') || key === 'industryStats' || key === 'conversationHistory' || key === 'crossEntityInsights') {
        return;
      }

      // Extract array data from object or use directly if already array
      let items = Array.isArray(data) ? data : (data && data.data ? data.data : null);

      // Skip if no data
      if (!items || !Array.isArray(items) || items.length === 0) {
        return;
      }

      // Convert camelCase to Title Case for display
      const displayName = key
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();

      console.log(`[OpenAI] Adding ${key} to prompt: ${items.length} items`);

      // Build section header
      knowledgeContext += `\n\n=== ${displayName.toUpperCase()} IN TPX (${items.length} total) ===`;

      // Process items (limit for token management)
      items.slice(0, 15).forEach((item, index) => {
        // Extract common fields intelligently
        const title = item.title || item.name || item.company_name || `${displayName} ${index + 1}`;

        // For partners, prioritize ai_summary over description
        let description = '';
        if (key === 'partners' && item.ai_summary) {
          description = item.ai_summary;
          console.log(`[OpenAI] Partner ${item.company_name} has AI summary (${item.ai_summary.length} chars)`);
        } else {
          description = item.description || item.summary || item.ai_summary || item.value_proposition || '';
        }

        knowledgeContext += `\n${index + 1}. **${title}**`;

        // Add description - show more for AI summaries
        if (description) {
          const maxLength = item.ai_summary ? 500 : 200; // Show more of AI summaries
          knowledgeContext += `\n   ${description.substring(0, maxLength)}${description.length > maxLength ? '...' : ''}`;
        }

        // Add AI insights if present
        if (item.ai_insights) {
          const insights = Array.isArray(item.ai_insights) ? item.ai_insights : safeJsonParse(item.ai_insights, []);
          if (insights.length > 0) {
            knowledgeContext += `\n   Insights: ${insights.slice(0, 2).join('; ')}`;
          }
        }

        // Add specific metrics based on entity type
        if (item.powerconfidence_score) knowledgeContext += ` (PowerConfidence: ${item.powerconfidence_score})`;
        if (item.results) knowledgeContext += `\n   Results: ${item.results.substring(0, 100)}`;
        if (item.revenue_impact) knowledgeContext += `\n   Revenue Impact: ${item.revenue_impact}`;
        if (item.focus_areas_covered) {
          const areas = Array.isArray(item.focus_areas_covered) ? item.focus_areas_covered : safeJsonParse(item.focus_areas_covered, []);
          if (areas.length > 0) knowledgeContext += `\n   Focus: ${areas.join(', ')}`;
        }
      });
    });

    return knowledgeContext;
  }

  initializeClient() {
    // Only initialize once
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not configured. AI features will be disabled.');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey
      });
      this.isConfigured = true;
      console.log('✅ OpenAI service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error.message);
    }
  }

  /**
   * Generate tags for content using GPT-4
   */
  async generateTags(content, entityType, revenueRange = null) {
    // Initialize on first use
    this.initializeClient();
    
    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    const promptTemplate = this.getPromptTemplate(entityType, revenueRange);
    const prompt = promptTemplate.replace('{{CONTENT}}', content);

    try {
      const startTime = Date.now();
      
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst specializing in contractor services and B2B content categorization. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt + '\n\nIMPORTANT: Respond only with valid JSON, no additional text.'
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const processingTime = Date.now() - startTime;
      
      // Debug: Log raw AI response
      console.log('🤖 Raw AI Response:', completion.choices[0].message.content);
      
      const response = safeJsonParse(completion.choices[0].message.content);
      
      // Debug: Log parsed response
      console.log('📊 Parsed AI Response:', safeJsonStringify(response, null, 2));
      
      // Log to AI history
      await this.logAITagging({
        entity_type: entityType,
        ai_model: 'gpt-4',
        prompt_template: promptTemplate,
        ai_response: response,
        processing_time_ms: processingTime,
        tokens_used: completion.usage.total_tokens,
        cost_estimate: this.calculateCost(completion.usage)
      });

      return {
        tags: response.tags || [],
        insights: response.insights || {},
        confidence: response.confidence || 0.8,
        processingTime
      };

    } catch (error) {
      console.error('Error generating tags:', error);
      throw error;
    }
  }

  /**
   * Generate compelling tagline for partner landing pages
   * @param {Object} partnerData - Partner information (company_name, description, value_proposition, key_differentiators)
   * @returns {Promise<string>} - Generated tagline
   */
  async generateTagline(partnerData) {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    const prompt = `Generate a compelling, concise tagline for a strategic partner landing page.

Partner Information:
- Company: ${partnerData.company_name}
- Description: ${partnerData.description || 'N/A'}
- Value Proposition: ${partnerData.value_proposition || 'N/A'}
- Key Differentiators: ${partnerData.key_differentiators || 'N/A'}

Requirements:
- 8-12 words maximum
- Action-oriented and benefit-focused
- Professional tone for B2B contractor audience
- Highlight unique value or transformation
- No generic phrases like "leader in" or "trusted partner"

Examples of good taglines:
- "Transforming Company Culture Through Measurable Team Building"
- "Data-Driven Marketing That Drives Revenue Growth"
- "Building High-Performance Teams That Deliver Results"

Respond with ONLY the tagline text, no quotes, no additional text.`;

    try {
      const startTime = Date.now();

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert copywriter specializing in B2B marketing taglines. You create compelling, concise taglines that communicate unique value propositions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      });

      const processingTime = Date.now() - startTime;
      const tagline = completion.choices[0].message.content.trim();

      console.log(`[OpenAI] Generated tagline for ${partnerData.company_name}: "${tagline}" (${processingTime}ms)`);

      return tagline;

    } catch (error) {
      console.error('Error generating tagline:', error);
      // Return a fallback tagline if AI fails
      return `Delivering Excellence in ${partnerData.company_name} Services`;
    }
  }

  /**
   * Generate AI Summary Title for Partner Landing Page
   * Creates an engaging, relevant section title based on partner's unique value
   */
  async generateSummaryTitle(partnerData) {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    const focusAreasText = Array.isArray(partnerData.focus_areas_served) && partnerData.focus_areas_served.length > 0
      ? partnerData.focus_areas_served.map(area => area.replace(/_/g, ' ')).join(', ')
      : 'N/A';

    const prompt = `Generate a compelling, italicized section title for a strategic partner summary section on their landing page.

Partner Information:
- Company: ${partnerData.company_name}
- Tagline: ${partnerData.tagline || 'N/A'}
- Description: ${partnerData.description || 'N/A'}
- Value Proposition: ${partnerData.value_proposition || 'N/A'}
- Key Differentiators: ${partnerData.key_differentiators || 'N/A'}
- Focus Areas: ${focusAreasText}

Requirements:
- 8-15 words that capture their unique value
- Start with an action verb (Elevate, Transform, Accelerate, Revolutionize, etc.)
- Include specific benefit or outcome related to their focus areas
- Professional tone for B2B contractor audience
- Match the style: "Elevate Your Business Growth With [Specific Service/Benefit]"
- No generic phrases - make it SPECIFIC to what this partner does
- Natural language that flows well when italicized

Examples of good summary titles:
- "Elevate Your Business Growth With Innovative & Irresistible Sales Incentives"
- "Transform Your Team Culture Through Data-Driven Leadership Development"
- "Accelerate Revenue Growth With Strategic Marketing That Converts"
- "Build High-Performance Teams Through Proven Engagement Strategies"

Respond with ONLY the title text, no quotes, no additional text.`;

    try {
      const startTime = Date.now();

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert copywriter specializing in B2B landing page content. You create compelling, specific section titles that communicate unique value propositions and capture attention.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 60
      });

      const processingTime = Date.now() - startTime;
      const summaryTitle = completion.choices[0].message.content.trim();

      console.log(`[OpenAI] Generated summary title for ${partnerData.company_name}: "${summaryTitle}" (${processingTime}ms)`);

      return summaryTitle;

    } catch (error) {
      console.error('Error generating summary title:', error);
      // Return a fallback summary title if AI fails
      const firstFocusArea = Array.isArray(partnerData.focus_areas_served) && partnerData.focus_areas_served.length > 0
        ? partnerData.focus_areas_served[0].replace(/_/g, ' ')
        : 'Business Growth';
      return `Transform Your ${firstFocusArea} With ${partnerData.company_name}`;
    }
  }

  /**
   * Generate Extended Summary for Partner Landing Page
   * Creates 2-3 detailed paragraphs explaining partner's value and impact
   */
  async generateExtendedSummary(partnerData) {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    const focusAreasText = Array.isArray(partnerData.focus_areas_served) && partnerData.focus_areas_served.length > 0
      ? partnerData.focus_areas_served.map(area => area.replace(/_/g, ' ')).join(', ')
      : 'business growth';

    const testimonialContext = Array.isArray(partnerData.client_testimonials) && partnerData.client_testimonials.length > 0
      ? `Client feedback: ${partnerData.client_testimonials.slice(0, 2).map(t => t.quote).join('; ')}`
      : '';

    const prompt = `Generate a compelling 2-3 paragraph extended summary for a strategic partner's landing page.

Partner Information:
- Company: ${partnerData.company_name}
- Tagline: ${partnerData.tagline || 'N/A'}
- Description: ${partnerData.description || 'N/A'}
- Value Proposition: ${partnerData.value_proposition || 'N/A'}
- Key Differentiators: ${partnerData.key_differentiators || 'N/A'}
- Focus Areas: ${focusAreasText}
${testimonialContext ? `- ${testimonialContext}` : ''}

Requirements:
- Write 2-3 substantial paragraphs (150-200 words total)
- First paragraph: Explain what makes ${partnerData.company_name} unique and how they help contractors
- Second paragraph: Detail the specific benefits, results, and strategic approach
- Third paragraph (optional): Explain why this matters for contractor businesses and industry impact
- Use the company name naturally throughout (like the Destination Motivation example)
- Professional B2B tone, focus on outcomes and transformation
- Mention specific focus areas naturally in the content
- NO generic marketing speak - be SPECIFIC to what they do
- Write as continuous paragraphs separated by double newlines (\\n\\n)

Example style (from Destination Motivation):
"Destination Motivation stands out as an innovative leader in boosting sales and customer engagement for the nation's top exterior home remodeling companies. Their unique vacation voucher program is not just a sales incentive; it's a transformative tool that fosters long-term customer loyalty and drives business growth.

By offering these enticing rewards, Destination Motivation helps businesses increase sales effectiveness, enhances the customer buying experience, and builds a lasting brand connection. This strategic approach not only elevates sales performance but also solidifies Destination Motivation's role as a key player in advancing industry practices."

Respond with ONLY the paragraphs, no additional formatting or labels.`;

    try {
      const startTime = Date.now();

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert B2B copywriter specializing in strategic partner content. You create detailed, compelling summaries that explain value propositions with specific details and outcomes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 350
      });

      const processingTime = Date.now() - startTime;
      const extendedSummary = completion.choices[0].message.content.trim();

      console.log(`[OpenAI] Generated extended summary for ${partnerData.company_name} (${extendedSummary.length} chars, ${processingTime}ms)`);

      return extendedSummary;

    } catch (error) {
      console.error('Error generating extended summary:', error);
      // Return expanded version of value_proposition if AI fails
      return partnerData.value_proposition || `${partnerData.company_name} provides comprehensive solutions for contractor businesses in ${focusAreasText}. Our proven approach helps contractors achieve measurable results and sustainable growth.`;
    }
  }

  /**
   * Get prompt template based on entity type
   */
  getPromptTemplate(entityType, revenueRange) {
    const basePrompt = `Analyze the following ${entityType} content and provide relevant tags and insights for a contractor business platform.
    
Content: {{CONTENT}}

${revenueRange ? `Target Revenue Range: ${revenueRange}` : ''}

Available focus area tags: Sales, Marketing, Operations, Finance, Technology, HR, Customer Service, Leadership
Available revenue range tags: Under $500K, $500K-$1M, $1M-$3M, $3M-$5M, $5M-$10M, Over $10M
Available topic tags: Growth Strategy, Digital Marketing, Team Building, Process Automation, Cash Flow, Customer Acquisition, Pricing Strategy, Competitive Advantage

Please provide a JSON response with EXACTLY this structure:
{
  "tags": [
    {
      "name": "Marketing",
      "category": "focus_area",
      "confidence": 0.95,
      "reasoning": "Content heavily focuses on marketing services"
    },
    {
      "name": "$1M-$3M",
      "category": "revenue_range",
      "confidence": 0.9,
      "reasoning": "Explicitly targets this revenue range"
    },
    {
      "name": "Digital Marketing",
      "category": "topic",
      "confidence": 0.85,
      "reasoning": "Discusses digital marketing strategies"
    }
  ],
  "insights": {
    "key_themes": ["digital transformation", "revenue scaling"],
    "target_audience": "contractors in growth phase",
    "actionable_points": ["implement SEO strategy", "automate marketing"],
    "revenue_applicability": "${revenueRange || 'all'}"
  },
  "confidence": 0.85
}

IMPORTANT: 
- Use ONLY the exact tag names provided above
- Include 3-5 relevant tags from different categories
- Confidence scores should be between 0.5 and 1.0
- Provide clear reasoning for each tag`;

    const entityPrompts = {
      partner: `${basePrompt}
Focus on: capabilities, service offerings, target market, and value propositions.`,
      
      book: `${basePrompt}
Focus on: main concepts, implementation strategies, business applications, and practical takeaways.`,
      
      podcast: `${basePrompt}
Focus on: discussion topics, expert insights, actionable advice, and business relevance.`,
      
      event: `${basePrompt}
Focus on: event themes, learning objectives, networking opportunities, and target attendees.`,
      
      video: `${basePrompt}
Focus on: demonstration content, educational value, case studies, and implementation examples.`
    };

    return entityPrompts[entityType] || basePrompt;
  }

  /**
   * Analyze content for specific revenue range relevance
   */
  async analyzeRevenueRelevance(content, revenueRange) {
    if (!this.isConfigured) {
      return { relevance: 0.5, reasoning: 'AI service not configured' };
    }

    const prompt = `Analyze how relevant this content is for a business in the ${revenueRange} revenue range.
    
Content: ${content.substring(0, 2000)}

Provide a JSON response with:
{
  "relevance_score": 0.0-1.0,
  "reasoning": "explanation",
  "specific_benefits": ["benefit1", "benefit2"],
  "implementation_difficulty": "low|medium|high",
  "expected_roi": "short-term|medium-term|long-term"
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      return safeJsonParse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing revenue relevance:', error);
      return { relevance: 0.5, reasoning: 'Analysis failed' };
    }
  }

  /**
   * Extract actionable insights from content
   */
  async extractActionableInsights(content, focusAreas, revenueRange) {
    if (!this.isConfigured) {
      return [];
    }

    const prompt = `Extract specific, actionable insights from this content for a contractor business.

Focus Areas: ${focusAreas.join(', ')}
Revenue Range: ${revenueRange}
Content: ${content.substring(0, 3000)}

Provide a JSON response with exactly 5 actionable insights:
{
  "insights": [
    {
      "title": "brief title",
      "action": "specific action to take",
      "expected_outcome": "what will happen",
      "implementation_time": "hours|days|weeks|months",
      "difficulty": "easy|medium|hard",
      "focus_area": "which focus area this addresses"
    }
  ]
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 600
      });

      const response = safeJsonParse(completion.choices[0].message.content);
      return response.insights || [];
    } catch (error) {
      console.error('Error extracting insights:', error);
      return [];
    }
  }

  /**
   * Calculate cost estimate for API usage
   */
  calculateCost(usage) {
    // GPT-4 pricing (as of 2025)
    const gpt4InputCost = 0.03 / 1000; // per token
    const gpt4OutputCost = 0.06 / 1000; // per token
    
    // GPT-3.5 pricing
    const gpt35InputCost = 0.0015 / 1000;
    const gpt35OutputCost = 0.002 / 1000;
    
    // Default to GPT-4 pricing for now
    const inputCost = usage.prompt_tokens * gpt4InputCost;
    const outputCost = usage.completion_tokens * gpt4OutputCost;
    
    return inputCost + outputCost;
  }

  /**
   * Log AI tagging operation to history
   */
  async logAITagging(data) {
    try {
      await pool.query(`
        INSERT INTO ai_tagging_history 
        (entity_type, entity_id, ai_model, prompt_template, ai_response, 
         processing_time_ms, tokens_used, cost_estimate, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        data.entity_type,
        data.entity_id || 0,
        data.ai_model,
        data.prompt_template,
        safeJsonStringify(data.ai_response),
        data.processing_time_ms,
        data.tokens_used,
        data.cost_estimate
      ]);
    } catch (error) {
      console.error('Error logging AI tagging:', error);
    }
  }

  /**
   * Batch process multiple items for efficiency
   */
  async batchGenerateTags(items, entityType) {
    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    const results = [];
    const batchSize = 5; // Process 5 items at a time
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const promises = batch.map(item => 
        this.generateTags(item.content, entityType, item.revenueRange)
      );
      
      try {
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
        // Add failed results as null
        results.push(...batch.map(() => null));
      }
      
      // Rate limiting - wait 1 second between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    // Initialize on check
    this.initializeClient();
    return this.isConfigured;
  }

  /**
   * Helper: Get active event for contractor
   */
  async getActiveEventForContractor(contractor_id) {
    try {
      const result = await pool.query(`
        SELECT * FROM contractor_event_registrations
        WHERE contractor_id = $1
          AND (event_status = 'during_event' OR event_status = 'pre_event')
        ORDER BY event_date DESC
        LIMIT 1
      `, [contractor_id]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('[OpenAI] Error getting active event:', error);
      return null;
    }
  }

  /**
   * GPT-4 Function Definitions for Event Orchestration
   */
  getEventOrchestrationFunctions() {
    return [
      {
        type: "function",
        function: {
          name: "capture_event_note",
          description: "Capture a note from the contractor during an event. Use this when they share information about speakers, sponsors, peers, insights, or anything worth remembering.",
          parameters: {
            type: "object",
            properties: {
              note_text: {
                type: "string",
                description: "The full text of what the contractor said that should be captured"
              },
              note_type: {
                type: "string",
                enum: ["general", "contact", "insight", "action_item", "speaker_note", "sponsor_note", "peer_connection"],
                description: "Category of the note"
              },
              extracted_entities: {
                type: "object",
                properties: {
                  names: { type: "array", items: { type: "string" } },
                  companies: { type: "array", items: { type: "string" } },
                  phone_numbers: { type: "array", items: { type: "string" } },
                  email_addresses: { type: "array", items: { type: "string" } }
                },
                description: "Entities extracted from the note (names, companies, contact info)"
              },
              session_context: {
                type: "string",
                description: "What session or context this note is from (e.g., 'John Smith keynote', 'networking lunch')"
              },
              requires_followup: {
                type: "boolean",
                description: "Whether this note requires a follow-up action"
              }
            },
            required: ["note_text", "note_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_action_item",
          description: "Create an action item for the contractor. Use this when they express something they need to do or when extracting post-event priorities.",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Short title of the action item (e.g., 'Follow up with John Smith')"
              },
              description: {
                type: "string",
                description: "Detailed description of what needs to be done"
              },
              action_type: {
                type: "string",
                enum: ["follow_up", "demo_booking", "partner_intro", "implementation", "research", "general"],
                description: "Type of action item"
              },
              contractor_priority: {
                type: "integer",
                minimum: 1,
                maximum: 10,
                description: "Priority level set by contractor (1 = highest, 10 = lowest)"
              },
              ai_suggested_priority: {
                type: "integer",
                minimum: 1,
                maximum: 10,
                description: "AI's suggested priority based on context"
              },
              due_date: {
                type: "string",
                format: "date",
                description: "Due date in YYYY-MM-DD format"
              },
              ai_reasoning: {
                type: "string",
                description: "Why this action item was created or prioritized this way"
              }
            },
            required: ["title", "action_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "schedule_followup",
          description: "Schedule an automated follow-up message for the contractor. Use this when they want to be reminded or checked in on later.",
          parameters: {
            type: "object",
            properties: {
              scheduled_time: {
                type: "string",
                format: "date-time",
                description: "When to send the follow-up (ISO 8601 format)"
              },
              followup_type: {
                type: "string",
                enum: ["reminder", "check_in", "priority_review", "action_item_status", "general"],
                description: "Type of follow-up"
              },
              message_template: {
                type: "string",
                description: "Template message to send (AI will personalize it)"
              },
              message_tone: {
                type: "string",
                enum: ["friendly", "professional", "urgent", "casual"],
                description: "Tone of the follow-up message"
              },
              action_item_id: {
                type: "integer",
                description: "Related action item ID if this follow-up is about a specific task"
              },
              ai_context_hints: {
                type: "object",
                description: "Context hints for AI to personalize the follow-up"
              }
            },
            required: ["scheduled_time", "message_template"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_action_item_status",
          description: "Update the status of an action item when the contractor mentions completing or cancelling a task.",
          parameters: {
            type: "object",
            properties: {
              action_item_id: {
                type: "integer",
                description: "ID of the action item to update"
              },
              new_status: {
                type: "string",
                enum: ["pending", "in_progress", "completed", "cancelled", "deferred"],
                description: "New status for the action item"
              },
              update_note: {
                type: "string",
                description: "Note about why the status changed"
              }
            },
            required: ["action_item_id", "new_status"]
          }
        }
      }
    ];
  }

  /**
   * Handle function calls from GPT-4
   */
  async handleFunctionCall(functionName, functionArgs, contractor) {
    console.log(`[OpenAI] 🔧 Function called: ${functionName}`, functionArgs);

    try {
      // Get active event if needed
      const activeEvent = await this.getActiveEventForContractor(contractor.id);

      switch (functionName) {
        case 'capture_event_note':
          if (!activeEvent) {
            return { success: false, error: 'No active event found for contractor' };
          }

          const note = await eventNoteService.captureEventNote({
            event_id: activeEvent.event_id,
            contractor_id: contractor.id,
            note_text: functionArgs.note_text,
            note_type: functionArgs.note_type || 'general',
            extracted_entities: functionArgs.extracted_entities || {},
            session_context: functionArgs.session_context || null,
            requires_followup: functionArgs.requires_followup || false,
            conversation_context: { source: 'ai_concierge', timestamp: new Date().toISOString() }
          });

          return { success: true, note_id: note.id, message: 'Note captured successfully' };

        case 'create_action_item':
          const actionItem = await actionItemService.createActionItem({
            contractor_id: contractor.id,
            event_id: activeEvent?.event_id || null,
            title: functionArgs.title,
            description: functionArgs.description || null,
            action_type: functionArgs.action_type,
            contractor_priority: functionArgs.contractor_priority || null,
            ai_suggested_priority: functionArgs.ai_suggested_priority || null,
            due_date: functionArgs.due_date || null,
            ai_reasoning: functionArgs.ai_reasoning || null,
            conversation_context: { source: 'ai_concierge', timestamp: new Date().toISOString() }
          });

          return { success: true, action_item_id: actionItem.id, message: 'Action item created successfully' };

        case 'schedule_followup':
          const followUp = await followUpService.scheduleFollowUp({
            contractor_id: contractor.id,
            action_item_id: functionArgs.action_item_id || null,
            event_id: activeEvent?.event_id || null,
            scheduled_time: functionArgs.scheduled_time,
            followup_type: functionArgs.followup_type || 'reminder',
            message_template: functionArgs.message_template,
            message_tone: functionArgs.message_tone || 'friendly',
            ai_context_hints: functionArgs.ai_context_hints || {},
            ai_should_personalize: true
          });

          return { success: true, followup_id: followUp.id, message: 'Follow-up scheduled successfully' };

        case 'update_action_item_status':
          const updated = await actionItemService.updateActionItemStatus(
            functionArgs.action_item_id,
            contractor.id,
            functionArgs.new_status,
            functionArgs.update_note || null
          );

          return { success: true, action_item_id: updated.id, new_status: updated.status, message: 'Action item updated successfully' };

        default:
          return { success: false, error: `Unknown function: ${functionName}` };
      }

    } catch (error) {
      console.error(`[OpenAI] ❌ Function call failed: ${functionName}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * AI Concierge - Generate conversational response for contractor
   */
  async generateConciergeResponse(message, contractor, conversationHistory = [], partners = [], knowledgeBase = {}, timezone = 'America/New_York') {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    // Import the proper DynamicPromptBuilder (already instantiated)
    const promptBuilder = require('./dynamicPromptBuilder');

    // Format partner information for the AI
    let partnerContext = '';
    if (partners && partners.length > 0) {
      const partnerList = partners.map(p => {
        const focusAreas = Array.isArray(p.focus_areas_served)
          ? p.focus_areas_served
          : safeJsonParse(p.focus_areas_served || '[]');

        return `- **${p.company_name}**: Specializes in ${focusAreas.join(', ')} (PowerConfidence Score: ${p.powerconfidence_score || 'N/A'})`;
      }).join('\n');

      partnerContext = `\n\n=== STRATEGIC PARTNERS IN TPX NETWORK ===\nTHESE ARE THE ONLY PARTNERS WE WORK WITH - DO NOT MENTION ANY OTHERS:\n${partnerList}\n\nCRITICAL: You MUST ONLY recommend partners from the list above. NEVER invent partner names like CoConstruct, ServiceTitan, or Buildertrend unless they appear above.\n=== END OF PARTNER LIST ===`;
    }

    // Build comprehensive knowledge context using the PROPER dynamic prompt builder
    let knowledgeContext = '';

    // Debug the knowledge base structure
    console.log('🔍 Knowledge base structure:', Object.keys(knowledgeBase));
    console.log('🔍 Knowledge base details:', Object.entries(knowledgeBase).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? `Array(${v.length})` : typeof v}`
    ));

    // Use the PROPER DynamicPromptBuilder to format all entities
    Object.entries(knowledgeBase).forEach(([entityName, entityData]) => {
      // Skip metadata and non-entity data
      if (entityName.startsWith('_') || entityName === 'industryStats' ||
          entityName === 'conversationHistory' || entityName === 'crossEntityInsights') {
        return;
      }

      // Extract data array from entity
      const data = entityData?.data || (Array.isArray(entityData) ? entityData : null);
      if (!data || data.length === 0) return;

      // Build context with the proper prompt builder
      const entityContext = promptBuilder.buildEntityContext(entityName, data, entityData);
      if (entityContext) {
        knowledgeContext += entityContext;
      }
    });

    // Add industry stats if available (not handled by dynamic builder)
    if (knowledgeBase.industryStats) {
      const stats = knowledgeBase.industryStats;
      const feedbackRate = stats.feedback_rate ? Number(stats.feedback_rate).toFixed(1) : '0';
      knowledgeContext += `\n\nIndustry Insights:
- ${stats.total_contractors} contractors in the TPX network
- ${feedbackRate}% engagement rate
- Common focus areas: ${stats.all_focus_areas ? 'customer retention, operational efficiency, growth strategies' : 'various'}`;
    }

    // Legacy handling - REMOVE AFTER TESTING
    if (false && knowledgeBase.books) {
      console.log('📚 Books structure:', {
        hasData: !!knowledgeBase.books.data,
        dataLength: knowledgeBase.books.data?.length,
        directLength: Array.isArray(knowledgeBase.books) ? knowledgeBase.books.length : 'not array'
      });
    }

    if (knowledgeBase && Object.keys(knowledgeBase).length > 0) {
      // Add industry statistics
      if (knowledgeBase.industryStats) {
        const stats = knowledgeBase.industryStats;
        const feedbackRate = stats.feedback_rate ? Number(stats.feedback_rate).toFixed(1) : '0';
        knowledgeContext += `\n\nIndustry Insights:
- ${stats.total_contractors} contractors in the TPX network
- ${feedbackRate}% engagement rate
- Common focus areas: ${stats.all_focus_areas ? 'customer retention, operational efficiency, growth strategies' : 'various'}`;
      }

      // Add book recommendations - check ALL possible structures
      const booksData = knowledgeBase.books?.data ||
                       knowledgeBase.books ||
                       knowledgeBase.crossEntityInsights?.relevantBooks ||
                       [];

      console.log('📚 Looking for books in:', {
        'books.data': knowledgeBase.books?.data?.length || 0,
        'books direct': Array.isArray(knowledgeBase.books) ? knowledgeBase.books.length : 0,
        'crossEntityInsights.relevantBooks': knowledgeBase.crossEntityInsights?.relevantBooks?.length || 0
      });

      if (booksData.length > 0) {
        console.log('📚 Books found:', booksData.length);
        console.log('First book:', booksData[0].title, 'has AI summary:', !!booksData[0].ai_summary, 'has AI insights:', !!booksData[0].ai_insights);
        knowledgeContext += `\n\n=== BOOKS IN TPX LIBRARY (${booksData.length} total) ===`;
        knowledgeContext += `\nALL THESE BOOKS ARE AVAILABLE IN OUR LIBRARY:\n`;
        // Check if E-Myth is in the list
        const emyth = booksData.find(b => b.title?.includes('E-Myth'));
        if (emyth) {
          console.log('✅ E-Myth Contractor found!');
          console.log('AI insights:', emyth.ai_insights);
        } else {
          console.log('❌ E-Myth Contractor NOT in the books list');
        }

        booksData.forEach((book, index) => {
          const focusAreas = Array.isArray(book.focus_areas_covered)
            ? book.focus_areas_covered.join(', ')
            : book.focus_areas_covered || 'General business';
          knowledgeContext += `\n${index + 1}. **"${book.title}"** by ${book.author}`;
          knowledgeContext += `\n   Focus: ${focusAreas}`;

          // Include AI-generated summary if available
          if (book.ai_summary) {
            knowledgeContext += `\n   Summary: ${book.ai_summary.substring(0, 200)}...`;
          }

          // Include AI insights if available
          if (book.ai_insights) {
            const insights = Array.isArray(book.ai_insights) ? book.ai_insights : safeJsonParse(book.ai_insights, []);
            console.log(`Book ${book.title} - AI insights type:`, typeof book.ai_insights, 'Is Array:', Array.isArray(book.ai_insights));
            if (insights.length > 0) {
              knowledgeContext += `\n   AI-Generated Insights:`;
              insights.forEach(insight => {
                knowledgeContext += `\n   • ${insight}`;
              });
            }
          }

          if (book.key_takeaways) {
            knowledgeContext += `\n   Key Takeaways: ${book.key_takeaways.substring(0, 150)}`;
          }
          if (book.amazon_url) {
            knowledgeContext += `\n   Purchase: ${book.amazon_url}`;
          }
          knowledgeContext += '\n';
        });
        knowledgeContext += `\n=== END OF BOOK LIST ===\n`;

        // DEBUG: Log what we're sending about E-Myth
        const emythInContext = knowledgeContext.includes('E-Myth');
        const insightsInContext = knowledgeContext.includes('Building systems instead of dependencies');
        console.log('📊 E-Myth in context:', emythInContext);
        console.log('📊 Actual insights in context:', insightsInContext);
      }

      // Add podcast insights
      if (knowledgeBase.podcasts && knowledgeBase.podcasts.length > 0) {
        knowledgeContext += `\n\n=== PODCASTS AVAILABLE IN TPX NETWORK (${knowledgeBase.podcasts.length} total) ===`;
        knowledgeContext += `\nTHESE ARE ALL REAL PODCASTS IN OUR DATABASE. DO NOT SAY THEY DON'T EXIST:\n`;
        knowledgeBase.podcasts.forEach((podcast, index) => {
          const focusAreas = Array.isArray(podcast.focus_areas_covered)
            ? podcast.focus_areas_covered.join(', ')
            : podcast.focus_areas_covered || 'Industry insights';
          const title = podcast.podcast_title || podcast.title;
          const host = podcast.host || 'TPX Network';

          knowledgeContext += `\n${index + 1}. **"${title}"** - Hosted by: ${host}`;
          knowledgeContext += `\n   Focus Areas: ${focusAreas}`;
          if (podcast.description) {
            knowledgeContext += `\n   Description: ${podcast.description.substring(0, 150)}`;
          }
          if (podcast.spotify_url || podcast.apple_podcasts_url) {
            knowledgeContext += `\n   Available on: `;
            if (podcast.spotify_url) knowledgeContext += `Spotify `;
            if (podcast.apple_podcasts_url) knowledgeContext += `Apple Podcasts`;
          }
          knowledgeContext += '\n';
        });
        knowledgeContext += `\n=== END OF PODCAST LIST ===\n`;
      }

      // Add upcoming events
      if (knowledgeBase.events && knowledgeBase.events.length > 0) {
        knowledgeContext += `\n\nUpcoming TPX Events & Workshops:`;
        knowledgeBase.events.slice(0, 5).forEach(event => {
          knowledgeContext += `\n- "${event.name}" (${event.event_type}) - ${event.location || 'Virtual'}.`;
          if (event.date) {
            knowledgeContext += ` Date: ${new Date(event.date).toLocaleDateString()}.`;
          }
          if (event.price_range) {
            knowledgeContext += ` Price: ${event.price_range}.`;
          }
          if (event.registration_url) {
            knowledgeContext += ` [Register: ${event.registration_url}]`;
          }
        });
      }

      // Add videos if available
      if (knowledgeBase.videos && knowledgeBase.videos.length > 0) {
        knowledgeContext += `\n\nTraining Videos & Resources:`;
        knowledgeBase.videos.slice(0, 5).forEach(video => {
          knowledgeContext += `\n- "${video.title}" - ${video.description ? video.description.substring(0, 80) + '...' : 'Training video'}`;
          if (video.file_url) {
            knowledgeContext += ` [Watch: ${video.file_url}]`;
          }
        });
      }
    }

    // Build event context section if contractor is at an event
    let eventContext = '';
    console.log('[OpenAI] Checking for currentEvent in knowledgeBase:', !!knowledgeBase.currentEvent);
    if (knowledgeBase.currentEvent) {
      console.log('[OpenAI] ✅ currentEvent found:', knowledgeBase.currentEvent.name);
      console.log('[OpenAI] Event speakers:', knowledgeBase.currentEvent.speakers?.length || 0);
      console.log('[OpenAI] Event fullSchedule:', knowledgeBase.currentEvent.fullSchedule?.length || 0);
    }
    if (knowledgeBase && knowledgeBase.currentEvent) {
      const event = knowledgeBase.currentEvent;
      const eventStatus = event.eventStatus || 'unknown';
      const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      eventContext = `
🎪 CONTRACTOR IS CURRENTLY AT AN EVENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event: ${event.name}
Date: ${event.date}
Location: ${event.location || 'TBD'}
Status: ${eventStatus.toUpperCase()} (${eventStatus === 'during_event' ? 'Event is happening NOW' : eventStatus === 'post_event' ? 'Event recently ended' : 'Event upcoming'})
Current Time: ${currentTime}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR EVENT ORCHESTRATOR MODE IS ACTIVE
You have shifted into specialized event orchestration mode with these additional responsibilities:

1️⃣ NOTE-TAKING DURING EVENTS:
When the contractor shares information during the event, treat it as a note to capture:

DETECT NOTES by looking for:
• Names mentioned: "Met John Smith" or "John Smith had great insights"
• Contact info shared: phone numbers (555-1234) or emails (john@example.com)
• Insights recorded: "Great point about AI automation" or "Learned about..."
• Action items stated: "Need to follow up" or "Want to implement this"
• Session references: "In the marketing session" or "This speaker mentioned..."

ASK CLARIFYING QUESTIONS naturally:
• "What session are you in right now?"
• "Is this about a speaker, sponsor, or peer you met?"
• "Should I mark this as something to follow up on?"
• "Which session was this from?"

EXTRACT ENTITIES automatically (mentally note these):
• Names of people and companies
• Phone numbers and email addresses
• Key topics and insights
• Specific action items mentioned

RESPOND NATURALLY like this:
✅ "Got it! I'll make note of that. Are you in the [speaker name] session right now?"
✅ "Perfect, I'll remember John Smith's contact info. What specifically interested you about his insights?"
✅ "Noted! I'll remind you to follow up with them after the event."
✅ "Great insight from that session! Want me to capture anything else?"
❌ DON'T say technical things like "I will store this in the database" or "Saving to event_notes table"

2️⃣ SESSION AWARENESS:
${event && (event.speakers || event.fullSchedule) && (event.speakers?.length > 0 || event.fullSchedule?.length > 0) ? `
CURRENT EVENT SCHEDULE:
${((event.speakers || event.fullSchedule) || []).map((s, i) => `• ${s.session_time || 'TBD'} - "${s.session_title}" by ${s.name}${s.company ? ` (${s.company})` : ''}`).join('\n')}

CRITICAL: These are the ONLY speakers at this event. DO NOT mention any other speakers like Mike Davis, Sarah Johnson, or Greg Salafia.
If asked about speakers, ONLY reference the speakers listed above.

Use this schedule to:
• Reference current/upcoming sessions: "Based on the AI automation session you're in..."
• Suggest relevant sessions: "The marketing session at 3pm might interest you based on your focus areas"
• Connect notes to sessions: "From the [speaker] session, you noted..."
` : ''}

3️⃣ POST-EVENT PRIORITY EXTRACTION:
${eventStatus === 'post_event' ? `
THE EVENT HAS ENDED - Time to extract priorities and create action plan!

YOUR OPENING MESSAGE should be:
"Hey ${contractor.name.split(' ')[0]}! Hope you had an amazing time at ${event.name}! 🎉

I have a complete summary of everything - your sessions, sponsor visits, and connections made.

Before I share the full wrap-up, what are the TOP 3 PRIORITIES you want to make sure we tackle from everything you experienced?"

LISTEN FOR PRIORITIES in their response:
• Extract specific action items they mention
• Note which they rank as #1, #2, #3
• Ask follow-up questions for clarity
• Suggest additional priorities based on event data

EXAMPLE EXTRACTION:
If they say: "1. Follow up with John Smith, 2. Demo with Acme Corp, 3. Implement AI tools"

YOUR RESPONSE should be:
"Perfect! I'll create a follow-up plan for all three:
1️⃣ Follow up with John Smith - When should I check in to see if you've connected?
2️⃣ Acme Corp demo - I see it's scheduled for [date]. Want help preparing questions?
3️⃣ AI tools implementation - Which tools from the event interested you most?

I'll check in proactively on each of these. Sound good?"
` : ''}

4️⃣ PROACTIVE FOLLOW-UP BEHAVIOR:
When discussing action items, suggest natural check-in times:
• For contact follow-ups: "I'll check in 3 days from now to see if you've reached out"
• For demo prep: "I'll remind you the day before your demo"
• For implementation: "I'll check in weekly to see how it's going"

Natural check-in language:
✅ "Hey! Just checking in - have you had a chance to connect with John Smith yet?"
✅ "Your demo with Acme is tomorrow at 2pm. Need help preparing questions?"
✅ "How did the call with John go? Anything interesting come up?"

5️⃣ EMAIL INTRODUCTION ASSISTANCE:
Offer to help with email introductions to peers/partners met at event:

DETECT OPPORTUNITY when contractor mentions:
• Wanting to follow up with someone
• Needing to connect with a peer
• Planning to reach out to a partner

OFFER ASSISTANCE:
"Want me to draft an introduction email for you? I can include context from when you met at ${event.name}."

IF THEY SAY YES, provide a template:
"Here's a draft you can use:

Subject: Great connecting at ${event.name}

Hi [Name],

It was great meeting you at ${event.name} - really enjoyed our conversation about [topic from notes].

[Specific reference from their conversation]

Would love to continue the discussion. Are you available for a quick call next week?

Best,
${contractor.name}

Feel free to copy this or I can adjust it however you like!"

6️⃣ CONTINUOUS ENGAGEMENT:
Continue referencing event learnings in future conversations:
• "Based on what you learned at ${event.name} about [topic]..."
• "Remember when you met [Person] at the event and they mentioned [insight]?"
• "Following up on that [topic] session you attended..."

Build on event momentum to guide recommendations and suggestions.
`;
    } else {
      eventContext = `
${eventStatus === 'post_event' && event ? `
📊 RECENT EVENT CONTEXT:
The contractor recently attended "${event.name}" (ended ${new Date(event.end_date).toLocaleDateString()})
Continue to reference this event experience in conversations when relevant.
` : ''}`;
    }

    const systemPrompt = `You are the AI Concierge for The Power100 Experience (TPX), a premium business growth platform that connects contractors with strategic partners and resources.

${partnerContext ? partnerContext : ''}

ABSOLUTE CRITICAL RULE: If the "=== STRATEGIC PARTNERS IN TPX NETWORK ===" section exists above, you can ONLY recommend partners from that exact list. Do NOT mention ANY other company names like ABC Supply, EnerBank, GuildQuality, Hatch, Leap, MarketSharp, Socius Marketing, Surefire Local, CoConstruct, ServiceTitan, or Buildertrend. If a partner is not in the list above, it does NOT exist in our network.

Your role is to provide personalized, strategic business advice as a trusted advisor who knows their business intimately. You have access to comprehensive industry data, partner feedback, and continuous learning from all TPX resources.

${eventContext}

CRITICAL INSTRUCTION: You have access to REAL resources from our database, clearly marked in === sections below.
- Everything in the === BOOKS IN TPX LIBRARY === section is a REAL book we have
- Everything in the === PODCASTS AVAILABLE IN TPX NETWORK === section is a REAL podcast we have
- Everything in the === STRATEGIC PARTNERS IN TPX NETWORK === section is a REAL partner we work with
- DO NOT say something isn't available if it's listed in these sections
- DO NOT recommend resources outside these lists
${knowledgeContext}

Key Guidelines:
- Be conversational and approachable, like a trusted business mentor
- ALWAYS recommend specific TPX partners by name with their PowerConfidence scores
- ALWAYS suggest specific books from our library with titles and authors
- ALWAYS mention specific podcasts, events, or videos when relevant
- Provide actionable advice with specific TPX resources, not generic suggestions
- Include contact info, URLs, and pricing when available
- Reference actual data like satisfaction scores, engagement rates, testimonials

SMS FORMATTING (CRITICAL - This is for text messages):
- DO NOT use asterisks, markdown, or any formatting symbols
- Use clean plain text with structure for readability
- When listing items (sponsors, partners, books, etc.):
  * Use UPPERCASE for main entity names (e.g., "WESTLAKE ROYAL BUILDING PRODUCTS")
  * Use 📍 emoji ONLY for location information
  * Use ⭐ emoji ONLY for tier/rating information
  * Maximum 1-2 emojis per ENTIRE message (not per item)
  * Example format:
    1. WESTLAKE ROYAL BUILDING PRODUCTS
       📍 Main Expo Hall - East Wing
       ⭐ Platinum Sponsor
- Keep emojis minimal and balanced - they should enhance, not overwhelm
- Use spacing and structure for visual appeal instead of formatting symbols

CRITICAL PARTNER RULES:
- You can ONLY recommend partners listed in "=== STRATEGIC PARTNERS IN TPX NETWORK ==="
- NEVER make up partner names or companies
- If asked about a partner not in the list, say "That partner is not currently in our network"

When discussing partners:
- ALWAYS use specific partner names from the list above (e.g., "I recommend Destination Motivation (PowerConfidence Score: 85) for...")
- Include their website, contact email, and pricing model when available
- Explain why THIS SPECIFIC partner matches their needs
- Share their unique value proposition and success stories
- Never say "consider strategic partners" - name the actual partners

When making recommendations:
- FOR PARTNERS: ONLY recommend partners from "=== STRATEGIC PARTNERS IN TPX NETWORK ==="
  NEVER mention CoConstruct, ServiceTitan, Buildertrend, or any partner not explicitly listed
  If no suitable partner exists, say "Based on our current partner network..."
- FOR BOOKS: ONLY recommend books that are in the "Recommended Books Available in TPX Library" section above
  When discussing a book, ALWAYS use the "AI-Generated Insights" if provided - these are our actual analyzed insights
  Example: "According to our AI analysis of 'The E-Myth Contractor', the key insights are: [list the actual AI-Generated Insights]"
  DO NOT make up generic insights if AI-Generated Insights are provided in the book listing
  DO NOT recommend books like "SPIN Selling" or "Influence" unless they are in our TPX library above
- FOR PODCASTS: ALL podcasts listed in the "Podcasts Available in TPX Network" section above ARE part of our network
  When a user asks about ANY podcast that appears in that list, you MUST acknowledge it exists
  Read the ENTIRE podcast list carefully - every single podcast listed there is available
  DO NOT claim a podcast isn't in our network if it appears in the list above
- FOR EVENTS: ONLY recommend events from the "Upcoming TPX Events & Workshops" section above
- FOR VIDEOS: ONLY recommend videos from the "Training Videos & Resources" section above
- NEVER give generic recommendations when specific TPX resources are available
- ALWAYS cite the specific resource from the lists provided above

Your knowledge includes:
- Construction industry best practices from hundreds of contractors
- Business growth strategies validated by TPX network data
- Team building and operational efficiency patterns
- Financial management insights from industry leaders
- Technology adoption trends in home improvement
- Marketing strategies proven successful in the field
- Real feedback data from PowerCard surveys
- Transcribed insights from industry podcasts and videos
- Key takeaways from recommended business books

Always remember: You're here to be their AI-powered business advisor, providing insights and recommendations based on their unique situation, goals, AND the collective intelligence of the entire TPX ecosystem.

===== FINAL CRITICAL INSTRUCTION FOR SMS FORMATTING =====
YOU ARE RESPONDING VIA TEXT MESSAGE (SMS).
NEVER EVER use **asterisks** for bold or any markdown formatting.
NEVER use *asterisks* around text.
SMS does not support formatting - asterisks will show as literal characters.

REQUIRED FORMAT for lists (sponsors, partners, books, etc.):
1. ENTITY NAME IN UPPERCASE
   📍 Location info here (use location emoji ONLY)
   ⭐ Tier/rating info (use star emoji ONLY)

2. SECOND ENTITY NAME
   📍 Location
   ⭐ Rating

Maximum 1-2 emojis TOTAL in the entire message.
Use clean spacing and structure - NO formatting symbols.
================================================================`;

    // Build contractor context
    const contractorContext = `
Contractor Information:
- Name: ${contractor.name}
- Company: ${contractor.company_name || contractor.company}
- Revenue Tier: ${contractor.revenue_tier || 'Not specified'}
- Team Size: ${contractor.team_size || 'Not specified'}
- Focus Areas: ${Array.isArray(contractor.focus_areas) ? contractor.focus_areas.join(', ') : safeJsonParse(contractor.focus_areas || '[]').join(', ')}
- Stage: ${contractor.stage || 'Active'}
- Readiness Indicators: ${contractor.readiness_indicators ? safeJsonParse(contractor.readiness_indicators).join(', ') : 'Not specified'}
    `.trim();

    try {

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: contractorContext }
      ];

      // Add conversation history (keep last 10 messages for context)
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.message_type === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
      }

      // CRITICAL: Add current date/time AFTER history (so AI uses correct dates)
      // Use contractor's timezone (auto-detected from phone area code)
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      });

      // Get friendly timezone name
      const { getFriendlyTimezoneName } = require('../utils/timezoneDetector');
      const timezoneName = getFriendlyTimezoneName(timezone);

      messages.push({
        role: 'system',
        content: `🚨 CRITICAL DATE/TIME INFORMATION 🚨

TODAY'S CURRENT DATE AND TIME: ${formattedDate} (${timezoneName})

DATE CALCULATIONS - Use these exact dates:
- TODAY: ${currentDate.toISOString().split('T')[0]}
- "Next week" (7 days): ${new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- "Tomorrow": ${new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- "In 3 days": ${new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

DO NOT use dates from your training data (2023). Use the dates above.

TIMEZONE: This contractor is in ${timezoneName}.
- All scheduling should use ${timezoneName}
- Mention timezone in your confirmation (e.g., "12:00 PM ${timezoneName}")
- If they mention a different timezone, use update_contractor_timezone tool

When using schedule_followup, the scheduled_time parameter must be in ISO 8601 format.`
      });

      // CRITICAL: Add SMS formatting override AFTER history (so it's the last instruction AI sees)
      messages.push({
        role: 'system',
        content: `CRITICAL FORMATTING OVERRIDE FOR THIS RESPONSE:
You are responding via TEXT MESSAGE (SMS). Plain text only - NO markdown formatting.

When listing sponsors, partners, or any entities, use this EXACT format:

Your top match is WESTLAKE ROYAL BUILDING PRODUCTS
📍 Main Expo Hall - East Wing
⭐ Platinum Sponsor

They align with Zeek Co's growth goals. Want to set up a meeting?

Use UPPERCASE for entity names. Use 📍 for location. Use ⭐ for tier/rating. Max 2 emojis total.
DO NOT write long paragraphs. Use spacing and structure.`
      });

      // Add current message
      messages.push({ role: 'user', content: message });

      const startTime = Date.now();

      // Add function calling tools
      const tools = this.getEventOrchestrationFunctions();

      let completion = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        tools: tools,
        tool_choice: 'auto' // Let GPT-4 decide when to use functions
      });

      // Handle function calls if GPT-4 wants to use them
      let finalResponse = completion.choices[0].message;

      // Check if GPT-4 wants to call functions
      if (finalResponse.tool_calls && finalResponse.tool_calls.length > 0) {
        console.log(`[OpenAI] 🔧 GPT-4 requested ${finalResponse.tool_calls.length} function call(s)`);

        // Execute each function call
        for (const toolCall of finalResponse.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[OpenAI] Executing function: ${functionName}`);

          // Execute the function
          const functionResult = await this.handleFunctionCall(functionName, functionArgs, contractor);

          // Add function response to messages
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [toolCall]
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          });
        }

        // Get final response from GPT-4 after function execution
        completion = await this.client.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        });

        finalResponse = completion.choices[0].message;
        console.log('[OpenAI] ✅ Final response after function execution:', finalResponse.content.substring(0, 100));
      }

      const processingTime = Date.now() - startTime;
      const response = finalResponse.content;

      // Log the interaction
      console.log(`✅ AI Concierge response generated in ${processingTime}ms`);

      return {
        content: response,
        processingTime,
        tokensUsed: completion.usage.total_tokens,
        model: completion.model
      };

    } catch (error) {
      console.error('❌ Error generating AI Concierge response:', error);

      if (error.code === 'invalid_api_key') {
        throw new Error('OpenAI API key is invalid. Please check your OPENAI_API_KEY environment variable.');
      }

      throw error;
    }
  }

  /**
   * Process image with Vision API
   */
  async processImageWithVision(imageBuffer, mimeType) {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      console.log('🖼️ Processing image with Vision API...');

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o', // Updated model that supports vision
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and provide a detailed description. Focus on any business-relevant content, text, diagrams, or data shown. If it appears to be a business document, quote, invoice, or planning material, extract key information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const description = completion.choices[0].message.content;
      console.log('✅ Image processed successfully');

      return {
        description,
        tokensUsed: completion.usage?.total_tokens || 0
      };

    } catch (error) {
      console.error('❌ Error processing image with Vision API:', error);

      // Fallback response
      return {
        description: 'I received your image but am unable to analyze it at the moment. Please describe what you\'d like to discuss about this image.',
        tokensUsed: 0
      };
    }
  }

  /**
   * Transcribe audio with Whisper API
   */
  async transcribeAudioWithWhisper(audioBuffer, filename) {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured');
    }

    try {
      console.log('🎙️ Transcribing audio with Whisper API...');

      // For Node.js, we need to use a different approach
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      // Create a temporary file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `whisper-${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      try {
        const transcription = await this.client.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          language: 'en', // English
          response_format: 'text'
        });

        console.log('✅ Audio transcribed successfully');

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        return {
          transcription,
          language: 'en'
        };
      } catch (error) {
        // Clean up temp file on error
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        throw error;
      }

    } catch (error) {
      console.error('❌ Error transcribing audio with Whisper API:', error);

      // Fallback response
      return {
        transcription: 'I received your audio recording but am unable to transcribe it at the moment. Please summarize what you discussed in the recording.',
        language: 'en'
      };
    }
  }

  /**
   * Extract text from documents (PDF, Word, etc.)
   */
  async extractTextFromDocument(documentBuffer, mimeType) {
    // For now, return a placeholder - in production, you'd use a library like pdf-parse or mammoth
    console.log('📄 Processing document...');

    // This would need additional libraries:
    // - pdf-parse for PDFs
    // - mammoth for Word docs
    // - etc.

    try {
      // Simplified text extraction
      let extractedText = '';

      if (mimeType === 'text/plain') {
        // Plain text files
        extractedText = documentBuffer.toString('utf-8');
      } else if (mimeType === 'application/pdf') {
        // Would use pdf-parse here
        extractedText = '[PDF content would be extracted here with pdf-parse library]';
        console.log('⚠️ PDF parsing not fully implemented - install pdf-parse for production');
      } else if (mimeType.includes('word')) {
        // Would use mammoth here
        extractedText = '[Word document content would be extracted here with mammoth library]';
        console.log('⚠️ Word doc parsing not fully implemented - install mammoth for production');
      }

      return extractedText || 'Unable to extract text from this document type.';

    } catch (error) {
      console.error('❌ Error extracting document text:', error);
      return 'Unable to process this document. Please describe its contents.';
    }
  }

  /**
   * AI Concierge - Generate partner recommendations
   */
  async generatePartnerRecommendations(contractor, userQuery) {
    const prompt = `Based on this contractor's profile and their question: "${userQuery}"

Please analyze which of our strategic partners would be most relevant and explain why. Focus on:
1. Partners whose capabilities align with the contractor's focus areas
2. Partners who work with contractors in similar revenue ranges
3. Specific solutions that address the contractor's question

Provide 2-3 specific partner recommendations with clear reasoning.`;

    return await this.generateConciergeResponse(prompt, contractor);
  }

  /**
   * AI Concierge - Generate action plan
   */
  async generateActionPlan(contractor, goals) {
    const prompt = `Create a specific 90-day action plan for this contractor based on their goals: ${goals}

Structure the plan with:
1. Week 1-2: Immediate actions
2. Week 3-4: Foundation building
3. Month 2: Implementation
4. Month 3: Optimization and scaling

Include specific metrics to track and potential partners who could accelerate each phase.`;

    return await this.generateConciergeResponse(prompt, contractor);
  }
}

// Export singleton instance
module.exports = new OpenAIService();