# 🏷️ Auto-Tagging Service Implementation
*AI-Powered Content Analysis and Categorization System*

---

## 📋 Project Status

**Status**: 🟡 In Development  
**Started**: September 7, 2025  
**Target Completion**: September 14, 2025  
**Priority**: HIGH  
**Phase**: AI-First Strategy - Phase 2 (Content Processing)

### Progress Tracker
- [ ] Documentation & Planning
- [ ] Database Schema Creation
- [ ] OpenAI Integration Setup
- [ ] Core Tagging Engine
- [ ] Bulk Processing System
- [ ] Testing & Validation
- [ ] Production Deployment

---

## 🎯 Objectives

Create an intelligent auto-tagging service that:
1. **Automatically analyzes** all entity content (partners, books, podcasts, events)
2. **Extracts meaningful tags** using AI/NLP
3. **Categorizes content** across multiple dimensions
4. **Improves matching accuracy** beyond keyword matching
5. **Learns and improves** from user feedback

---

## 🏗️ Architecture Design

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Auto-Tagging Service                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────┐ │
│  │   Ingestion  │────▶│   Analysis   │────▶│Storage │ │
│  │    Queue     │     │    Engine    │     │  Layer  │ │
│  └──────────────┘     └──────────────┘     └─────────┘ │
│         │                     │                   │      │
│         ▼                     ▼                   ▼      │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────┐ │
│  │Content Parser│     │  OpenAI API  │     │PostgreSQL│ │
│  └──────────────┘     └──────────────┘     └─────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Input**: Entity data (partner description, book summary, podcast topics, etc.)
2. **Processing**: AI analysis via OpenAI GPT-4
3. **Output**: Structured tags, categories, and metadata
4. **Storage**: PostgreSQL with JSONB fields

---

## 🗄️ Database Schema

### Core Tables

```sql
-- Auto-generated tags storage
CREATE TABLE ai_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50), -- 'topic', 'industry', 'skill', 'focus_area', 'audience'
  description TEXT,
  synonyms JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity-Tag relationships with confidence scores
CREATE TABLE entity_ai_tags (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL, -- 'partner', 'book', 'podcast', 'event'
  entity_id INTEGER NOT NULL,
  tag_id INTEGER REFERENCES ai_tags(id),
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  extraction_method VARCHAR(50), -- 'ai_analysis', 'keyword_match', 'manual'
  extracted_context TEXT, -- The text that triggered this tag
  verified_by_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, tag_id)
);

-- Tag analysis history for improvement tracking
CREATE TABLE tag_analysis_history (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INTEGER NOT NULL,
  analysis_version VARCHAR(10), -- 'v1.0', 'v1.1', etc.
  raw_analysis JSONB, -- Complete AI response
  extracted_tags JSONB, -- Array of {tag, confidence, context}
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tag feedback for continuous improvement
CREATE TABLE tag_feedback (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INTEGER NOT NULL,
  tag_id INTEGER REFERENCES ai_tags(id),
  feedback_type VARCHAR(20), -- 'correct', 'incorrect', 'missing'
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance
```sql
CREATE INDEX idx_entity_tags_lookup ON entity_ai_tags(entity_type, entity_id);
CREATE INDEX idx_tags_confidence ON entity_ai_tags(confidence_score DESC);
CREATE INDEX idx_tags_category ON ai_tags(category);
CREATE INDEX idx_tag_usage ON ai_tags(usage_count DESC);
```

---

## 🤖 AI Analysis Prompts

### Master Tagging Prompt Template
```javascript
const TAGGING_PROMPT = `
You are an expert content analyzer for a contractor business platform. 
Analyze the following content and extract relevant tags.

CONTENT TYPE: {entityType}
CONTENT: {content}

Extract tags in these categories:
1. TOPICS: Main subjects and themes
2. FOCUS_AREAS: Business areas addressed (greenfield_growth, customer_retention, etc.)
3. INDUSTRIES: Specific industries mentioned or implied
4. SKILLS: Skills or capabilities discussed
5. AUDIENCE: Target audience characteristics
6. REVENUE_RANGE: Applicable revenue ranges (under_500k, 500k_1m, 1m_3m, 3m_5m, 5m_10m, over_10m)
7. BUSINESS_MATURITY: Growth stage (startup, growth, scale, enterprise)
8. OUTCOMES: Expected results or benefits
9. DIFFICULTY: Implementation complexity (easy, moderate, complex)
10. INVESTMENT: Resource requirements relative to revenue (percentage or dollar ranges)

For each tag, provide:
- tag_name: concise, lowercase, underscore_separated
- category: from the list above
- revenue_applicability: which revenue ranges this applies to
- confidence: 0.0 to 1.0
- context: brief excerpt that justifies this tag

Return as JSON array.
`;
```

### Entity-Specific Prompts

#### Partner Analysis
```javascript
const PARTNER_PROMPT = `
Additional analysis for PARTNER:
- Service capabilities and specializations
- Geographic coverage
- TARGET REVENUE RANGES: Which contractor revenue ranges they best serve
- Minimum revenue requirements for engagement
- Pricing models relative to contractor revenue
- Integration requirements
- Success metrics and KPIs by revenue tier
- Case studies grouped by client revenue size
`;
```

#### Book Analysis
```javascript
const BOOK_PROMPT = `
Additional analysis for BOOK:
- Key concepts and frameworks
- Actionable takeaways
- Implementation difficulty
- Time to complete
- Prerequisite knowledge
`;
```

#### Podcast Analysis
```javascript
const PODCAST_PROMPT = `
Additional analysis for PODCAST:
- Episode themes and patterns
- Guest expertise areas
- Actionable insights frequency
- Content depth level
- Production quality indicators
`;
```

#### Event Analysis
```javascript
const EVENT_PROMPT = `
Additional analysis for EVENT:
- Learning objectives
- Networking opportunities
- Skill level requirements
- Follow-up resources
- ROI indicators
`;
```

---

## 💻 Implementation Code

### Core Tagging Service
```javascript
// tpe-backend/src/services/autoTaggingService.js

