# 🎙️ Podcast Transcription & Analysis System
*AI-Powered Audio Content Processing for Actionable Insights*

---

## 📋 Project Status

**Status**: 🟡 In Development  
**Started**: September 7, 2025  
**Target Completion**: September 21, 2025  
**Priority**: HIGH  
**Phase**: AI-First Strategy - Phase 2 (Content Processing)

### Progress Tracker
- [ ] Documentation & Planning
- [ ] Audio Processing Infrastructure
- [ ] Whisper API Integration
- [ ] Transcription Pipeline
- [ ] Content Analysis Engine
- [ ] Insight Extraction System
- [ ] Testing & Validation
- [ ] Production Deployment

---

## 🎯 Objectives

Create an intelligent podcast processing system that:
1. **Automatically transcribes** podcast episodes using Whisper API
2. **Extracts actionable insights** and key takeaways
3. **Identifies expertise areas** and topic patterns
4. **Generates searchable summaries** for quick discovery
5. **Rates content quality** and relevance to contractors
6. **Creates timestamp-linked highlights** for easy navigation

---

## 🏗️ Architecture Design

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│               Podcast Transcription & Analysis              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────┐ │
│  │ Audio Ingestion│───▶│  Processing  │────▶│  Analysis  │ │
│  │   (RSS/Upload) │    │    Queue     │     │   Engine   │ │
│  └──────────────┘     └──────────────┘     └────────────┘ │
│         │                     │                    │        │
│         ▼                     ▼                    ▼        │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────┐ │
│  │  S3 Storage  │     │ Whisper API  │     │  GPT-4 API │ │
│  └──────────────┘     └──────────────┘     └────────────┘ │
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────┐ │
│  │Speaker Diariz│────▶│Topic Modeling│────▶│  Insights  │ │
│  │    ation     │     │& Segmentation│     │ Extraction │ │
│  └──────────────┘     └──────────────┘     └────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Processing Flow
1. **Ingest**: Fetch audio from RSS feed or direct upload
2. **Store**: Save audio file to S3
3. **Transcribe**: Process with Whisper API
4. **Diarize**: Identify different speakers
5. **Analyze**: Extract insights with GPT-4
6. **Segment**: Identify topic transitions
7. **Score**: Rate quality and relevance
8. **Index**: Make searchable in database

---

## 🗄️ Database Schema

### Podcast Content Tables

