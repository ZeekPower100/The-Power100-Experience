/**
 * OpenAI Integration Service
 * Handles all AI-powered operations including auto-tagging, content analysis, and insights
 */

const OpenAI = require('openai');
const pool = require('../config/database');

class OpenAIService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.initialized = false;
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
      
      const response = JSON.parse(completion.choices[0].message.content);
      
      // Debug: Log parsed response
      console.log('📊 Parsed AI Response:', JSON.stringify(response, null, 2));
      
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

      return JSON.parse(completion.choices[0].message.content);
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

      const response = JSON.parse(completion.choices[0].message.content);
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
        JSON.stringify(data.ai_response),
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
}

// Export singleton instance
module.exports = new OpenAIService();