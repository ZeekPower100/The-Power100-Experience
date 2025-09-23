#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Patterns to check for hardcoded URLs
const URL_PATTERNS = [
  // Localhost patterns
  {
    pattern: /http:\/\/localhost:\d+/gi,
    message: 'Hardcoded localhost URL',
    severity: 'error',
    suggestion: 'Use environment-based URL configuration'
  },
  {
    pattern: /https?:\/\/127\.0\.0\.1:\d+/gi,
    message: 'Hardcoded 127.0.0.1 URL',
    severity: 'error',
    suggestion: 'Use environment-based URL configuration'
  },
  {
    pattern: /localhost:\d+\/api/gi,
    message: 'Hardcoded localhost API endpoint',
    severity: 'error',
    suggestion: 'Use dynamic base URL with process.env.NODE_ENV'
  },

  // Hardcoded production URLs that should be environment-based
  {
    pattern: /https?:\/\/tpx\.power100\.io/gi,
    message: 'Hardcoded production URL',
    severity: 'warning',
    suggestion: 'Consider using environment variable (e.g., process.env.PRODUCTION_URL)'
  },
  {
    pattern: /https?:\/\/n8n\.srv918843\.hstgr\.cloud/gi,
    message: 'Hardcoded n8n URL',
    severity: 'warning',
    suggestion: 'Use environment variable (e.g., process.env.N8N_URL)'
  },

  // Port-specific patterns
  {
    pattern: /:3000(?![\d])/gi,
    message: 'Hardcoded port 3000',
    severity: 'warning',
    suggestion: 'Use process.env.PORT or dynamic port configuration'
  },
  {
    pattern: /:3002(?![\d])/gi,
    message: 'Hardcoded port 3002',
    severity: 'warning',
    suggestion: 'Use process.env.PORT or dynamic port configuration'
  },
  {
    pattern: /:5000(?![\d])/gi,
    message: 'Hardcoded port 5000',
    severity: 'warning',
    suggestion: 'Use process.env.API_PORT or dynamic port configuration'
  },
  {
    pattern: /:5678(?![\d])/gi,
    message: 'Hardcoded n8n port 5678',
    severity: 'warning',
    suggestion: 'Use environment variable for n8n port'
  },

  // API endpoint patterns that might break in production
  {
    pattern: /fetch\(['"`]\/api/gi,
    message: 'Relative API path without base URL',
    severity: 'info',
    suggestion: 'Ensure base URL is properly configured for production'
  },
  {
    pattern: /axios\.(get|post|put|delete|patch)\(['"`]http:/gi,
    message: 'HTTP request (not HTTPS)',
    severity: 'warning',
    suggestion: 'Use HTTPS in production or protocol-relative URLs'
  }
];

// Files and directories to skip
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/build/**',
  '**/dist/**',
  '**/.git/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.test.js',
  '**/*.test.ts',
  '**/*.spec.js',
  '**/*.spec.ts',
  '**/test-*.js',  // Ignore files starting with test-
  '**/test-*.ts',
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/*.md',
  '**/package.json',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/production-url-check.js', // Don't check this file itself
  '**/README.md',
  '**/CLAUDE.md',
  '**/.env*'
];

// Special cases where hardcoded URLs are acceptable
const ACCEPTABLE_CONTEXTS = [
  // Development-only files
  /dev[-_]?manager\.js$/i,
  /start[-_]?dev\.js$/i,
  /development\.js$/i,

  // Configuration files where we define the URLs
  /config\/(development|staging|production)\.js$/i,
  /\.env\.example$/i,

  // Documentation
  /\.md$/i,
  /docs\//i,

  // Mock data or test fixtures
  /fixtures?\//i,
  /mocks?\//i,
  /__mocks__\//i
];

class ProductionURLChecker {
  constructor() {
    this.issues = [];
    this.fileCount = 0;
    this.checkedFiles = 0;
  }

  isAcceptableContext(filePath) {
    return ACCEPTABLE_CONTEXTS.some(pattern => pattern.test(filePath));
  }

  checkFile(filePath) {
    // Skip if in acceptable context
    if (this.isAcceptableContext(filePath)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip comments and empty lines
      if (line.trim().startsWith('//') ||
          line.trim().startsWith('*') ||
          line.trim().startsWith('#') ||
          line.trim() === '') {
        return;
      }

      URL_PATTERNS.forEach(({ pattern, message, severity, suggestion }) => {
        const matches = line.match(pattern);
        if (matches) {
          // Check if this is inside a proper environment check
          const prevLines = lines.slice(Math.max(0, index - 3), index).join('\n');
          const nextLines = lines.slice(index + 1, Math.min(lines.length, index + 4)).join('\n');
          const context = prevLines + '\n' + line + '\n' + nextLines;

          // Skip if properly wrapped in environment check
          if (context.includes('process.env.NODE_ENV') ||
              context.includes('__DEV__') ||
              context.includes('isDevelopment') ||
              context.includes('isProduction')) {
            return;
          }

          this.issues.push({
            file: filePath,
            line: index + 1,
            column: line.indexOf(matches[0]) + 1,
            match: matches[0],
            message,
            severity,
            suggestion,
            code: line.trim()
          });
        }
      });
    });
  }

  scanProject(targetPath) {
    console.log(`${colors.cyan}${colors.bright}\n🔍 Scanning for hardcoded URLs and production compatibility issues...${colors.reset}`);
    console.log(`${colors.dim}Target: ${targetPath}${colors.reset}\n`);

    // Get all JavaScript and TypeScript files
    const patterns = [
      path.join(targetPath, '**/*.js'),
      path.join(targetPath, '**/*.jsx'),
      path.join(targetPath, '**/*.ts'),
      path.join(targetPath, '**/*.tsx')
    ];

    const files = [];
    patterns.forEach(pattern => {
      const matchedFiles = glob.sync(pattern, {
        ignore: IGNORE_PATTERNS,
        nodir: true
      });
      files.push(...matchedFiles);
    });

    this.fileCount = files.length;
    console.log(`${colors.dim}Found ${this.fileCount} files to check${colors.reset}\n`);

    files.forEach(file => {
      this.checkFile(file);
      this.checkedFiles++;
    });

    this.reportResults();
  }

  reportResults() {
    console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);

    if (this.issues.length === 0) {
      console.log(`${colors.green}${colors.bright}✅ No hardcoded URL issues found!${colors.reset}`);
      console.log(`${colors.dim}Checked ${this.checkedFiles} files${colors.reset}`);
      return;
    }

    // Group issues by severity
    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const info = this.issues.filter(i => i.severity === 'info');

    console.log(`${colors.red}${colors.bright}⚠️  Found ${this.issues.length} hardcoded URL issues:${colors.reset}`);
    console.log(`${colors.red}Errors: ${errors.length}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${warnings.length}${colors.reset}`);
    console.log(`${colors.cyan}Info: ${info.length}${colors.reset}\n`);

    // Group by file for better readability
    const issuesByFile = {};
    this.issues.forEach(issue => {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    });

    Object.keys(issuesByFile).forEach(file => {
      const relativeFile = path.relative(process.cwd(), file);
      console.log(`${colors.yellow}${colors.bright}\n📄 ${relativeFile}${colors.reset}`);

      issuesByFile[file].forEach(issue => {
        const severityColor = issue.severity === 'error' ? colors.red :
                             issue.severity === 'warning' ? colors.yellow :
                             colors.cyan;

        console.log(`${colors.dim}   Line ${issue.line}: ${colors.reset}${severityColor}${issue.message}${colors.reset}`);
        console.log(`${colors.dim}   Match: "${issue.match}"${colors.reset}`);
        console.log(`${colors.dim}   Code: ${issue.code.substring(0, 80)}${issue.code.length > 80 ? '...' : ''}${colors.reset}`);
        console.log(`${colors.green}   Fix: ${issue.suggestion}${colors.reset}`);
      });
    });

    // Show example fix
    if (errors.length > 0) {
      console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);
      console.log(`${colors.cyan}${colors.bright}RECOMMENDED FIX PATTERN:${colors.reset}\n`);
      console.log(`${colors.dim}// Instead of:${colors.reset}`);
      console.log(`${colors.red}const url = 'http://localhost:5000/api/endpoint';${colors.reset}\n`);
      console.log(`${colors.dim}// Use:${colors.reset}`);
      console.log(`${colors.green}const baseUrl = process.env.NODE_ENV === 'production'${colors.reset}`);
      console.log(`${colors.green}  ? 'https://tpx.power100.io'${colors.reset}`);
      console.log(`${colors.green}  : 'http://localhost:5000';${colors.reset}`);
      console.log(`${colors.green}const url = \`\${baseUrl}/api/endpoint\`;${colors.reset}\n`);

      console.log(`${colors.dim}// Or better yet, use environment variables:${colors.reset}`);
      console.log(`${colors.green}const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';${colors.reset}`);
      console.log(`${colors.green}const url = \`\${baseUrl}/api/endpoint\`;${colors.reset}`);
    }

    console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);

    // Return exit code based on errors
    if (errors.length > 0) {
      console.log(`${colors.red}${colors.bright}❌ Production URL check failed with ${errors.length} errors${colors.reset}`);
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log(`${colors.yellow}${colors.bright}⚠️  Production URL check passed with warnings${colors.reset}`);
    } else {
      console.log(`${colors.green}${colors.bright}✅ Production URL check passed${colors.reset}`);
    }
  }
}

// Run the checker
if (require.main === module) {
  const checker = new ProductionURLChecker();

  // Check both frontend and backend
  console.log(`${colors.cyan}${colors.bright}🔍 PRODUCTION URL COMPATIBILITY CHECK${colors.reset}`);
  console.log(`${colors.dim}${'='.repeat(80)}${colors.reset}`);

  // Check backend
  if (fs.existsSync('tpe-backend')) {
    console.log(`\n${colors.bright}Checking Backend...${colors.reset}`);
    checker.scanProject('tpe-backend');
  }

  // Reset for frontend
  checker.issues = [];
  checker.checkedFiles = 0;

  // Check frontend
  if (fs.existsSync('tpe-front-end')) {
    console.log(`\n${colors.bright}Checking Frontend...${colors.reset}`);
    checker.scanProject('tpe-front-end');
  }
}

module.exports = ProductionURLChecker;