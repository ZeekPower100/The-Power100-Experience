/**
 * Podcast Processing Service
 * Handles podcast transcription, analysis, and auto-tagging from URLs
 * Part of Phase 2: Content Processing
 */

const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const openAIService = require('./openAIService');
const autoTaggingService = require('./autoTaggingService');
const { query } = require('../config/database');
const axios = require('axios');
const Parser = require('rss-parser');

// Import models for database operations
const PodcastEpisodes = require('../models/podcastEpisodes');
const EpisodeTranscripts = require('../models/episodeTranscripts');

class PodcastProcessingService {
  constructor() {
    this.rssParser = new Parser();
  }

  /**
   * Process a podcast episode from URL
   * @param {Object} params - Processing parameters
   * @param {string} params.episodeUrl - Direct URL to the audio file
   * @param {string} params.podcastId - Database ID of the podcast
   * @param {Object} params.metadata - Episode metadata (title, description, etc.)
   */
  async processEpisodeFromUrl({ episodeUrl, podcastId, metadata = {} }) {
    try {
      console.log(`🎙️ Starting podcast processing for: ${metadata.title || episodeUrl}`);

      // Step 1: Fetch audio stream (not download)
      const audioStream = await this.fetchAudioStream(episodeUrl);

      // Step 2: Transcribe with Whisper
      const transcription = await this.transcribeAudio(audioStream, metadata.title);

      // Step 3: Extract insights and generate summary
      const analysis = await this.analyzeTranscription(transcription, metadata);

      // Step 4: Auto-tag the content
      const tags = await this.generateTags(transcription, metadata);

      // Step 5: Store processed data (not the audio file)
      const result = await this.storeProcessedEpisode({
        podcastId,
        episodeUrl,
        metadata,
        transcription,
        analysis,
        tags
      });

      console.log(`✅ Podcast episode processed successfully: ${metadata.title}`);
      return result;

    } catch (error) {
      console.error('❌ Error processing podcast episode:', error);
      throw error;
    }
  }

  /**
   * Fetch RSS feed and process new episodes
   * @param {string} rssFeedUrl - URL of the podcast RSS feed
   * @param {string} podcastId - Database ID of the podcast
   */
  async processRssFeed(rssFeedUrl, podcastId) {
    try {
      console.log(`📡 Fetching RSS feed: ${rssFeedUrl}`);

      // Parse RSS feed
      const feed = await this.rssParser.parseURL(rssFeedUrl);

      // Get already processed episodes
      const processedEpisodes = await this.getProcessedEpisodes(podcastId);
      const processedUrls = new Set(processedEpisodes.map(e => e.episode_url));

      // Process new episodes
      const newEpisodes = feed.items.filter(item =>
        item.enclosure?.url && !processedUrls.has(item.enclosure.url)
      );

      console.log(`📊 Found ${newEpisodes.length} new episodes to process`);

      const results = [];
      for (const episode of newEpisodes) {
        try {
          const result = await this.processEpisodeFromUrl({
            episodeUrl: episode.enclosure.url,
            podcastId,
            metadata: {
              title: episode.title,
              description: episode.contentSnippet || episode.content,
              pubDate: episode.pubDate,
              duration: episode.itunes?.duration,
              author: episode.creator || feed.title
            }
          });
          results.push(result);
        } catch (error) {
          console.error(`Failed to process episode: ${episode.title}`, error);
        }
      }

      return {
        feedTitle: feed.title,
        totalEpisodes: feed.items.length,
        newEpisodesProcessed: results.length,
        episodes: results
      };

    } catch (error) {
      console.error('❌ Error processing RSS feed:', error);
      throw error;
    }
  }

