/**
 * Centralized config for P100 article migration scripts.
 * Override via environment variables in .env or shell.
 */
const path = require('path');

module.exports = {
  // Old site (READ only via REST API)
  OLD_SITE: {
    BASE: process.env.OLD_SITE_BASE || 'https://power100.io',
    AUTH: process.env.OLD_SITE_AUTH || 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X',
    REST_PREFIX: '/wp-json/wp/v2',
  },

  // New site (WRITE via SSH + wp-cli; READ via REST or wp-cli)
  NEW_SITE: {
    BASE: process.env.NEW_SITE_BASE || 'http://power100.gikrtuqjdl-qp3v91no7450.p.temp-site.link',
    SSH: process.env.NEW_SITE_SSH || 'runcloud@155.138.198.250',
    WP_PATH: process.env.NEW_SITE_WP_PATH || '/home/runcloud/webapps/power100',
    UPLOADS_PATH: process.env.NEW_SITE_UPLOADS || '/home/runcloud/webapps/power100/wp-content/uploads',
  },

  // Rankings DB (for fetching pillar/service data when building categories)
  RANKINGS: {
    AWS_EXEC_AVAILABLE: true,  // Use mcp__aws-production__exec when running through Claude Code
  },

  // Local state tracking
  STATE: {
    DIR: path.join(__dirname, 'state'),
    MEDIA_PROGRESS: path.join(__dirname, 'state', 'media-progress.json'),
    ARTICLE_PROGRESS: path.join(__dirname, 'state', 'article-progress.json'),
    CATEGORY_MAP: path.join(__dirname, 'state', 'category-map.json'),
  },

  // Migration constraints (from feedback memories)
  RULES: {
    PRESERVE_SLUG_VERBATIM: true,    // Never let WP auto-sanitize the slug
    PRESERVE_POST_DATE: true,         // post_date AND post_date_gmt from source
    PRESERVE_IMAGE_URLS: true,        // /wp-content/uploads/YYYY/MM/file.jpg byte-for-byte
    IDEMPOTENCY_META_KEY: '_p100_old_post_id',
    SKIP_HELLO_WORLD: true,           // Always skip post id 1 on new site
  },

  // Category hierarchy — locked direction (Option C, see project_p100_article_migration.md)
  CATEGORIES: {
    // Top-level industry pillars (post-restructure: Partners + Manufacturers replace Design Build + Commercial)
    PILLARS: [
      { name: 'Home Improvement', slug: 'home-improvement', description: 'Home renovation and exterior services for residential properties' },
      { name: 'Home Services', slug: 'home-services', description: 'Mechanical, electrical, plumbing, and home systems services' },
      { name: 'Outdoor Living', slug: 'outdoor-living', description: 'Outdoor spaces, landscaping, hardscapes, and recreational features' },
      { name: 'Partners', slug: 'partners', description: 'Strategic partner companies serving the home services market (software, services, consulting, training)' },
      { name: 'Manufacturers', slug: 'manufacturers', description: 'Product manufacturers serving the home services market' },
    ],
    // Tag taxonomies (cross-cutting)
    THEMES: ['Leadership', 'Identity', 'Legacy'],
    FUNCTIONS: ['Growth', 'Community', 'Culture', 'Customer Experience', 'Innovation', 'Marketing', 'Operations', 'Sales'],
    CONTENT_TYPES: ['Power100', 'Expert Contributor', 'PowerChat', 'Feature Interview', 'Industry News', 'Press Release'],
  },

  // Performance / safety knobs
  LIMITS: {
    REST_PAGE_SIZE: 100,              // Max page size for REST list endpoints
    DOWNLOAD_CONCURRENCY: 4,          // Parallel HTTPS downloads in Phase B
    REQUEST_DELAY_MS: 100,            // Delay between API calls (be polite)
    SSH_TIMEOUT_MS: 30000,            // Per-SSH-command timeout
    MAX_RETRIES: 3,                   // Retry failed downloads
  },
};
