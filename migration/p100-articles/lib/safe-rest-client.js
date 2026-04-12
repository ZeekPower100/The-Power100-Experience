/**
 * Safe REST client wrapper — for fetching from the OLD power100.io site
 * via residential IP without triggering Cloudflare bot management.
 *
 * Defense layers:
 *   1. Polite pacing — configurable delay between every request (default 3 sec)
 *   2. Real Chrome browser User-Agent + matching browser headers
 *   3. Save-after-each — caller writes to disk between calls
 *   4. Hard-stop on ANY non-success response — never burn requests blindly
 *   5. Optional max-requests cap as a circuit breaker
 *
 * Use this for ALL fetches from power100.io. NEVER use the regular RestClient
 * directly from a residential IP for bulk work.
 */
const config = require('../config');

const DEFAULT_DELAY_MS  = 3000;   // 3 sec between requests — human-like
const MAX_REQUESTS_HARD = 1000;   // Circuit breaker — abort if exceeded in one run
const STOP_ON_FIRST_ERROR = true; // Bail immediately on any non-success response

class SafeRestClient {
  constructor({
    base = config.OLD_SITE.BASE,
    auth = config.OLD_SITE.AUTH,
    prefix = config.OLD_SITE.REST_PREFIX,
    delayMs = DEFAULT_DELAY_MS,
    maxRequests = MAX_REQUESTS_HARD,
  } = {}) {
    this.base = base;
    this.auth = auth;
    this.prefix = prefix;
    this.delayMs = delayMs;
    this.maxRequests = maxRequests;
    this.requestCount = 0;
    this.lastRequestAt = 0;
  }

  /**
   * Polite GET — paces requests, uses browser headers, hard-stops on any error.
   * Returns { data, totalPages, totalItems } on success.
   * Throws on ANY non-2xx response (including 403/429/503 — the bot-block signals).
   */
  async get(endpoint, query = {}) {
    if (this.requestCount >= this.maxRequests) {
      throw new Error(`SAFETY: hit ${this.maxRequests} request cap. Aborting to protect IP reputation.`);
    }

    // Pace requests
    const now = Date.now();
    const sinceLast = now - this.lastRequestAt;
    if (this.lastRequestAt > 0 && sinceLast < this.delayMs) {
      await sleep(this.delayMs - sinceLast);
    }
    this.lastRequestAt = Date.now();
    this.requestCount += 1;

    const params = new URLSearchParams(query);
    const url = `${this.base}${this.prefix}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;

    // Real Chrome headers
    const headers = {
      'Authorization': this.auth,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    };

    let resp;
    try {
      resp = await fetch(url, { headers });
    } catch (err) {
      throw new Error(`Network error on ${url}: ${err.message}`);
    }

    if (!resp.ok) {
      // ANY non-success — bail HARD. Do not continue, do not retry.
      // 403 = Cloudflare block, 429 = rate limit, 503 = challenge page
      const body = await resp.text().catch(() => '');
      throw new Error(
        `🛑 SAFETY HALT: HTTP ${resp.status} on request #${this.requestCount}\n` +
        `URL: ${url}\n` +
        `This is likely a Cloudflare bot challenge or rate limit. Stopping immediately.\n` +
        `Body preview: ${body.slice(0, 200)}`
      );
    }

    const data = await resp.json();
    return {
      data,
      totalPages: parseInt(resp.headers.get('X-WP-TotalPages') || '1', 10),
      totalItems: parseInt(resp.headers.get('X-WP-Total') || '0', 10),
    };
  }

  /**
   * Stats accessor — caller can check requestCount/maxRequests at any time
   */
  stats() {
    return {
      requests_made: this.requestCount,
      requests_remaining: this.maxRequests - this.requestCount,
      pacing_delay_ms: this.delayMs,
    };
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { SafeRestClient };
