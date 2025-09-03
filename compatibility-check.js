#!/usr/bin/env node

/**
 * Code Compatibility Checker
 * Ensures frontend and backend are compatible before deployment
 * Run this before pushing to GitHub to prevent breaking production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Critical files to check for compatibility
const CRITICAL_FILES = {
  backend: {
    matching: 'tpe-backend/src/services/enhancedMatchingService.js',
    controllers: 'tpe-backend/src/controllers/contractorController.js',
    routes: 'tpe-backend/src/routes/contractorRoutes.js',
    partnerRoutes: 'tpe-backend/src/routes/partnerRoutes.js'
  },
  frontend: {
    matchingStep: 'tpe-front-end/src/components/contractor-flow/matchingstep.tsx',
    verificationStep: 'tpe-front-end/src/components/contractor-flow/verificationstep.tsx',
    api: 'tpe-front-end/src/lib/api.ts',
    utils: 'tpe-front-end/src/utils/api.ts'
  }
};

// Known compatibility patterns
const COMPATIBILITY_CHECKS = [
  {
    name: 'JSON Parsing Safety',
    description: 'Ensures backend handles both JSON and comma-separated strings',
    backend: {
      file: 'tpe-backend/src/services/enhancedMatchingService.js',
      required: [
        'topics.startsWith\\(\'\\[\'\\)', // Check for '[' before parsing
        'topics\\.split\\(\',\'\\)',      // Has comma split fallback
        'catch \\(e\\)'                    // Has error handling
      ],
      forbidden: [
        'JSON\\.parse\\(podcast\\.topics \\|\\| \'\\[\\]\'\\)' // Old broken pattern
      ]
    },
    frontend: {
      file: 'tpe-front-end/src/components/contractor-flow/matchingstep.tsx',
      required: [
        'Array\\.isArray\\(.*topics\\)',   // Checks if already array
        'topics\\.split\\(\',\'\\)'        // Can handle comma-separated
      ]
    }
  },
  {
    name: 'API Endpoint Alignment',
    description: 'Ensures frontend calls match backend routes',
    backend: {
      file: 'tpe-backend/src/routes/contractorRoutes.js',
      required: [
        'router\\.post\\(\'/verify-start\'',
        'router\\.post\\(\'/verify-code\'',
        'router\\.get\\(\'/:id/matches\''
      ]
    },
    frontend: {
      file: 'tpe-front-end/src/lib/api.ts',
      required: [
        '/contractors/verify-start',
        '/contractors/verify-code',
        '/contractors/.*/matches'
      ]
    }
  },
  {
    name: 'Error Response Handling',
    description: 'Ensures frontend handles backend error formats',
    backend: {
      file: 'tpe-backend/src/controllers/contractorController.js',
      required: [
        'res\\.status\\(400\\)\\.json',
        'error:'
      ]
    },
    frontend: {
      file: 'tpe-front-end/src/lib/api.ts',
      required: [
        'response\\.ok',
        'response\\.status',
        'throw new Error'
      ]
    }
  },
  {
    name: 'Data Structure Compatibility',
    description: 'Ensures data structures match between frontend and backend',
    checks: [
      {
        structure: 'Contractor',
        backend: 'tpe-backend/src/controllers/contractorController.js',
        frontend: 'tpe-front-end/src/components/contractor-flow/verificationstep.tsx',
        fields: ['id', 'name', 'email', 'phone', 'company_name', 'focus_areas']
      },
      {
        structure: 'Partner',
        backend: 'tpe-backend/src/controllers/partnerController.js',
        frontend: 'tpe-front-end/src/components/admin/ComprehensivePartnerForm.tsx',
        fields: ['id', 'company_name', 'capabilities', 'powerconfidence_score']
      }
    ]
  }
];

// Production comparison checks
const PRODUCTION_CHECKS = {
  enabled: false, // Set to true when production access is available
  productionPath: '/home/ubuntu/The-Power100-Experience',
  criticalFiles: [
    'tpe-backend/src/services/enhancedMatchingService.js',
    'tpe-front-end/src/components/contractor-flow/matchingstep.tsx'
  ]
};

class CompatibilityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const prefix = {
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`,
      header: `${colors.cyan}${colors.bold}`,
    };

    if (type === 'header') {
      console.log(`\n${prefix.header}${message}${colors.reset}`);
    } else {
      console.log(`${prefix[type] || ''} ${message}`);
    }
  }

  fileExists(filePath) {
    return fs.existsSync(path.join(__dirname, filePath));
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(__dirname, filePath), 'utf-8');
    } catch (error) {
      this.issues.push(`Cannot read file: ${filePath}`);
      return '';
    }
  }

  checkPattern(content, pattern, shouldExist = true) {
    const regex = new RegExp(pattern, 'gm');
    const found = regex.test(content);
    return shouldExist ? found : !found;
  }

  checkCompatibilityPattern(check) {
    this.log(`Checking: ${check.name}`, 'header');
    console.log(`  ${check.description}`);

    let backendPassed = true;
    let frontendPassed = true;

    // Check backend patterns
    if (check.backend) {
      const content = this.readFile(check.backend.file);
      
      // Check required patterns
      if (check.backend.required) {
        for (const pattern of check.backend.required) {
          if (!this.checkPattern(content, pattern, true)) {
            this.issues.push(`Backend missing required pattern in ${check.backend.file}: ${pattern}`);
            backendPassed = false;
          }
        }
      }

      // Check forbidden patterns
      if (check.backend.forbidden) {
        for (const pattern of check.backend.forbidden) {
          if (!this.checkPattern(content, pattern, false)) {
            this.issues.push(`Backend contains forbidden pattern in ${check.backend.file}: ${pattern}`);
            backendPassed = false;
          }
        }
      }
    }

    // Check frontend patterns
    if (check.frontend) {
      const content = this.readFile(check.frontend.file);
      
      if (check.frontend.required) {
        for (const pattern of check.frontend.required) {
          if (!this.checkPattern(content, pattern, true)) {
            this.issues.push(`Frontend missing required pattern in ${check.frontend.file}: ${pattern}`);
            frontendPassed = false;
          }
        }
      }
    }

    if (backendPassed && frontendPassed) {
      this.log(`  ✓ ${check.name} compatibility check passed`, 'success');
      this.passed.push(check.name);
    } else {
      this.log(`  ✗ ${check.name} compatibility check failed`, 'error');
    }
  }

  checkDataStructures(check) {
    if (!check.checks) return;

    this.log('Checking: Data Structure Compatibility', 'header');

    for (const structCheck of check.checks) {
      const backendContent = this.readFile(structCheck.backend);
      const frontendContent = this.readFile(structCheck.frontend);

      let allFieldsFound = true;
      for (const field of structCheck.fields) {
        // Simple check - can be made more sophisticated
        if (!backendContent.includes(field)) {
          this.warnings.push(`Backend might be missing field '${field}' in ${structCheck.structure}`);
        }
        if (!frontendContent.includes(field)) {
          this.warnings.push(`Frontend might be missing field '${field}' in ${structCheck.structure}`);
        }
      }
    }
  }

  checkCriticalFiles() {
    this.log('Checking Critical Files Exist', 'header');
    
    for (const [section, files] of Object.entries(CRITICAL_FILES)) {
      for (const [name, file] of Object.entries(files)) {
        if (this.fileExists(file)) {
          this.log(`  ✓ ${file}`, 'success');
        } else {
          this.issues.push(`Missing critical file: ${file}`);
          this.log(`  ✗ ${file}`, 'error');
        }
      }
    }
  }

  compareWithProduction() {
    if (!PRODUCTION_CHECKS.enabled) {
      this.log('\nProduction comparison skipped (not configured)', 'warning');
      return;
    }

    this.log('Comparing with Production', 'header');
    
    for (const file of PRODUCTION_CHECKS.criticalFiles) {
      try {
        const localFile = path.join(__dirname, file);
        const prodFile = `${PRODUCTION_CHECKS.productionPath}/${file}`;
        
        // This would need SSH access to production
        // For now, we'll just note it as a manual check
        this.warnings.push(`Manual check required: Compare ${file} with production`);
      } catch (error) {
        this.warnings.push(`Cannot compare ${file} with production: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    this.log('COMPATIBILITY CHECK REPORT', 'header');
    console.log('='.repeat(60));

    // Summary
    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`  Passed: ${colors.green}${this.passed.length}${colors.reset}`);
    console.log(`  Issues: ${colors.red}${this.issues.length}${colors.reset}`);
    console.log(`  Warnings: ${colors.yellow}${this.warnings.length}${colors.reset}`);

    // Issues (blocking)
    if (this.issues.length > 0) {
      console.log(`\n${colors.red}${colors.bold}❌ BLOCKING ISSUES:${colors.reset}`);
      this.issues.forEach(issue => {
        console.log(`  ${colors.red}✗${colors.reset} ${issue}`);
      });
    }

    // Warnings (non-blocking)
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️  WARNINGS:${colors.reset}`);
      this.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${warning}`);
      });
    }

    // Recommendations
    console.log(`\n${colors.cyan}${colors.bold}📋 RECOMMENDATIONS:${colors.reset}`);
    if (this.issues.length > 0) {
      console.log(`  1. Fix all blocking issues before pushing to GitHub`);
      console.log(`  2. Run tests after fixing issues`);
      console.log(`  3. Re-run this compatibility check`);
    } else {
      console.log(`  ${colors.green}✓${colors.reset} Code appears to be compatible and ready for deployment`);
    }

    // Git hook suggestion
    if (!fs.existsSync(path.join(__dirname, '.git/hooks/pre-push'))) {
      console.log(`\n${colors.blue}💡 TIP:${colors.reset} Install as git pre-push hook:`);
      console.log(`  npm run install-compatibility-hook`);
    }

    console.log('\n' + '='.repeat(60));

    // Return exit code
    return this.issues.length === 0 ? 0 : 1;
  }

  run() {
    this.log('Starting Compatibility Check...', 'info');
    
    // 1. Check critical files exist
    this.checkCriticalFiles();

    // 2. Run compatibility pattern checks
    for (const check of COMPATIBILITY_CHECKS) {
      if (check.checks) {
        this.checkDataStructures(check);
      } else {
        this.checkCompatibilityPattern(check);
      }
    }

    // 3. Compare with production (if enabled)
    this.compareWithProduction();

    // 4. Generate report
    const exitCode = this.generateReport();

    // Exit with appropriate code
    process.exit(exitCode);
  }
}

// Run the checker
if (require.main === module) {
  const checker = new CompatibilityChecker();
  checker.run();
}

module.exports = CompatibilityChecker;