const OpenAI = require('openai');
const db = require('../config/database');

class AutoTaggingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.MODEL = 'gpt-4-turbo-preview';
  }

  /**
   * Analyze content and extract tags using AI
   */
  async analyzeContent(entityType, entityId, content) {
    try {
      // Build the prompt
      const prompt = this.buildPrompt(entityType, content);
      
      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: 'system', content: 'You are an expert content analyzer.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      
      // Store analysis history
      await this.storeAnalysisHistory(entityType, entityId, analysis, completion.usage);
      
      // Process and store tags
      const tags = await this.processTags(entityType, entityId, analysis.tags);
      
      return {
        success: true,
        tags,
        tokensUsed: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('Auto-tagging error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process extracted tags and store in database
   */
  async processTags(entityType, entityId, extractedTags) {
    const processedTags = [];
    
    for (const tagData of extractedTags) {
      // Create or find existing tag
      const tagId = await this.findOrCreateTag(tagData);
      
      // Create entity-tag relationship
      await this.linkEntityToTag(entityType, entityId, tagId, tagData);
      
      processedTags.push({
        id: tagId,
        name: tagData.tag_name,
        category: tagData.category,
        confidence: tagData.confidence
      });
    }
    
    return processedTags;
  }

  /**
   * Find existing tag or create new one
   */
  async findOrCreateTag(tagData) {
    // Check if tag exists
    const existing = await db.query(
      'SELECT id FROM ai_tags WHERE name = $1',
      [tagData.tag_name]
    );
    
    if (existing.rows.length > 0) {
      // Update usage count
      await db.query(
        'UPDATE ai_tags SET usage_count = usage_count + 1 WHERE id = $1',
        [existing.rows[0].id]
      );
      return existing.rows[0].id;
    }
    
    // Create new tag
    const result = await db.query(
      `INSERT INTO ai_tags (name, category, description) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      [tagData.tag_name, tagData.category, tagData.context]
    );
    
    return result.rows[0].id;
  }

  /**
   * Link entity to tag with confidence score
   */
  async linkEntityToTag(entityType, entityId, tagId, tagData) {
    await db.query(
      `INSERT INTO entity_ai_tags 
       (entity_type, entity_id, tag_id, confidence_score, extraction_method, extracted_context)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (entity_type, entity_id, tag_id) 
       DO UPDATE SET 
         confidence_score = EXCLUDED.confidence_score,
         extracted_context = EXCLUDED.extracted_context`,
      [entityType, entityId, tagId, tagData.confidence, 'ai_analysis', tagData.context]
    );
  }

  /**
   * Bulk process all entities of a type
   */
  async bulkProcess(entityType, limit = 100) {
    const entities = await this.getUntaggedEntities(entityType, limit);
    const results = [];
    
    for (const entity of entities) {
      const content = this.extractEntityContent(entityType, entity);
      const result = await this.analyzeContent(entityType, entity.id, content);
      results.push({
        entityId: entity.id,
        ...result
      });
      
      // Rate limiting
      await this.sleep(1000); // 1 second between requests
    }
    
    return results;
  }

  /**
   * Get entities without tags
   */
  async getUntaggedEntities(entityType, limit) {
    const tableMap = {
      'partner': 'strategic_partners',
      'book': 'books',
      'podcast': 'podcasts',
      'event': 'events'
    };
    
    const query = `
      SELECT * FROM ${tableMap[entityType]} 
      WHERE id NOT IN (
        SELECT DISTINCT entity_id 
        FROM entity_ai_tags 
        WHERE entity_type = $1
      )
      LIMIT $2
    `;
    
    const result = await db.query(query, [entityType, limit]);
    return result.rows;
  }

  // Helper methods
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  buildPrompt(entityType, content) {
    // Implementation of prompt building logic
  }
  
  extractEntityContent(entityType, entity) {
    // Implementation of content extraction logic
  }
  
  storeAnalysisHistory(entityType, entityId, analysis, usage) {
    // Implementation of history storage
  }
}

module.exports = new AutoTaggingService();
```

### API Endpoints
```javascript
// tpe-backend/src/routes/aiRoutes.js

const express = require('express');
const router = express.Router();
const autoTaggingService = require('../services/autoTaggingService');

// Analyze single entity
router.post('/analyze-tags', async (req, res) => {
  const { entityType, entityId } = req.body;
  const result = await autoTaggingService.analyzeContent(entityType, entityId);
  res.json(result);
});

// Bulk process entities
router.post('/bulk-tag', async (req, res) => {
  const { entityType, limit } = req.body;
  const results = await autoTaggingService.bulkProcess(entityType, limit);
  res.json(results);
});

// Get tags for entity
router.get('/tags/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  const tags = await autoTaggingService.getEntityTags(entityType, entityId);
  res.json(tags);
});

module.exports = router;
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] Tag extraction accuracy
- [ ] Confidence score calculation
- [ ] Database operations
- [ ] Error handling

### Integration Tests
- [ ] OpenAI API integration
- [ ] End-to-end tagging flow
- [ ] Bulk processing
- [ ] Rate limiting

### Performance Tests
- [ ] Processing speed (target: <2s per entity)
- [ ] Bulk processing throughput
- [ ] Database query optimization
- [ ] Cost per entity analysis

---

## 📊 Success Metrics

### Technical Metrics
- **Accuracy**: >85% relevant tag extraction
- **Confidence**: Average confidence >0.75
- **Coverage**: 100% of active entities tagged
- **Speed**: <2 seconds per entity
- **Cost**: <$0.05 per entity

### Business Metrics
- **Match Quality**: 30% improvement in matching accuracy
- **Discovery**: 50% increase in cross-entity discovery
- **Engagement**: 25% increase in content engagement
- **Efficiency**: 90% reduction in manual tagging time

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Create database tables and indexes
- [ ] Set up OpenAI API key in environment
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Create admin interface for tag management

### Deployment
- [ ] Deploy service to development
- [ ] Run test batch of 10 entities
- [ ] Validate results and adjust prompts
- [ ] Process all existing entities
- [ ] Deploy to production

### Post-Deployment
- [ ] Monitor API usage and costs
- [ ] Collect user feedback
- [ ] Tune confidence thresholds
- [ ] Document lessons learned

---

## 📝 Scratch Pad / Notes

### Ideas
- Use embeddings for semantic similarity between tags
- Implement tag hierarchies (parent-child relationships)
- Add multilingual support for global expansion
- Create tag suggestion API for manual entry
- Build tag analytics dashboard

### Challenges
- Handling ambiguous or context-dependent tags
- Balancing granularity vs. usability
- Managing API costs at scale
- Ensuring consistency across entity types

### Resources
- [OpenAI Tagging Best Practices](https://platform.openai.com/docs/guides/text-generation)
- [PostgreSQL JSONB Performance](https://www.postgresql.org/docs/current/datatype-json.html)
- [Tag Management Systems](https://en.wikipedia.org/wiki/Tag_management_system)

---

## 🔄 Update Log

### September 7, 2025
- Initial documentation created
- Database schema designed
- Core service architecture planned
- Next: Begin implementation of database tables

---

**Document Status**: Living document - update regularly during development