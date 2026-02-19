// DATABASE-CHECKED: video_content columns verified on 2026-02-18
// ================================================================
// YouTube Metadata Service
// ================================================================
// Purpose: Fetch video metadata from YouTube Data API v3
//          Used by content ingestion pipeline to extract title, duration,
//          thumbnail, description, and publish date from YouTube URLs.
// Requires: YOUTUBE_API_KEY env var (Google Cloud Console, free tier)
// ================================================================

const axios = require('axios');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
function extractVideoId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Parse ISO 8601 duration (PT1H23M45S) to seconds and formatted string
 * @param {string} isoDuration - ISO 8601 duration string from YouTube API
 * @returns {{ seconds: number, formatted: string }}
 */
function parseIsoDuration(isoDuration) {
  if (!isoDuration) return { seconds: 0, formatted: '0:00' };

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { seconds: 0, formatted: '0:00' };

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const secs = parseInt(match[3] || '0');

  const totalSeconds = hours * 3600 + minutes * 60 + secs;

  let formatted;
  if (hours > 0) {
    formatted = `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    formatted = `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  return { seconds: totalSeconds, formatted };
}

/**
 * Fetch metadata for a YouTube video
 * @param {string} videoId - YouTube video ID (11 chars)
 * @returns {Promise<object>} Video metadata
 */
async function fetchYouTubeMetadata(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set. Get one from Google Cloud Console.');
  }

  if (!videoId || videoId.length !== 11) {
    throw new Error(`Invalid YouTube video ID: ${videoId}`);
  }

  console.log(`[YouTube Metadata] Fetching metadata for video: ${videoId}`);

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: apiKey
      },
      timeout: 10000
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics || {};

    const duration = parseIsoDuration(contentDetails.duration);

    // Pick the best available thumbnail
    const thumbnails = snippet.thumbnails;
    const thumbnailUrl = (
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      null
    );

    const metadata = {
      videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnailUrl,
      publishDate: snippet.publishedAt,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      durationSeconds: duration.seconds,
      durationFormatted: duration.formatted,
      tags: snippet.tags || [],
      viewCount: parseInt(statistics.viewCount || '0'),
      likeCount: parseInt(statistics.likeCount || '0')
    };

    console.log(`[YouTube Metadata] Fetched: "${metadata.title}" (${metadata.durationFormatted})`);
    return metadata;

  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('YouTube API quota exceeded or API key invalid. Check YOUTUBE_API_KEY.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Video not found on YouTube: ${videoId}`);
    }
    throw error;
  }
}

/**
 * Fetch metadata for a YouTube video from its URL
 * @param {string} youtubeUrl - Full YouTube URL
 * @returns {Promise<object>} Video metadata
 */
async function fetchMetadataFromUrl(youtubeUrl) {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error(`Could not extract video ID from URL: ${youtubeUrl}`);
  }
  return fetchYouTubeMetadata(videoId);
}

/**
 * Fetch metadata for multiple videos in a single API call (batch)
 * @param {string[]} videoIds - Array of YouTube video IDs
 * @returns {Promise<object[]>} Array of video metadata
 */
async function fetchBatchMetadata(videoIds) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set.');
  }

  if (!videoIds || videoIds.length === 0) return [];

  // YouTube API allows up to 50 IDs per request
  const batches = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const allResults = [];

  for (const batch of batches) {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: batch.join(','),
        key: apiKey
      },
      timeout: 15000
    });

    for (const video of (response.data.items || [])) {
      const snippet = video.snippet;
      const duration = parseIsoDuration(video.contentDetails.duration);
      const thumbnails = snippet.thumbnails;

      allResults.push({
        videoId: video.id,
        title: snippet.title,
        description: snippet.description,
        thumbnailUrl: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || null,
        publishDate: snippet.publishedAt,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        durationSeconds: duration.seconds,
        durationFormatted: duration.formatted,
        tags: snippet.tags || [],
        viewCount: parseInt((video.statistics || {}).viewCount || '0'),
        likeCount: parseInt((video.statistics || {}).likeCount || '0')
      });
    }
  }

  console.log(`[YouTube Metadata] Batch fetched ${allResults.length}/${videoIds.length} videos`);
  return allResults;
}

/**
 * Fetch all video IDs from a YouTube playlist
 * Used by n8n playlist poller workflow to detect new videos
 * @param {string} playlistId - YouTube playlist ID
 * @param {number} maxResults - Max items to fetch (default: 50)
 * @returns {Promise<object[]>} Array of { videoId, title, publishDate, position }
 */
async function fetchPlaylistItems(playlistId, maxResults = 50) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set.');
  }

  console.log(`[YouTube Metadata] Fetching playlist: ${playlistId}`);

  const items = [];
  let pageToken = null;

  do {
    const params = {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: Math.min(maxResults - items.length, 50),
      key: apiKey
    };
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
      params,
      timeout: 15000
    });

    for (const item of (response.data.items || [])) {
      items.push({
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishDate: item.snippet.publishedAt,
        position: item.snippet.position,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || null
      });
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken && items.length < maxResults);

  console.log(`[YouTube Metadata] Playlist ${playlistId}: found ${items.length} items`);
  return items;
}

module.exports = {
  extractVideoId,
  parseIsoDuration,
  fetchYouTubeMetadata,
  fetchMetadataFromUrl,
  fetchBatchMetadata,
  fetchPlaylistItems
};
