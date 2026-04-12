/**
 * WP CLI runner for the NEW P100 site via SSH.
 *
 * All write operations to the new site go through this — never use REST API
 * for create operations on the new site (returns 401, see feedback memory).
 */
const { execFileSync } = require('child_process');
const config = require('../config');

// LOCAL_MODE=1 means we're already running ON the target server.
// Execute commands directly via bash instead of SSH-to-self.
const LOCAL_MODE = process.env.LOCAL_MODE === '1' || process.env.LOCAL_MODE === 'true';

class WpCli {
  constructor({ ssh, wpPath, timeout } = {}) {
    this.ssh = ssh || config.NEW_SITE.SSH;
    this.wpPath = wpPath || config.NEW_SITE.WP_PATH;
    this.timeout = timeout || config.LIMITS.SSH_TIMEOUT_MS;
  }

  /**
   * Run a wp-cli command on the new site.
   * Returns trimmed stdout.
   * Throws on non-zero exit.
   *
   * @param {string} subcommand - everything after `wp ` (e.g., 'post create --post_type=post ...')
   * @param {object} opts
   * @param {boolean} opts.json - if true, pass --format=json and parse the output
   * @param {boolean} opts.allowFailure - if true, return null on failure instead of throwing
   */
  run(subcommand, { json = false, allowFailure = false } = {}) {
    const remoteCmd = `cd ${this.wpPath} && wp ${subcommand}`;
    try {
      let stdout;
      if (LOCAL_MODE) {
        // Direct bash execution via stdin (no SSH)
        stdout = execFileSync('bash', [], {
          input: remoteCmd,
          timeout: this.timeout,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } else {
        // Pass remote command as a single argv element to ssh (Windows-safe)
        stdout = execFileSync('ssh', [
          '-o', 'BatchMode=yes',
          this.ssh,
          remoteCmd,
        ], {
          timeout: this.timeout,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      }
      const trimmed = stdout.trimEnd();
      if (json && trimmed) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          throw new Error(`Failed to parse wp-cli JSON output: ${e.message}\nOutput: ${trimmed.slice(0, 500)}`);
        }
      }
      return trimmed;
    } catch (err) {
      if (allowFailure) return null;
      const stderr = err.stderr ? err.stderr.toString() : '';
      throw new Error(`wp-cli failed: wp ${subcommand}\n${stderr || err.message}`);
    }
  }

  /**
   * Direct SSH command (not wp-cli).
   * Use for things like `cat`, `mkdir`, `php` scripts, etc.
   */
  ssh_exec(remoteCmd, { timeout, allowFailure = false } = {}) {
    try {
      if (LOCAL_MODE) {
        // Direct bash execution — no SSH at all
        return execFileSync('bash', [], {
          input: remoteCmd,
          timeout: timeout || this.timeout,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trimEnd();
      }
      // Remote SSH path: pipe the command via stdin (`bash -s`) instead of passing as argv.
      // Avoids the Windows ~8KB command-line length limit and is universally more reliable.
      return execFileSync('ssh', [
        '-o', 'BatchMode=yes',
        this.ssh,
        'bash -s',
      ], {
        input: remoteCmd,
        timeout: timeout || this.timeout,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trimEnd();
    } catch (err) {
      if (allowFailure) return null;
      const stderr = err.stderr ? err.stderr.toString() : '';
      throw new Error(`${LOCAL_MODE ? 'bash' : 'SSH'} command failed: ${(remoteCmd || '').slice(0, 200)}...\n${stderr || err.message}`);
    }
  }

  /**
   * Get a term ID by slug for a given taxonomy.
   * Returns null if not found.
   */
  getTermId(taxonomy, slug) {
    const result = this.run(`term list ${taxonomy} --slug=${slug} --field=term_id`, { allowFailure: true });
    if (!result) return null;
    const parsed = parseInt(result, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Create a term if it doesn't exist. Returns the term ID either way.
   * @param {string} taxonomy - e.g., 'category', 'post_tag'
   * @param {object} term - { name, slug, description, parent }
   */
  ensureTerm(taxonomy, { name, slug, description = '', parent = 0 }) {
    const existing = this.getTermId(taxonomy, slug);
    if (existing) return existing;

    const args = [
      `term create ${taxonomy}`,
      shellQuote(name),
      `--slug=${slug}`,
    ];
    if (description) args.push(`--description=${shellQuote(description)}`);
    if (parent) args.push(`--parent=${parent}`);
    args.push('--porcelain');  // returns just the ID

    const result = this.run(args.join(' '));
    return parseInt(result, 10);
  }

  /**
   * Find a post by its _p100_old_post_id meta value (idempotency check).
   * Returns the new site post ID, or null if not found.
   */
  findPostByOldId(oldPostId) {
    const result = this.run(
      `post list --post_type=post --meta_key=${config.RULES.IDEMPOTENCY_META_KEY} --meta_value=${oldPostId} --field=ID --posts_per_page=1`,
      { allowFailure: true }
    );
    if (!result) return null;
    const parsed = parseInt(result.split('\n')[0], 10);
    return isNaN(parsed) ? null : parsed;
  }
}

/**
 * POSIX-style shell quoting for arbitrary strings.
 * Wraps in single quotes and escapes embedded single quotes.
 */
function shellQuote(s) {
  if (s === undefined || s === null) return "''";
  const str = String(s);
  return `'${str.replace(/'/g, "'\\''")}'`;
}

module.exports = { WpCli, shellQuote };
