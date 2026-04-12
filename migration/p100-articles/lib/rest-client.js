/**
 * REST API client for the OLD power100.io WordPress site.
 * Read-only — uses Basic auth.
 *
 * Built on Node 18+ built-in fetch (no external deps).
 */
const config = require('../config');

class RestClient {
  constructor({ base, auth, prefix } = {}) {
    this.base = base || config.OLD_SITE.BASE;
    this.auth = auth || config.OLD_SITE.AUTH;
    this.prefix = prefix || config.OLD_SITE.REST_PREFIX;
  }

  /**
   * Low-level GET. Returns parsed JSON.
   * Handles retries on transient failures.
   */
  async get(path, { retries = config.LIMITS.MAX_RETRIES } = {}) {
    const url = `${this.base}${this.prefix}${path}`;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const resp = await fetch(url, {
          headers: { Authorization: this.auth },
        });

        if (!resp.ok) {
          // 404 is meaningful (resource doesn't exist) — return null, don't retry
          if (resp.status === 404) return null;
          // 401/403 = auth issue, don't retry
          if (resp.status === 401 || resp.status === 403) {
            throw new Error(`Auth failed (${resp.status}) on ${url}`);
          }
          // Otherwise treat as transient
          throw new Error(`HTTP ${resp.status} on ${url}`);
        }

        return {
          data: await resp.json(),
          totalPages: parseInt(resp.headers.get('X-WP-TotalPages') || '1', 10),
          totalItems: parseInt(resp.headers.get('X-WP-Total') || '0', 10),
        };
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await sleep(500 * (attempt + 1));  // backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Paginated iterator over a list endpoint.
   * Yields items one at a time.
   *
   * Usage:
   *   for await (const item of client.iterate('/posts', { fields: 'id,slug,title' })) {
   *     ...
   *   }
   */
  async *iterate(endpoint, { fields, perPage, query = {}, onPage } = {}) {
    perPage = perPage || config.LIMITS.REST_PAGE_SIZE;
    let page = 1;
    let totalPages = 1;
    let totalItems = null;

    while (page <= totalPages) {
      const params = new URLSearchParams({
        per_page: String(perPage),
        page: String(page),
        ...query,
      });
      if (fields) params.set('_fields', fields);

      const result = await this.get(`${endpoint}?${params.toString()}`);
      if (!result) break;

      if (totalItems === null) {
        totalItems = result.totalItems;
        totalPages = result.totalPages;
      }
      if (onPage) onPage({ page, totalPages, totalItems, items: result.data.length });

      for (const item of result.data) {
        yield item;
      }

      page += 1;
      // Be polite — rate limit between page fetches
      await sleep(config.LIMITS.REQUEST_DELAY_MS);
    }
  }

  /**
   * Get total count of items at a list endpoint without iterating.
   * Cheap — only fetches page 1 with per_page=1.
   */
  async count(endpoint, { query = {} } = {}) {
    const params = new URLSearchParams({ per_page: '1', page: '1', ...query });
    const result = await this.get(`${endpoint}?${params.toString()}`);
    if (!result) return 0;
    return result.totalItems;
  }

  /**
   * Get a single item by ID.
   * Returns null if not found.
   */
  async getById(endpoint, id, { fields } = {}) {
    const params = new URLSearchParams();
    if (fields) params.set('_fields', fields);
    const qs = params.toString();
    const result = await this.get(`${endpoint}/${id}${qs ? '?' + qs : ''}`);
    return result ? result.data : null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { RestClient };