```sql
-- Podcast show/series information
CREATE TABLE podcast_shows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  host VARCHAR(255),
  description TEXT,
  logo_url TEXT,
  website TEXT,
  rss_feed_url TEXT,
  category VARCHAR(100),
  frequency VARCHAR(50), -- 'daily', 'weekly', 'bi-weekly', 'monthly'
  average_episode_length INTEGER, -- in minutes
  total_episodes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual podcast episodes
CREATE TABLE podcast_episodes (
  id SERIAL PRIMARY KEY,
  show_id INTEGER REFERENCES podcast_shows(id),
  episode_number INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  publish_date DATE,
  guest_names TEXT[], -- Array of guest names
  transcript_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_size_mb DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Episode transcriptions and analysis
CREATE TABLE episode_transcripts (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER REFERENCES podcast_episodes(id),
  
  -- Transcription Data
  full_transcript TEXT,
  transcript_confidence DECIMAL(3,2),
  word_count INTEGER,
  language VARCHAR(10) DEFAULT 'en',
  
  -- Speaker Diarization
  speakers_identified INTEGER,
  speaker_segments JSONB, -- [{speaker: "host", start: 0, end: 45, text: "..."}, ...]
  host_speaking_percentage DECIMAL(3,2),
  
  -- Content Summary
  ai_summary TEXT, -- 2-3 paragraph summary
  episode_type VARCHAR(50), -- 'interview', 'solo', 'panel', 'educational', 'news'
  key_topics TEXT[], -- Main topics discussed
  
  -- Actionable Content
  actionable_insights JSONB, -- [{insight: "...", timestamp: 123, confidence: 0.9}, ...]
  tips_and_strategies JSONB,
  tools_mentioned JSONB, -- [{tool: "...", context: "...", timestamp: 123}, ...]
  metrics_discussed JSONB, -- [{metric: "30% increase", context: "...", timestamp: 456}, ...]
  
  -- Quality Metrics
  content_depth_score DECIMAL(3,2), -- How deep/detailed the content is
  practical_value_score DECIMAL(3,2), -- How actionable the content is
  audio_quality_score DECIMAL(3,2),
  conversation_flow_score DECIMAL(3,2),
  
  -- Relevance Scoring
  contractor_relevance_score DECIMAL(3,2),
  focus_area_alignment JSONB, -- {greenfield_growth: 0.8, customer_retention: 0.3, ...}
  target_audience_fit DECIMAL(3,2),
  
  -- Processing Metadata
  transcription_time_seconds INTEGER,
  analysis_time_seconds INTEGER,
  total_tokens_used INTEGER,
  processing_cost_usd DECIMAL(10,4),
  whisper_model_used VARCHAR(50),
  gpt_model_used VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Episode highlights and key moments
CREATE TABLE episode_highlights (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER REFERENCES podcast_episodes(id),
  highlight_type VARCHAR(50), -- 'key_insight', 'actionable_tip', 'success_story', 'tool_recommendation', 'quote'
  timestamp_start INTEGER NOT NULL, -- seconds from start
  timestamp_end INTEGER,
  speaker VARCHAR(100),
  content TEXT NOT NULL,
  context TEXT, -- Surrounding discussion context
  importance_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topic modeling across episodes
CREATE TABLE podcast_topics (
  id SERIAL PRIMARY KEY,
  topic_name VARCHAR(100) UNIQUE NOT NULL,
  topic_category VARCHAR(50), -- 'business', 'technical', 'marketing', 'operations', 'leadership'
  description TEXT,
  episode_count INTEGER DEFAULT 0, -- How many episodes discuss this
  total_duration_minutes INTEGER DEFAULT 0, -- Total time spent on topic
  average_depth_score DECIMAL(3,2),
  trending_score DECIMAL(3,2), -- Based on recent frequency
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Episode-topic relationships
CREATE TABLE episode_topics (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER REFERENCES podcast_episodes(id),
  topic_id INTEGER REFERENCES podcast_topics(id),
  duration_seconds INTEGER, -- Time spent on this topic
  depth_score DECIMAL(3,2), -- How deeply covered
  timestamps JSONB, -- Array of [start, end] timestamps
  key_points JSONB, -- Main points about this topic
  UNIQUE(episode_id, topic_id)
);

-- Guest expertise tracking
CREATE TABLE podcast_guests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  expertise_areas TEXT[],
  episode_appearances INTEGER DEFAULT 1,
  total_insights_provided INTEGER,
  average_quality_score DECIMAL(3,2),
  linkedin_url TEXT,
  website TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_episode_show ON podcast_episodes(show_id);
CREATE INDEX idx_transcript_episode ON episode_transcripts(episode_id);
CREATE INDEX idx_highlights_episode ON episode_highlights(episode_id);
CREATE INDEX idx_highlights_type ON episode_highlights(highlight_type);
CREATE INDEX idx_episode_topics_lookup ON episode_topics(episode_id, topic_id);
CREATE INDEX idx_transcript_relevance ON episode_transcripts(contractor_relevance_score DESC);
CREATE INDEX idx_topics_trending ON podcast_topics(trending_score DESC);
```

---

## 🤖 AI Analysis Prompts

### 1. Episode Summarization
```javascript
const summarizeEpisode = `
  Analyze this podcast transcript and provide:
  
  EXECUTIVE SUMMARY (2-3 paragraphs):
  - Main theme and purpose of episode
  - Key discussion points
  - Overall value proposition
  
  GUEST EXPERTISE (if applicable):
  - Guest background and credentials
  - Unique perspectives shared
  - Credibility indicators
  
  CONVERSATION QUALITY:
  - Depth of content (surface vs detailed)
  - Host preparation level
  - Guest engagement quality
  - Follow-up question effectiveness
