const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

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
   * AI Concierge - Generate conversational response for contractor
   */
  async generateConciergeResponse(message, contractor, conversationHistory = [], partners = [], knowledgeBase = {}) {
    // Initialize on first use
    this.initializeClient();

    if (!this.isConfigured) {
      throw new Error('OpenAI service not configured. Please set OPENAI_API_KEY in environment variables.');
    }

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

    // Build comprehensive knowledge context
    let knowledgeContext = '';

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

      // Add book recommendations
      if (knowledgeBase.books && knowledgeBase.books.length > 0) {
        knowledgeContext += `\n\n=== BOOKS IN TPX LIBRARY (${knowledgeBase.books.length} total) ===`;
        knowledgeContext += `\nALL THESE BOOKS ARE AVAILABLE IN OUR LIBRARY:\n`;
        knowledgeBase.books.forEach((book, index) => {
          const focusAreas = Array.isArray(book.focus_areas_covered)
            ? book.focus_areas_covered.join(', ')
            : book.focus_areas_covered || 'General business';
          knowledgeContext += `\n${index + 1}. **"${book.title}"** by ${book.author}`;
          knowledgeContext += `\n   Focus: ${focusAreas}`;
          if (book.key_takeaways) {
            knowledgeContext += `\n   Key Takeaways: ${book.key_takeaways.substring(0, 150)}`;
          }
          if (book.amazon_url) {
            knowledgeContext += `\n   Purchase: ${book.amazon_url}`;
          }
          knowledgeContext += '\n';
        });
        knowledgeContext += `\n=== END OF BOOK LIST ===\n`;
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

    const systemPrompt = `You are the AI Concierge for The Power100 Experience (TPX), a premium business growth platform that connects contractors with strategic partners and resources.

${partnerContext ? partnerContext : ''}

ABSOLUTE CRITICAL RULE: If the "=== STRATEGIC PARTNERS IN TPX NETWORK ===" section exists above, you can ONLY recommend partners from that exact list. Do NOT mention ANY other company names like ABC Supply, EnerBank, GuildQuality, Hatch, Leap, MarketSharp, Socius Marketing, Surefire Local, CoConstruct, ServiceTitan, or Buildertrend. If a partner is not in the list above, it does NOT exist in our network.

Your role is to provide personalized, strategic business advice as a trusted advisor who knows their business intimately. You have access to comprehensive industry data, partner feedback, and continuous learning from all TPX resources.

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
  Example: "I recommend 'Traction' by Gino Wickman from our TPX library, which focuses on operational efficiency"
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

Always remember: You're here to be their AI-powered business advisor, providing insights and recommendations based on their unique situation, goals, AND the collective intelligence of the entire TPX ecosystem.`;

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

      // Add current message
      messages.push({ role: 'user', content: message });

      const startTime = Date.now();

      const completion = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const processingTime = Date.now() - startTime;
      const response = completion.choices[0].message.content;

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