  /**
   * Fetch audio stream without downloading
   */
  async fetchAudioStream(audioUrl) {
    try {
      const response = await axios.get(audioUrl, {
        responseType: 'stream',
        timeout: 30000,
        maxContentLength: 500 * 1024 * 1024 // 500MB max
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching audio stream:', error);
      throw new Error(`Failed to fetch audio from URL: ${audioUrl}`);
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(audioStream, title = 'Podcast Episode') {
    try {
      console.log(`🎤 Transcribing: ${title}`);

      // Convert stream to buffer for Whisper API
      const chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      // Use Whisper API from OpenAI service
      const result = await openAIService.transcribeAudioWithWhisper(
        audioBuffer,
        `${title}.mp3`
      );

      return result.transcription;

    } catch (error) {
      console.error('Transcription error:', error);
      // Return empty transcription as fallback
      return '[Transcription failed - audio may be corrupted or in unsupported format]';
    }
  }

  /**
   * Analyze transcription for insights
   */
  async analyzeTranscription(transcription, metadata) {
    try {
      const prompt = `
        Analyze this podcast episode transcript and extract business insights for contractors.

        Episode: ${metadata.title}
        Description: ${metadata.description || 'N/A'}

        Transcript (first 5000 chars): ${transcription.substring(0, 5000)}

        Provide a JSON response with:
        {
          "summary": "2-3 sentence executive summary",
          "keyTopics": ["topic1", "topic2", "topic3"],
          "actionableInsights": [
            {
              "insight": "specific advice or strategy",
              "implementation": "how to implement",
              "expectedOutcome": "what to expect"
            }
          ],
          "targetAudience": {
            "revenueRange": "$1M-$3M",
            "focusAreas": ["Sales", "Operations"],
            "businessStage": "growth"
          },
          "quotableQuotes": ["memorable quote 1", "memorable quote 2"],
          "recommendedFor": "brief description of who should listen",
          "estimatedValue": "low|medium|high",
          "implementationDifficulty": "easy|moderate|complex"
        }
      `;

      // Use OpenAI to analyze
      const analysis = await openAIService.generateConciergeResponse(
        prompt,
        { name: 'System' },
        [],
        []
      );

      return safeJsonParse(analysis.content, {
        summary: 'Podcast episode analysis pending',
        keyTopics: [],
        actionableInsights: [],
        targetAudience: {},
        quotableQuotes: [],
        recommendedFor: 'All contractors',
        estimatedValue: 'medium',
        implementationDifficulty: 'moderate'
      });

    } catch (error) {
      console.error('Analysis error:', error);
      return {
        summary: 'Analysis failed',
        keyTopics: [],
        actionableInsights: []
      };
    }
  }

  /**
   * Generate tags for the episode
   */
  async generateTags(transcription, metadata) {
    try {
      // Combine metadata and transcript for tagging
      const content = `
        Title: ${metadata.title}
        Description: ${metadata.description}
        Transcript excerpt: ${transcription.substring(0, 2000)}
      `;

      // Use auto-tagging service
      const tagResult = await autoTaggingService.tagEntity(
        'podcast',
        null,
        content,
        metadata
      );

      return tagResult.tags || [];

    } catch (error) {
      console.error('Tagging error:', error);
      return [];
    }
  }

  /**
   * Store processed episode data - USING MODELS
   */
  async storeProcessedEpisode(data) {
    try {
      // Check if episode already exists by audio URL
      const existingEpisode = await query(`
        SELECT id FROM podcast_episodes WHERE audio_url = $1
      `, [data.episodeUrl]);

      let episodeId;

      if (existingEpisode.rows.length > 0) {
        // Update existing episode
        episodeId = existingEpisode.rows[0].id;
        await PodcastEpisodes.update(episodeId, {
          transcript_status: 'completed'
        });
      } else {
        // Create new episode using model
        const newEpisode = await PodcastEpisodes.create({
          show_id: data.podcastId,
          title: data.metadata.title,
          description: data.metadata.description,
          audio_url: data.episodeUrl,
          duration_seconds: data.metadata.duration ? parseInt(data.metadata.duration) : null,
          publish_date: data.metadata.pubDate,
          guest_names: data.metadata.guests || [],
          transcript_status: 'completed',
          episode_number: null, // Will be set later if available
          file_size_mb: null // Will be calculated if needed
        });

        episodeId = newEpisode.id;
      }

      // Create transcript using model
      const transcriptData = await EpisodeTranscripts.create({
        episode_id: episodeId,
        full_transcript: data.transcription,
        ai_summary: data.analysis.summary,
        key_topics: data.analysis.keyTopics || [],
        actionable_insights: data.analysis.actionableInsights || [],
        focus_area_alignment: {
          focusAreas: data.analysis.targetAudience?.focusAreas || [],
          alignment: data.tags || []
        },
        contractor_relevance_score: 0.75, // Default, would be calculated
        practical_value_score: data.analysis.estimatedValue === 'high' ? 0.9 :
          data.analysis.estimatedValue === 'medium' ? 0.7 : 0.5,
        whisper_model_used: 'whisper-1',
        gpt_model_used: 'gpt-4',
        // Additional fields with defaults
        transcript_confidence: 0.95,
        word_count: data.transcription ? data.transcription.split(' ').length : 0,
        language: 'en',
        content_depth_score: 0.7,
        audio_quality_score: 0.8,
        conversation_flow_score: 0.8
      });

      // Update the podcast's ai_tags if we generated new tags
      if (data.tags && data.tags.length > 0) {
        await query(`
          UPDATE podcasts
          SET ai_tags = ai_tags || $2::jsonb
          WHERE id = $1
        `, [data.podcastId, safeJsonStringify(data.tags)]);
      }

      return {
        episodeId,
        transcriptId: transcriptData.id,
        ...transcriptData
      };

    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  /**
   * Get already processed episodes - USING MODELS
   */
  async getProcessedEpisodes(showId) {
    try {
      // Get episodes using model
      const episodes = await PodcastEpisodes.getByShowId(showId);

      // For each episode, check if transcript exists
      const episodesWithTranscripts = await Promise.all(
        episodes.map(async (episode) => {
          const transcripts = await EpisodeTranscripts.getByEpisodeId(episode.id);
          return {
            ...episode,
            transcript_id: transcripts[0]?.id || null,
            has_transcript: transcripts.length > 0
          };
        })
      );

      return episodesWithTranscripts;

    } catch (error) {
      console.error('Error fetching processed episodes:', error);
      return [];
    }
  }

  /**
   * Search podcast transcripts - ALIGNED WITH DATABASE SCHEMA
   */
  async searchTranscripts(searchQuery, limit = 10) {
    try {
      const result = await query(`
        SELECT
          pe.id,
          pe.title,
          et.ai_summary,
          et.full_transcript,
          ps.title as podcast_title,
          pe.audio_url,
          pe.created_at,
          et.contractor_relevance_score
        FROM episode_transcripts et
        JOIN podcast_episodes pe ON et.episode_id = pe.id
        JOIN podcast_shows ps ON pe.show_id = ps.id
        WHERE
          et.full_transcript ILIKE $1
          OR et.ai_summary ILIKE $1
          OR pe.title ILIKE $1
        ORDER BY et.contractor_relevance_score DESC, pe.created_at DESC
        LIMIT $2
      `, [`%${searchQuery}%`, limit]);

      return result.rows;

    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
}

module.exports = new PodcastProcessingService();