`;
```

### 2. Actionable Insight Extraction
```javascript
const extractActionableInsights = `
  Extract ACTIONABLE INSIGHTS for contractors from this podcast:
  
  For each insight provide:
  - INSIGHT: The specific actionable advice
  - CONTEXT: Why this matters for contractors
  - REVENUE_RANGE_FIT: Which revenue ranges this applies to (under_500k, 500k_1m, 1m_3m, 3m_5m, 5m_10m, over_10m)
  - IMPLEMENTATION: How to apply this at different revenue levels
  - DIFFICULTY: Easy/Medium/Hard relative to business size
  - INVESTMENT_REQUIRED: Dollar amount or percentage of revenue
  - TIMELINE: When to implement based on business maturity
  - EXPECTED_OUTCOME: What results to expect by revenue range
  - SCALABILITY: How this scales with business growth
  - TIMESTAMP: Where in the episode this was discussed
  
  Focus on:
  - Specific strategies and tactics by business size
  - Tools and resources with pricing tiers
  - Metrics and KPIs relevant to revenue range
  - Process improvements that scale
  - Common mistakes at each growth stage
`;
```

### 3. Topic Segmentation
```javascript
const segmentTopics = `
  Identify topic segments in this podcast transcript:
  
  For each topic segment:
  - TOPIC: Main subject being discussed
  - START_TIME: When topic begins
  - END_TIME: When topic ends
  - DEPTH: How thoroughly covered (1-10)
  - KEY_POINTS: 3-5 main points made
  - RELEVANCE: To home service contractors (1-10)
  - TRANSITION: How they moved to next topic
  
  Common topics to identify:
  - Business growth strategies
  - Marketing and lead generation
  - Operations and efficiency
  - Technology and tools
  - Team management
  - Customer service
  - Financial management
`;
```

### 4. Quality and Relevance Scoring
```javascript
const scoreEpisodeQuality = `
  Score this podcast episode for quality and relevance:
  
  CONTENT QUALITY (0-1):
  - Information density
  - Accuracy and credibility
  - Uniqueness of insights
  - Practical applicability
  
  PRODUCTION QUALITY (0-1):
  - Audio clarity
  - Conversation flow
  - Organization and structure
  - Professional presentation
  
  CONTRACTOR RELEVANCE (0-1):
  - Industry applicability
  - Business size fit
  - Growth stage alignment
  - Problem-solution match
  
  ACTIONABILITY (0-1):
  - Specific vs vague advice
  - Implementation clarity
  - Resource availability
  - Realistic expectations
`;
```

---

## 💻 Implementation Code

