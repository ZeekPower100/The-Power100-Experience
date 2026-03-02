// DATABASE-CHECKED: articles columns verified on 2026-03-01
// ================================================================
// Article Sync Service
// ================================================================
// Pulls articles from power100.io WordPress REST API and upserts
// them into the local articles table. Uses ai_ prefix fields so
// the AI concierge auto-discovers article knowledge.
//
// Sync modes:
//   - full: Pull all articles (initial seed or re-sync)
//   - incremental: Pull only articles modified after last sync
//
// AI enrichment runs after sync via GPT-4o-mini on articles
// that have ai_processing_status = 'pending'.
// ================================================================

const axios = require('axios');
const OpenAI = require('openai');
const { query } = require('../config/database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WP_API_BASE = 'https://power100.io/wp-json/wp/v2';
const PER_PAGE = 50;

const articleSyncService = {

  /**
   * Sync articles from power100.io
   * @param {object} options
   * @param {'full'|'incremental'} options.mode - full or incremental
   * @param {boolean} options.enrich - run AI enrichment after sync (default true)
   * @returns {Promise<object>} Sync results
   */
  async syncArticles({ mode = 'incremental', enrich = true } = {}) {
    console.log(`[Article Sync] Starting ${mode} sync from power100.io...`);

    let totalSynced = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let page = 1;
    let hasMore = true;

    // For incremental, find the most recent wp_modified in our DB
    let lastModified = null;
    if (mode === 'incremental') {
      const result = await query('SELECT MAX(wp_modified) as last_mod FROM articles');
      lastModified = result.rows[0]?.last_mod;
      if (lastModified) {
        console.log(`[Article Sync] Incremental from: ${lastModified}`);
      } else {
        console.log('[Article Sync] No existing articles — falling back to full sync');
        mode = 'full';
      }
    }

    while (hasMore) {
      try {
        let url = `${WP_API_BASE}/posts?per_page=${PER_PAGE}&page=${page}&_fields=id,title,link,slug,date,modified,excerpt,content,author,categories,tags,featured_media&orderby=modified&order=desc`;

        if (mode === 'incremental' && lastModified) {
          url += `&modified_after=${new Date(lastModified).toISOString()}`;
        }

        const response = await axios.get(url, { timeout: 15000 });
        const posts = response.data;

        if (!posts || posts.length === 0) {
          hasMore = false;
          break;
        }

        // Upsert each article
        for (const post of posts) {
          const result = await this.upsertArticle(post);
          totalSynced++;
          if (result === 'inserted') totalNew++;
          else if (result === 'updated') totalUpdated++;
        }

        console.log(`[Article Sync] Page ${page}: ${posts.length} articles processed`);

        // Check if there are more pages
        const totalPages = parseInt(response.headers['x-wp-totalpages'] || 1);
        if (page >= totalPages) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (error) {
        if (error.response?.status === 400 && page > 1) {
          // WP returns 400 when page exceeds total — we're done
          hasMore = false;
        } else {
          console.error(`[Article Sync] Error on page ${page}:`, error.message);
          hasMore = false;
        }
      }
    }

    console.log(`[Article Sync] Sync complete: ${totalNew} new, ${totalUpdated} updated, ${totalSynced} total`);

    // Run AI enrichment on pending articles
    let enriched = 0;
    if (enrich) {
      enriched = await this.enrichPendingArticles();
    }

    return {
      mode,
      total_synced: totalSynced,
      new_articles: totalNew,
      updated_articles: totalUpdated,
      ai_enriched: enriched
    };
  },

  /**
   * Upsert a single WP post into the articles table
   */
  async upsertArticle(post) {
    // Strip HTML tags from excerpt and content for clean text
    const cleanExcerpt = (post.excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim();
    const cleanContent = (post.content?.rendered || '').replace(/<[^>]+>/g, '').trim();

    const result = await query(`
      INSERT INTO articles (wp_post_id, title, slug, url, excerpt, content, author, wp_date, wp_modified, categories, tags, last_synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (wp_post_id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        url = EXCLUDED.url,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        wp_modified = EXCLUDED.wp_modified,
        categories = EXCLUDED.categories,
        tags = EXCLUDED.tags,
        last_synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) AS is_new
    `, [
      post.id,
      post.title?.rendered || '',
      post.slug || '',
      post.link || '',
      cleanExcerpt,
      cleanContent,
      String(post.author || ''),
      post.date || null,
      post.modified || null,
      JSON.stringify(post.categories || []),
      JSON.stringify(post.tags || [])
    ]);

    return result.rows[0]?.is_new ? 'inserted' : 'updated';
  },

  /**
   * AI-enrich articles that haven't been processed yet
   * Uses GPT-4o-mini for cost efficiency
   */
  async enrichPendingArticles(limit = 20) {
    const pending = await query(`
      SELECT id, title, excerpt, content
      FROM articles
      WHERE ai_processing_status = 'pending' AND content IS NOT NULL AND content != ''
      ORDER BY wp_date DESC
      LIMIT $1
    `, [limit]);

    if (pending.rows.length === 0) {
      console.log('[Article Sync] No pending articles to enrich');
      return 0;
    }

    console.log(`[Article Sync] Enriching ${pending.rows.length} articles with GPT-4o-mini...`);
    let enriched = 0;

    for (const article of pending.rows) {
      try {
        // Truncate content to keep tokens low
        const contentSnippet = (article.content || '').substring(0, 3000);

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a content analyst for The Power 100 Experience, a platform for home improvement contractors. Analyze this article and return JSON with: summary (2-3 sentences), key_topics (array of 3-6 topic strings), tags (array of 3-8 tag strings), target_audience (one sentence describing who should read this). Return ONLY valid JSON, no markdown.'
            },
            {
              role: 'user',
              content: `Title: ${article.title}\n\nExcerpt: ${article.excerpt}\n\nContent: ${contentSnippet}`
            }
          ],
          max_tokens: 300,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });

        const enrichment = JSON.parse(response.choices[0].message.content);

        await query(`
          UPDATE articles SET
            ai_summary = $2,
            ai_key_topics = $3,
            ai_tags = $4,
            ai_target_audience = $5,
            ai_processing_status = 'enriched',
            updated_at = NOW()
          WHERE id = $1
        `, [
          article.id,
          enrichment.summary || '',
          JSON.stringify(enrichment.key_topics || []),
          JSON.stringify(enrichment.tags || []),
          enrichment.target_audience || ''
        ]);

        enriched++;
      } catch (error) {
        console.error(`[Article Sync] Failed to enrich article ${article.id}:`, error.message);
        await query(
          "UPDATE articles SET ai_processing_status = 'failed', updated_at = NOW() WHERE id = $1",
          [article.id]
        );
      }
    }

    console.log(`[Article Sync] Enrichment complete: ${enriched}/${pending.rows.length}`);
    return enriched;
  },

  /**
   * Search articles by keyword (for concierge)
   */
  async searchArticles(searchTerm, limit = 10) {
    const result = await query(`
      SELECT id, title, url, excerpt, ai_summary, ai_key_topics, ai_tags, wp_date
      FROM articles
      WHERE is_active = true
        AND (
          title ILIKE $1
          OR ai_summary ILIKE $1
          OR content ILIKE $1
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(ai_key_topics, '[]')) t
            WHERE t ILIKE $1
          )
        )
      ORDER BY wp_date DESC
      LIMIT $2
    `, [`%${searchTerm}%`, limit]);

    return result.rows;
  },

  /**
   * Get article count and sync status
   */
  async getStatus() {
    const result = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN ai_processing_status = 'enriched' THEN 1 END) as enriched,
        COUNT(CASE WHEN ai_processing_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN ai_processing_status = 'failed' THEN 1 END) as failed,
        MAX(last_synced_at) as last_sync
      FROM articles
    `);
    return result.rows[0];
  }
};

module.exports = articleSyncService;
