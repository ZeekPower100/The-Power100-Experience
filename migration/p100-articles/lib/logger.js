/**
 * Minimal structured logger with progress indicators.
 * No external deps.
 */

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function ts() {
  return new Date().toISOString().slice(11, 19);  // HH:MM:SS
}

function info(msg, data) {
  console.log(`${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.cyan}INFO${COLORS.reset}  ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function ok(msg, data) {
  console.log(`${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.green}✓${COLORS.reset}     ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function warn(msg, data) {
  console.log(`${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.yellow}WARN${COLORS.reset}  ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function error(msg, data) {
  console.error(`${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.red}ERROR${COLORS.reset} ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function header(title) {
  const bar = '═'.repeat(Math.max(0, 70 - title.length));
  console.log(`\n${COLORS.cyan}═══ ${title} ${bar}${COLORS.reset}\n`);
}

function section(title) {
  console.log(`\n${COLORS.dim}── ${title} ──${COLORS.reset}`);
}

/**
 * Lightweight progress reporter for paginated/iterative work.
 */
class Progress {
  constructor(label, total) {
    this.label = label;
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
  }

  tick(by = 1) {
    this.current += by;
    const pct = this.total ? ((this.current / this.total) * 100).toFixed(1) : '?';
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${COLORS.dim}[${ts()}]${COLORS.reset} ${this.label}: ${this.current}/${this.total || '?'} (${pct}%) — ${elapsed}s    `);
  }

  done(extraMsg) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${COLORS.dim}[${ts()}]${COLORS.reset} ${COLORS.green}✓${COLORS.reset} ${this.label}: ${this.current}/${this.total || this.current} done in ${elapsed}s${extraMsg ? ' — ' + extraMsg : ''}\n`);
  }
}

module.exports = { info, ok, warn, error, header, section, Progress, COLORS };