### Core Podcast Service
```javascript
// tpe-backend/src/services/podcastTranscriptionService.js

const OpenAI = require('openai');
const AWS = require('aws-sdk');
const axios = require('axios');
const Parser = require('rss-parser');
const db = require('../config/database');

class PodcastTranscriptionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.s3 = new AWS.S3();
    this.parser = new Parser();
  }

  /**
   * Process podcast episode
   */
  async processEpisode(episodeId) {
    try {
      const episode = await this.getEpisodeData(episodeId);
      
      // Update status
      await this.updateStatus(episodeId, 'processing');
      
      // Download audio
      const audioPath = await this.downloadAudio(episode.audio_url);
      
      // Transcribe with Whisper
      const transcription = await this.transcribeAudio(audioPath);
      
      // Speaker diarization
      const speakers = await this.identifySpeakers(transcription);
      
      // Content analysis
      const [summary, insights, topics, quality] = await Promise.all([
        this.generateSummary(transcription.text),
        this.extractInsights(transcription.text),
        this.segmentTopics(transcription.text, transcription.segments),
        this.scoreQuality(transcription.text)
      ]);
      
      // Store results
      await this.storeTranscription(episodeId, {
        transcription,
        speakers,
        summary,
        insights,
        topics,
        quality
      });
      
      // Extract and store highlights
      await this.extractHighlights(episodeId, insights, transcription.segments);
      
      // Update topic models
      await this.updateTopicModels(episodeId, topics);
      
      // Update status
      await this.updateStatus(episodeId, 'completed');
      
      return { success: true, episodeId };
      
    } catch (error) {
      console.error('Podcast processing error:', error);
      await this.updateStatus(episodeId, 'failed', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(audioPath) {
    const transcription = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"]
    });
    
    return {
      text: transcription.text,
      segments: transcription.segments,
      words: transcription.words,
      language: transcription.language,
      duration: transcription.duration
    };
  }

  /**
   * Identify and separate speakers (simplified diarization)
   */
  async identifySpeakers(transcription) {
    // Use GPT to identify speaker changes based on context
    const prompt = `
      Analyze this transcript and identify different speakers.
      Look for:
      - Introduction phrases ("I'm joined by...")
      - Question/answer patterns
      - Speaking style changes
      - Name mentions
      
      Return speaker segments with labels (Host, Guest1, Guest2, etc.)
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert at speaker diarization." },
        { role: "user", content: prompt + "\n\nTranscript:\n" + transcription.text }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Extract actionable insights
   */
  async extractInsights(transcript) {
    const prompt = `
      Extract actionable insights for home service contractors.
      
      For each insight:
      {
        "insight": "The specific advice",
        "context": "Why this matters",
        "implementation": "How to apply",
        "difficulty": "easy|medium|hard",
        "timeline": "immediate|short_term|long_term",
        "expected_outcome": "What to expect",
        "confidence": 0.0-1.0
      }
      
      Focus on practical, implementable advice.
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert business advisor for contractors." },
        { role: "user", content: prompt + "\n\nTranscript:\n" + transcript }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content).insights;
  }

  /**
   * Segment topics with timestamps
   */
  async segmentTopics(transcript, segments) {
    const topics = [];
    
    // Process in chunks to identify topic transitions
    for (let i = 0; i < segments.length; i += 5) {
      const chunk = segments.slice(i, Math.min(i + 5, segments.length));
      const chunkText = chunk.map(s => s.text).join(' ');
      
      const topic = await this.identifyTopic(chunkText);
      
      topics.push({
        topic: topic.name,
        category: topic.category,
        start_time: chunk[0].start,
        end_time: chunk[chunk.length - 1].end,
        depth_score: topic.depth,
        key_points: topic.points
      });
    }
    
    // Merge adjacent similar topics
    return this.mergeAdjacentTopics(topics);
  }

  /**
   * Extract highlight moments
   */
  async extractHighlights(episodeId, insights, segments) {
    const highlights = [];
    
    for (const insight of insights) {
      // Find the segment containing this insight
      const segment = this.findSegmentForText(insight.insight, segments);
      
      if (segment) {
        highlights.push({
          episode_id: episodeId,
          highlight_type: 'actionable_tip',
          timestamp_start: segment.start,
          timestamp_end: segment.end,
          content: insight.insight,
          context: insight.context,
          importance_score: insight.confidence
        });
      }
    }
    
    // Bulk insert highlights
    await this.bulkInsertHighlights(highlights);
  }

  /**
   * Score episode quality and relevance
   */
  async scoreQuality(transcript) {
    const prompt = `
      Score this podcast episode:
      
      1. Content Depth (0-1): How detailed and thorough?
      2. Practical Value (0-1): How actionable for contractors?
      3. Conversation Flow (0-1): How well organized?
      4. Contractor Relevance (0-1): How applicable to home services?
      
      Also identify which focus areas this aligns with:
      - greenfield_growth
      - customer_retention
      - operational_efficiency
      - team_building
      - technology_adoption
      
      Return scores and alignment percentages.
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: "You are an expert content evaluator." },
        { role: "user", content: prompt + "\n\nTranscript:\n" + transcript }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Fetch episodes from RSS feed
   */
  async fetchFromRSS(feedUrl) {
    const feed = await this.parser.parseURL(feedUrl);
    const episodes = [];
    
    for (const item of feed.items) {
      episodes.push({
        title: item.title,
        description: item.contentSnippet,
        audio_url: item.enclosure?.url,
        publish_date: item.pubDate,
        duration: item.itunes?.duration
      });
    }
    
    return episodes;
  }
}

