const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { YoutubeTranscript } = require('youtube-transcript');
const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class VideoAnalysisService {
  constructor() {
    this.openai = openai;
  }

  /**
   * Extract frames from video URL for analysis
   */
  async extractFramesFromVideo(videoUrl, numFrames = 5) {
    try {
      // For YouTube videos, extract video ID
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const videoId = this.extractYouTubeId(videoUrl);

        // Get video thumbnails at different timestamps
        const frames = [];
        const thumbnailQualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'];

        for (const quality of thumbnailQualities) {
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
          try {
            const response = await fetch(thumbnailUrl);
            if (response.ok) {
              frames.push({
                url: thumbnailUrl,
                timestamp: 'thumbnail',
                description: `YouTube video thumbnail (${quality})`
              });
              break; // Use the highest quality available
            }
          } catch (err) {
            console.log(`Failed to fetch ${quality} thumbnail`);
          }
        }

        return frames;
      }

      // For other video types, return placeholder
      return [{
        url: videoUrl,
        timestamp: 0,
        description: 'Video frame extraction requires additional processing'
      }];

    } catch (error) {
      console.error('Error extracting frames:', error);
      throw error;
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get YouTube video transcript
   */
  async getYouTubeTranscript(videoUrl) {
    try {
      const videoId = this.extractYouTubeId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      // Format transcript with timestamps
      const formattedTranscript = transcript.map(entry => ({
        text: entry.text,
        start: entry.offset / 1000, // Convert to seconds
        duration: entry.duration / 1000
      }));

      // Create full text transcript
      const fullText = transcript.map(entry => entry.text).join(' ');

      return {
        fullText,
        segments: formattedTranscript,
        hasTranscript: true
      };
    } catch (error) {
      console.log('Could not fetch YouTube transcript:', error.message);
      return {
        fullText: '',
        segments: [],
        hasTranscript: false,
        error: error.message
      };
    }
  }

  /**
   * Transcribe video audio using OpenAI Whisper API
   */
  async transcribeVideoWithWhisper(videoUrl) {
    try {
      console.log('🎤 Starting Whisper transcription for:', videoUrl);

      // For YouTube videos, try to extract audio URL
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // First try YouTube transcript API (faster and free)
        const ytTranscript = await this.getYouTubeTranscript(videoUrl);
        if (ytTranscript.hasTranscript) {
          console.log('✅ Using YouTube transcript (faster)');
          return ytTranscript;
        }
      }

      // For direct video files or when YouTube transcript fails
      // Note: This requires downloading the video/audio first
      // In production, you'd want to use a service to extract audio

      console.log('📥 Downloading video for transcription...');

      // Download video/audio (simplified - in production use proper streaming)
      const response = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 30000,
        maxContentLength: 25 * 1024 * 1024 // 25MB limit for Whisper API
      });

      // Create form data for Whisper API
      const formData = new FormData();
      formData.append('file', response.data, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('language', 'en'); // Assume English, could be detected

      console.log('🎯 Calling Whisper API...');

      // Call Whisper API
      const transcriptionResponse = await this.openai.audio.transcriptions.create({
        file: response.data,
        model: 'whisper-1',
        response_format: 'verbose_json',
        language: 'en'
      });

      console.log('✅ Whisper transcription complete');

      // Format the response
      const segments = transcriptionResponse.segments || [];
      const fullText = transcriptionResponse.text || '';

      return {
        fullText,
        segments: segments.map(seg => ({
          text: seg.text,
          start: seg.start,
          duration: seg.end - seg.start
        })),
        hasTranscript: true,
        language: transcriptionResponse.language || 'en'
      };

    } catch (error) {
      console.error('❌ Whisper transcription error:', error.message);

      // If it's a YouTube video and Whisper fails, note that we tried
      if (videoUrl.includes('youtube')) {
        console.log('💡 Tip: YouTube transcript API failed, and Whisper cannot directly access YouTube videos');
        console.log('   Consider using a YouTube downloader service first');
      }

      return {
        fullText: '',
        segments: [],
        hasTranscript: false,
        error: `Transcription failed: ${error.message}`
      };
    }
  }

  /**
   * Analyze video content using Vision API for frames and GPT-4 for transcript
   */
  async analyzePartnerDemoVideo(videoUrl, partnerInfo = {}) {
    try {
      console.log('🎥 Starting video analysis for:', videoUrl);

      // Extract frames from video
      const frames = await this.extractFramesFromVideo(videoUrl);
      console.log(`📸 Extracted ${frames.length} frames`);

      // Get transcript - try YouTube first, then Whisper
      let transcript = { fullText: '', segments: [], hasTranscript: false };

      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // Try YouTube transcript API first (free and faster)
        transcript = await this.getYouTubeTranscript(videoUrl);
        console.log(`📝 YouTube transcript available: ${transcript.hasTranscript}`);
      }

      // If no transcript yet and it's a direct video URL, try Whisper
      if (!transcript.hasTranscript && !videoUrl.includes('youtube')) {
        console.log('🎤 Attempting Whisper transcription for direct video...');
        transcript = await this.transcribeVideoWithWhisper(videoUrl);
        console.log(`📝 Whisper transcript available: ${transcript.hasTranscript}`);
      }

      // Prepare analysis prompt
      const analysisPrompt = `
You are analyzing a video that should be a partner demo or testimonial for The Power 100 Experience platform.
This platform connects home improvement contractors with B2B service providers.
Partner: ${partnerInfo.company_name || 'Unknown Partner'}
Service Areas: ${partnerInfo.capabilities ? partnerInfo.capabilities.join(', ') : 'Not specified'}

CRITICAL FIRST STEP - Content Relevance Check:
1. Is this a business-related video? (not music, entertainment, gaming, etc.)
2. Is this relevant to B2B services or home improvement industry?
3. Is this a demo, testimonial, or educational content?

If the video is NOT relevant (e.g., music video, movie trailer, gaming, etc.), return:
{
  "content_relevant": false,
  "relevance_issue": "specific issue (e.g., 'This is a music video, not a business demo')",
  "demo_quality_score": 0,
  "scoring_reasoning": "Cannot score - video is not a business demo or testimonial. [Explain what it actually is]",
  "recommendations": ["Upload an actual product demo video", "Use testimonial or case study content", "Ensure video showcases business solutions"]
}

If the video IS relevant, please analyze this video content and provide:

1. **Demo Quality Score** (0-100) with detailed reasoning:
   - Overall score and WHY you gave this score
   - Presentation clarity (0-20 points)
   - Value proposition strength (0-20 points)
   - Technical demonstration quality (0-20 points)
   - Customer benefit articulation (0-20 points)
   - Professional production quality (0-20 points)

2. **Scoring Breakdown** - Explain the score for EACH criterion:
   - What worked well (be specific)
   - What didn't work (be specific)
   - Exact reason for points deducted

2. **Key Features Demonstrated**:
   - List main product/service features shown
   - Unique selling points highlighted
   - Integration capabilities mentioned

3. **Target Audience Alignment**:
   - Identified contractor segments (revenue tiers)
   - Business challenges addressed
   - ROI/value metrics presented

4. **Strengths**:
   - What the demo does well
   - Compelling moments
   - Clear benefits shown

5. **Improvement Opportunities**:
   - Areas that could be clearer
   - Missing information contractors need
   - Production quality issues

6. **Recommended Focus Areas** (based on content):
   - Which Power 100 focus areas this solution addresses
   - How it aligns with contractor needs

7. **Key Timestamps** (if transcript available):
   - Important moments in the demo
   - Where specific features are shown

${transcript.hasTranscript ? `\nVideo Transcript:\n${transcript.fullText.substring(0, 8000)}` : '\nNote: No transcript available for this video.'}

Provide the analysis in a structured JSON format.`;

      // Analyze with Vision API (for visual content) and GPT-4 (for transcript)
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt }
          ]
        }
      ];

      // Add frame analysis if we have valid frames
      if (frames.length > 0 && frames[0].url.includes('youtube')) {
        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: frames[0].url,
            detail: "high"
          }
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: frames.length > 0 ? "gpt-4o" : "gpt-4-turbo-preview",
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.3
      });

      const analysis = safeJsonParse(completion.choices[0].message.content, {});

      // Check if content is relevant
      if (analysis.content_relevant === false) {
        console.log('⚠️ Video content not relevant for business analysis');

        return {
          success: true,
          videoUrl,
          partnerInfo,
          contentRelevant: false,
          relevanceIssue: analysis.relevance_issue || 'Video is not business-related content',
          hasTranscript: transcript.hasTranscript,
          frameCount: frames.length,
          analysis: {
            ...analysis,
            demo_quality_score: 0,
            scoring_reasoning: analysis.scoring_reasoning || `This appears to be ${analysis.relevance_issue}. A proper business demo or testimonial video is required for meaningful analysis.`
          },
          insights: {
            quality_score: 0,
            content_relevant: false,
            relevance_issue: analysis.relevance_issue,
            scoring_reasoning: analysis.scoring_reasoning || 'Content not relevant for business analysis',
            recommendations: analysis.recommendations || [
              'Upload a proper product demonstration video',
              'Use customer testimonial videos',
              'Ensure video content is business-related'
            ]
          },
          metadata: {
            analyzedAt: new Date().toISOString(),
            videoId: this.extractYouTubeId(videoUrl),
            thumbnailUrl: frames[0]?.url || null,
            contentRelevant: false
          }
        };
      }

      // Extract key insights for relevant content
      const insights = {
        quality_score: analysis.demo_quality_score || 0,
        content_relevant: analysis.content_relevant !== false,
        scoring_breakdown: analysis.scoring_breakdown || {},
        scoring_reasoning: analysis.scoring_reasoning || 'No detailed reasoning provided',
        key_features: analysis.key_features_demonstrated || [],
        target_audience: analysis.target_audience_alignment || {},
        strengths: analysis.strengths || [],
        improvements: analysis.improvement_opportunities || [],
        focus_areas: analysis.recommended_focus_areas || [],
        timestamps: analysis.key_timestamps || []
      };

      return {
        success: true,
        videoUrl,
        partnerInfo,
        hasTranscript: transcript.hasTranscript,
        frameCount: frames.length,
        analysis,
        insights,
        metadata: {
          analyzedAt: new Date().toISOString(),
          videoId: this.extractYouTubeId(videoUrl),
          thumbnailUrl: frames[0]?.url || null
        }
      };

    } catch (error) {
      console.error('❌ Video analysis error:', error);
      return {
        success: false,
        error: error.message,
        videoUrl,
        partnerInfo
      };
    }
  }

  /**
   * Analyze multiple demo videos for a partner
   */
  async analyzePartnerDemos(partnerId) {
    try {
      // Get partner info
      const partnerResult = await query(
        'SELECT * FROM partners WHERE id = $1',
        [partnerId]
      );

      const partner = partnerResult.rows[0];
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Get demo videos from partner metadata or demo_video_url field
      const demoUrls = [];

      if (partner.demo_video_url) {
        demoUrls.push(partner.demo_video_url);
      }

      // Check for additional videos in metadata
      if (partner.metadata) {
        const metadata = safeJsonParse(partner.metadata, {});
        if (metadata.demo_videos && Array.isArray(metadata.demo_videos)) {
          demoUrls.push(...metadata.demo_videos);
        }
      }

      if (demoUrls.length === 0) {
        return {
          success: false,
          message: 'No demo videos found for this partner',
          partnerId
        };
      }

      // Analyze each video
      const analyses = [];
      for (const url of demoUrls) {
        console.log(`\n📹 Analyzing video: ${url}`);
        const analysis = await this.analyzePartnerDemoVideo(url, {
          company_name: partner.company_name,
          capabilities: safeJsonParse(partner.capabilities, [])
        });
        analyses.push(analysis);
      }

      // Calculate overall demo quality score
      const validAnalyses = analyses.filter(a => a.success);
      const avgQualityScore = validAnalyses.length > 0
        ? validAnalyses.reduce((sum, a) => sum + (a.insights?.quality_score || 0), 0) / validAnalyses.length
        : 0;

      // Compile all focus areas and features
      const allFocusAreas = new Set();
      const allFeatures = [];

      validAnalyses.forEach(analysis => {
        if (analysis.insights?.focus_areas) {
          analysis.insights.focus_areas.forEach(area => allFocusAreas.add(area));
        }
        if (analysis.insights?.key_features) {
          allFeatures.push(...analysis.insights.key_features);
        }
      });

      // Store analysis results in database
      const updateResult = await query(`
        UPDATE partners
        SET
          demo_analysis = $1,
          demo_quality_score = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [
        safeJsonStringify({
          analyses,
          avgQualityScore,
          focusAreas: Array.from(allFocusAreas),
          allFeatures,
          analyzedAt: new Date().toISOString()
        }),
        Math.round(avgQualityScore),
        partnerId
      ]);

      return {
        success: true,
        partnerId,
        partnerName: partner.company_name,
        videosAnalyzed: analyses.length,
        successfulAnalyses: validAnalyses.length,
        avgQualityScore,
        focusAreas: Array.from(allFocusAreas),
        topFeatures: allFeatures.slice(0, 10),
        analyses
      };

    } catch (error) {
      console.error('❌ Partner demo analysis error:', error);
      return {
        success: false,
        error: error.message,
        partnerId
      };
    }
  }

  /**
   * Generate demo improvement recommendations
   */
  async generateDemoRecommendations(analysisResults) {
    try {
      const prompt = `
Based on the video analysis results, provide specific recommendations to improve the partner's demo videos:

Analysis Summary:
- Average Quality Score: ${analysisResults.avgQualityScore}/100
- Videos Analyzed: ${analysisResults.videosAnalyzed}
- Focus Areas Covered: ${analysisResults.focusAreas?.join(', ') || 'None identified'}

Individual Video Insights:
${analysisResults.analyses?.map(a => a.success ? `
Video: ${a.videoUrl}
- Quality Score: ${a.insights?.quality_score || 'N/A'}
- Strengths: ${a.insights?.strengths?.join('; ') || 'None identified'}
- Improvements Needed: ${a.insights?.improvements?.join('; ') || 'None identified'}
` : '').join('\n')}

Please provide:
1. **Top 3 Priority Improvements** (most impactful changes)
2. **Content Recommendations** (what to add/emphasize)
3. **Production Quality Tips** (technical improvements)
4. **Contractor Engagement Strategies** (how to better connect with audience)
5. **Call-to-Action Optimization** (driving conversions)

Format as actionable recommendations with specific examples.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a video marketing expert specializing in B2B software demos for contractors."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      return {
        success: true,
        recommendations: completion.choices[0].message.content,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Recommendation generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate human-readable score explanation
   */
  generateScoreExplanation(analysis) {
    const score = analysis.insights?.quality_score || 0;
    const contentRelevant = analysis.insights?.content_relevant !== false;
    const relevanceIssue = analysis.insights?.relevance_issue;
    const breakdown = analysis.insights?.scoring_breakdown || {};
    const strengths = analysis.insights?.strengths || [];
    const improvements = analysis.insights?.improvements || [];

    let explanation = `## Demo Quality Score: ${score}/100\n\n`;

    // Check content relevance first
    if (!contentRelevant) {
      explanation += `❌ **Content Not Relevant for Business Analysis**\n\n`;
      explanation += `### Issue Detected:\n${relevanceIssue || 'This video does not appear to be business-related content.'}\n\n`;

      explanation += `### Why Score is 0:\n`;
      explanation += `${analysis.insights?.scoring_reasoning || 'Cannot evaluate non-business content using business demo criteria.'}\n\n`;

      explanation += `### What You Need Instead:\n`;
      const recommendations = analysis.insights?.recommendations || [];
      if (recommendations.length > 0) {
        recommendations.forEach(rec => {
          explanation += `• ${rec}\n`;
        });
      } else {
        explanation += `• Upload a proper product demonstration video\n`;
        explanation += `• Use customer testimonial or case study videos\n`;
        explanation += `• Ensure content showcases your business solutions\n`;
      }

      return explanation;
    }

    // Overall assessment for relevant content
    if (score >= 80) {
      explanation += "✅ **Excellent Demo** - This is a high-quality demonstration that effectively showcases value.\n\n";
    } else if (score >= 60) {
      explanation += "⚠️ **Good Demo with Room for Improvement** - Solid foundation but needs refinement.\n\n";
    } else if (score >= 40) {
      explanation += "⚠️ **Fair Demo** - Several areas need significant improvement.\n\n";
    } else {
      explanation += "❌ **Needs Major Work** - This demo requires substantial improvements.\n\n";
    }

    // Scoring breakdown
    explanation += "### Scoring Breakdown:\n";
    if (breakdown.presentation_clarity) {
      explanation += `- **Presentation Clarity**: ${breakdown.presentation_clarity}/20\n`;
    }
    if (breakdown.value_proposition) {
      explanation += `- **Value Proposition**: ${breakdown.value_proposition}/20\n`;
    }
    if (breakdown.technical_quality) {
      explanation += `- **Technical Quality**: ${breakdown.technical_quality}/20\n`;
    }
    if (breakdown.customer_benefits) {
      explanation += `- **Customer Benefits**: ${breakdown.customer_benefits}/20\n`;
    }
    if (breakdown.production_quality) {
      explanation += `- **Production Quality**: ${breakdown.production_quality}/20\n`;
    }

    // Strengths
    if (strengths.length > 0) {
      explanation += "\n### What Works Well:\n";
      strengths.forEach(strength => {
        explanation += `✅ ${strength}\n`;
      });
    }

    // Areas for improvement
    if (improvements.length > 0) {
      explanation += "\n### Areas for Improvement:\n";
      improvements.forEach(improvement => {
        explanation += `📈 ${improvement}\n`;
      });
    }

    // Reasoning
    if (analysis.insights?.scoring_reasoning) {
      explanation += `\n### Detailed Reasoning:\n${analysis.insights.scoring_reasoning}\n`;
    }

    return explanation;
  }

  /**
   * Compare partner demos for competitive analysis
   */
  async comparePartnerDemos(partnerIds) {
    try {
      const comparisons = [];

      for (const partnerId of partnerIds) {
        const analysis = await this.analyzePartnerDemos(partnerId);
        if (analysis.success) {
          comparisons.push({
            partnerId,
            partnerName: analysis.partnerName,
            qualityScore: analysis.avgQualityScore,
            focusAreas: analysis.focusAreas,
            videosAnalyzed: analysis.videosAnalyzed
          });
        }
      }

      // Sort by quality score
      comparisons.sort((a, b) => b.qualityScore - a.qualityScore);

      return {
        success: true,
        comparisons,
        topPerformer: comparisons[0],
        averageScore: comparisons.reduce((sum, c) => sum + c.qualityScore, 0) / comparisons.length
      };

    } catch (error) {
      console.error('❌ Demo comparison error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = VideoAnalysisService;