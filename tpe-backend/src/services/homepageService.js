// DATABASE-CHECKED: video_content, member_watch_history, shows, power_moves, inner_circle_members verified 2026-03-01
// ================================================================
// Inner Circle Homepage Service
// ================================================================
// Provides data for the Netflix-style homepage: hero, continue watching,
// new this week, trending, show rows, and personalized recommendations.
// ================================================================

const { query } = require('../config/database');

const homepageService = {

  /**
   * Get hero/featured content for the homepage banner
   * Returns the most recent high-engagement video or editorially picked content
   */
  async getHeroContent() {
    const result = await query(`
      SELECT vc.id, vc.title, vc.description, vc.thumbnail_url, vc.file_url,
             vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
             vc.show_id, s.name as show_name, s.slug as show_slug,
             vc.featured_names, vc.episode_number
      FROM video_content vc
      LEFT JOIN shows s ON vc.show_id = s.id
      WHERE vc.is_active = true
        AND vc.duration_seconds > 120
      ORDER BY vc.upload_date DESC
      LIMIT 1
    `);
    return result.rows[0] || null;
  },

  /**
   * Get "Continue Watching" row for a specific member
   * Videos they started but haven't finished (watch_progress < 95%)
   */
  async getContinueWatching(memberId, limit = 12) {
    const result = await query(`
      SELECT mwh.content_id, mwh.watch_progress, mwh.total_watch_time_seconds,
             mwh.watch_count, mwh.last_watched_at,
             vc.title, vc.thumbnail_url, vc.file_url, vc.duration_seconds,
             vc.ai_summary, vc.show_id, vc.episode_number,
             s.name as show_name, s.slug as show_slug
      FROM member_watch_history mwh
      JOIN video_content vc ON mwh.content_id = vc.id
      LEFT JOIN shows s ON vc.show_id = s.id
      WHERE mwh.member_id = $1
        AND mwh.completed = false
        AND mwh.watch_progress > 0
        AND vc.is_active = true
      ORDER BY mwh.last_watched_at DESC
      LIMIT $2
    `, [memberId, limit]);
    return result.rows;
  },

  /**
   * Get "New This Week" row — content published in the last 7 days
   */
  async getNewThisWeek(limit = 12) {
    const result = await query(`
      SELECT vc.id, vc.title, vc.thumbnail_url, vc.file_url,
             vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
             vc.show_id, vc.episode_number, vc.featured_names,
             s.name as show_name, s.slug as show_slug
      FROM video_content vc
      LEFT JOIN shows s ON vc.show_id = s.id
      WHERE vc.is_active = true
        AND vc.upload_date >= NOW() - INTERVAL '7 days'
      ORDER BY vc.upload_date DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  /**
   * Get "Trending on Inner Circle" — most watched in last 7 days
   * Aggregates watch counts across all members
   */
  async getTrending(limit = 12) {
    const result = await query(`
      SELECT vc.id, vc.title, vc.thumbnail_url, vc.file_url,
             vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
             vc.show_id, vc.episode_number, vc.featured_names,
             s.name as show_name, s.slug as show_slug,
             COUNT(DISTINCT mwh.member_id) as unique_viewers,
             SUM(mwh.watch_count) as total_views
      FROM video_content vc
      LEFT JOIN shows s ON vc.show_id = s.id
      JOIN member_watch_history mwh ON mwh.content_id = vc.id
      WHERE vc.is_active = true
        AND mwh.last_watched_at >= NOW() - INTERVAL '7 days'
      GROUP BY vc.id, vc.title, vc.thumbnail_url, vc.file_url,
               vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
               vc.show_id, vc.episode_number, vc.featured_names,
               s.name, s.slug
      ORDER BY unique_viewers DESC, total_views DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  /**
   * Get content for a specific show row
   */
  async getShowContent(showSlug, limit = 12) {
    const result = await query(`
      SELECT vc.id, vc.title, vc.thumbnail_url, vc.file_url,
             vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
             vc.show_id, vc.episode_number, vc.featured_names,
             s.name as show_name, s.slug as show_slug
      FROM video_content vc
      JOIN shows s ON vc.show_id = s.id
      WHERE s.slug = $1
        AND vc.is_active = true
      ORDER BY vc.upload_date DESC
      LIMIT $2
    `, [showSlug, limit]);
    return result.rows;
  },

  /**
   * Get all shows that have content (for building show rows)
   */
  async getShowsWithContent() {
    const result = await query(`
      SELECT s.id, s.name, s.slug, s.hosts, s.format,
             COUNT(vc.id) as video_count,
             MAX(vc.upload_date) as latest_upload
      FROM shows s
      JOIN video_content vc ON vc.show_id = s.id AND vc.is_active = true
      GROUP BY s.id, s.name, s.slug, s.hosts, s.format
      HAVING COUNT(vc.id) > 0
      ORDER BY MAX(vc.upload_date) DESC
    `);
    return result.rows;
  },

  /**
   * Get "Recommended For You" — personalized based on watch history topics
   * Finds videos matching topics the member has watched, excluding already-watched
   */
  async getRecommended(memberId, limit = 12) {
    // Get topics from member's watched content
    const watchedTopics = await query(`
      SELECT DISTINCT jsonb_array_elements_text(vc.ai_key_topics) as topic
      FROM member_watch_history mwh
      JOIN video_content vc ON mwh.content_id = vc.id
      WHERE mwh.member_id = $1
        AND vc.ai_key_topics IS NOT NULL
      LIMIT 20
    `, [memberId]);

    if (watchedTopics.rows.length === 0) {
      // Fallback: return highest-rated content they haven't watched
      const fallback = await query(`
        SELECT vc.id, vc.title, vc.thumbnail_url, vc.file_url,
               vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
               vc.show_id, vc.episode_number, vc.featured_names,
               s.name as show_name, s.slug as show_slug
        FROM video_content vc
        LEFT JOIN shows s ON vc.show_id = s.id
        WHERE vc.is_active = true
          AND vc.id NOT IN (
            SELECT content_id FROM member_watch_history WHERE member_id = $1
          )
        ORDER BY vc.ai_engagement_score DESC NULLS LAST, vc.upload_date DESC
        LIMIT $2
      `, [memberId, limit]);
      return fallback.rows;
    }

    const topics = watchedTopics.rows.map(r => r.topic);

    // Find videos matching those topics, excluding already watched
    const result = await query(`
      SELECT DISTINCT vc.id, vc.title, vc.thumbnail_url, vc.file_url,
             vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
             vc.show_id, vc.episode_number, vc.featured_names,
             s.name as show_name, s.slug as show_slug
      FROM video_content vc
      LEFT JOIN shows s ON vc.show_id = s.id
      WHERE vc.is_active = true
        AND vc.ai_key_topics IS NOT NULL
        AND vc.id NOT IN (
          SELECT content_id FROM member_watch_history WHERE member_id = $1
        )
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(vc.ai_key_topics) t
          WHERE t = ANY($2::text[])
        )
      ORDER BY vc.upload_date DESC
      LIMIT $3
    `, [memberId, topics, limit]);
    return result.rows;
  },

  /**
   * Get "Because You Watched X" — content related to a specific video
   * Based on shared ai_key_topics
   */
  async getBecauseYouWatched(memberId, limit = 12) {
    // Get most recently completed video
    const lastWatched = await query(`
      SELECT mwh.content_id, vc.title, vc.ai_key_topics, vc.show_id
      FROM member_watch_history mwh
      JOIN video_content vc ON mwh.content_id = vc.id
      WHERE mwh.member_id = $1
        AND vc.ai_key_topics IS NOT NULL
      ORDER BY mwh.last_watched_at DESC
      LIMIT 1
    `, [memberId]);

    if (lastWatched.rows.length === 0) return { source: null, items: [] };

    const source = lastWatched.rows[0];
    const topics = typeof source.ai_key_topics === 'string'
      ? JSON.parse(source.ai_key_topics)
      : source.ai_key_topics;

    if (!topics || topics.length === 0) return { source, items: [] };

    const result = await query(`
      SELECT vc.id, vc.title, vc.thumbnail_url, vc.file_url,
             vc.duration_seconds, vc.upload_date, vc.ai_summary, vc.ai_key_topics,
             vc.show_id, vc.episode_number, vc.featured_names,
             s.name as show_name, s.slug as show_slug
      FROM video_content vc
      LEFT JOIN shows s ON vc.show_id = s.id
      WHERE vc.is_active = true
        AND vc.id != $1
        AND vc.ai_key_topics IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(vc.ai_key_topics) t
          WHERE t = ANY($2::text[])
        )
      ORDER BY vc.upload_date DESC
      LIMIT $3
    `, [source.content_id, topics, limit]);

    return { source: { id: source.content_id, title: source.title }, items: result.rows };
  },

  /**
   * Get the full homepage feed for a member — all sections in one call
   */
  async getHomepageFeed(memberId) {
    const [
      hero,
      continueWatching,
      newThisWeek,
      trending,
      recommended,
      becauseYouWatched,
      showsWithContent
    ] = await Promise.all([
      this.getHeroContent(),
      this.getContinueWatching(memberId),
      this.getNewThisWeek(),
      this.getTrending(),
      this.getRecommended(memberId),
      this.getBecauseYouWatched(memberId),
      this.getShowsWithContent()
    ]);

    // Build rows array — only include sections that have content
    const rows = [];

    if (continueWatching.length > 0) {
      rows.push({ type: 'continue_watching', title: 'Continue Watching', items: continueWatching });
    }
    if (newThisWeek.length > 0) {
      rows.push({ type: 'new_this_week', title: 'New This Week', items: newThisWeek });
    }
    if (trending.length > 0) {
      rows.push({ type: 'trending', title: 'Trending on Inner Circle', items: trending });
    }
    if (recommended.length > 0) {
      rows.push({ type: 'recommended', title: 'Recommended For You', items: recommended });
    }
    if (becauseYouWatched.items && becauseYouWatched.items.length > 0) {
      rows.push({
        type: 'because_you_watched',
        title: `Because You Watched "${becauseYouWatched.source.title}"`,
        source_video: becauseYouWatched.source,
        items: becauseYouWatched.items
      });
    }

    // Add show-specific rows
    for (const show of showsWithContent) {
      const showContent = await this.getShowContent(show.slug);
      if (showContent.length > 0) {
        rows.push({
          type: 'show',
          title: show.name,
          show_slug: show.slug,
          show_hosts: show.hosts,
          video_count: parseInt(show.video_count),
          items: showContent
        });
      }
    }

    return {
      hero,
      rows,
      shows_available: showsWithContent
    };
  }
};

module.exports = homepageService;