module.exports = new PodcastTranscriptionService();
```

### API Endpoints
```javascript
// tpe-backend/src/routes/podcastRoutes.js

const express = require('express');
const router = express.Router();
const podcastService = require('../services/podcastTranscriptionService');

// Process single episode
router.post('/process-episode', async (req, res) => {
  const { episodeId } = req.body;
  const result = await podcastService.processEpisode(episodeId);
  res.json(result);
});

// Fetch and process RSS feed
router.post('/process-feed', async (req, res) => {
  const { feedUrl, limit = 10 } = req.body;
  const episodes = await podcastService.fetchFromRSS(feedUrl);
  const results = await podcastService.processBatch(episodes.slice(0, limit));
  res.json(results);
});

// Get episode insights
router.get('/episodes/:id/insights', async (req, res) => {
  const insights = await podcastService.getEpisodeInsights(req.params.id);
  res.json(insights);
});

// Search transcripts
router.post('/search', async (req, res) => {
  const { query, filters } = req.body;
  const results = await podcastService.searchTranscripts(query, filters);
  res.json(results);
});

module.exports = router;
```

---

## 🧪 Testing Plan

### Transcription Tests
- [ ] Accuracy across different audio qualities
- [ ] Multiple speaker identification
- [ ] Background noise handling
- [ ] Different accents and speaking speeds

### Analysis Tests
- [ ] Insight extraction relevance
- [ ] Topic segmentation accuracy
- [ ] Quality scoring consistency
- [ ] Timestamp precision

### Performance Tests
- [ ] Processing time for various lengths
- [ ] Concurrent episode processing
- [ ] Memory usage optimization
- [ ] API rate limit management

---

## 📊 Success Metrics

### Technical Metrics
- **Transcription Accuracy**: >95% word accuracy
- **Processing Speed**: <3 minutes per 60-minute episode
- **Insight Extraction**: Average 10+ insights per episode
- **Topic Identification**: 90% accuracy vs manual review
- **Cost per Episode**: <$0.30

### Business Metrics
- **Content Discovery**: 50% faster finding relevant episodes
- **Engagement Rate**: 40% increase in podcast consumption
- **Actionability Score**: >0.7 average across episodes
- **Implementation Rate**: 30% of insights implemented by contractors

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Set up S3 bucket for audio storage
- [ ] Configure Whisper API access
- [ ] Create database tables and indexes
- [ ] Set up processing queue (SQS/Redis)
- [ ] Configure RSS feed parser

### Deployment
- [ ] Deploy transcription service
- [ ] Test with sample episodes
- [ ] Validate insight extraction
- [ ] Process pilot podcast series
- [ ] Monitor costs and performance

### Post-Deployment
- [ ] Monitor transcription accuracy
- [ ] Track API usage and costs
- [ ] Collect user feedback on insights
- [ ] Optimize processing pipeline
- [ ] Build insight recommendation engine

---

## 📝 Scratch Pad / Notes

### Podcast Selection Criteria
- Industry relevance (home services, construction, trades)
- Episode consistency (regular publishing)
- Guest quality (successful contractors, industry experts)
- Actionable content (not just theory)
- Production quality (clear audio)

### Common Insight Patterns
- "We increased revenue by X% by doing Y"
- "The biggest mistake contractors make is..."
- "Our top performing strategy is..."
- "The tool that changed our business was..."
- "If I was starting over, I would..."

### Technical Challenges
- Long episode processing (2+ hours)
- Multiple speakers with crosstalk
- Poor audio quality from some guests
- Identifying specific timestamp for insights
- Handling different podcast formats

### Future Enhancements
- Real-time transcription during live podcasts
- Automatic clip generation for social media
- Personalized insight recommendations
- Cross-episode topic tracking
- Guest expertise profiling

---

## 🔄 Update Log

### September 7, 2025
- Initial documentation created
- Database schema designed
- Transcription pipeline planned
- Insight extraction system designed
- Next: Set up Whisper API integration

---

**Document Status**: Living document - update regularly during development