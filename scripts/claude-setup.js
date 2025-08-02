// scripts/claude-setup.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Claude Code best practices for The Power100 Experience...');

// Create directory structure for Multi-Agent Platform
const directories = [
  '.claude/commands',
  '.claude/docs', 
  '.claude/workflows',
  
  // Frontend structure
  'tpe-front-end/tests/unit',
  'tpe-front-end/tests/integration',
  'tpe-front-end/tests/e2e',
  
  // Backend structure
  'tpe-backend/src/routes',
  'tpe-backend/src/models',
  'tpe-backend/src/services',
  'tpe-backend/src/middleware',
  'tpe-backend/src/agents',
  'tpe-backend/tests',
  
  // n8n Orchestration
  'tpe-orchestration/workflows',
  'tpe-orchestration/nodes',
  'tpe-orchestration/configs',
  
  // Specialized AI Agents
  'tpe-agents/onboarding-agent/src',
  'tpe-agents/onboarding-agent/tests',
  'tpe-agents/discovery-agent/src',
  'tpe-agents/discovery-agent/tests',
  'tpe-agents/matching-agent/src',
  'tpe-agents/matching-agent/tests',
  'tpe-agents/data-gathering-agent/src',
  'tpe-agents/data-gathering-agent/tests',
  'tpe-agents/concierge-agent/src',
  'tpe-agents/concierge-agent/tests',
  
  // Database
  'tpe-database/schemas',
  'tpe-database/migrations',
  'tpe-database/seeds',
  
  // Third-party Integrations
  'tpe-integrations/twilio',
  'tpe-integrations/sendgrid', 
  'tpe-integrations/gemini',
  'tpe-integrations/partner-apis',
  
  // PowerConfidence Reporting
  'tpe-reports/generators',
  'tpe-reports/templates',
  'tpe-reports/analytics',
  
  // Documentation and deployment
  'docs/architecture',
  'docs/agents',
  'docs/workflows',
  'deploy/staging',
  'deploy/production',
  '.github/workflows'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Verify Git is initialized
try {
  execSync('git status', { stdio: 'ignore' });
  console.log('✅ Git repository detected');
} catch (error) {
  console.log('⚠️  Initializing Git repository...');
  execSync('git init');
  execSync('git add .');
  execSync('git commit -m "Initial commit: The Power100 Experience project"');
}

// Check for GitHub CLI
try {
  execSync('gh --version', { stdio: 'ignore' });
  console.log('✅ GitHub CLI detected');
} catch (error) {
  console.log('⚠️  GitHub CLI not found. Install with: npm install -g gh');
}

// Create frontend test configuration if not exists
const frontendTestDir = 'tpe-front-end';
if (fs.existsSync(frontendTestDir)) {
  const jestConfigPath = path.join(frontendTestDir, 'jest.config.js');
  if (!fs.existsSync(jestConfigPath)) {
    const jestConfig = {
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testMatch: [
        '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}'
      ],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts'
      ]
    };

    fs.writeFileSync(jestConfigPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)}`);
    console.log('✅ Created Jest configuration for frontend');
  }

  // Create test setup file
  const testSetupPath = path.join(frontendTestDir, 'tests/setup.js');
  if (!fs.existsSync(testSetupPath)) {
    const testSetup = `
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    form: 'form',
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock Power100 Experience entities
jest.mock('@/entities/Contractor', () => ({
  Contractor: {
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(() => []),
  },
}));
`;

    fs.writeFileSync(testSetupPath, testSetup);
    console.log('✅ Created test setup file for frontend');
  }
}

// Create root-level package.json if it doesn't exist
if (!fs.existsSync('package.json')) {
  const rootPackageJson = {
    name: "the-power100-experience",
    version: "1.0.0", 
    description: "Power100 Experience - Multi-Agent Conversation Platform",
    scripts: {
      // Development commands
      "dev:frontend": "cd tpe-front-end && npm run dev",
      "dev:backend": "cd tpe-backend && npm run dev",
      "dev:orchestration": "cd tpe-orchestration && npm run dev",
      "dev:all": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\" \"npm run dev:orchestration\"",
      
      // Build commands
      "build:all": "npm run build:frontend && npm run build:backend && npm run build:agents",
      "build:frontend": "cd tpe-front-end && npm run build",
      "build:backend": "cd tpe-backend && npm run build",
      "build:agents": "npm run build:agents:onboarding && npm run build:agents:discovery && npm run build:agents:matching && npm run build:agents:data-gathering && npm run build:agents:concierge",
      "build:agents:onboarding": "cd tpe-agents/onboarding-agent && npm run build",
      "build:agents:discovery": "cd tpe-agents/discovery-agent && npm run build",
      "build:agents:matching": "cd tpe-agents/matching-agent && npm run build",
      "build:agents:data-gathering": "cd tpe-agents/data-gathering-agent && npm run build",
      "build:agents:concierge": "cd tpe-agents/concierge-agent && npm run build",
      
      // Test commands
      "test:all": "npm run test:frontend && npm run test:backend && npm run test:agents",
      "test:frontend": "cd tpe-front-end && npm test",
      "test:backend": "cd tpe-backend && npm test",
      "test:agents": "npm run test:agents:onboarding && npm run test:agents:discovery && npm run test:agents:matching && npm run test:agents:data-gathering && npm run test:agents:concierge",
      "test:agents:onboarding": "cd tpe-agents/onboarding-agent && npm test",
      "test:agents:discovery": "cd tpe-agents/discovery-agent && npm test", 
      "test:agents:matching": "cd tpe-agents/matching-agent && npm test",
      "test:agents:data-gathering": "cd tpe-agents/data-gathering-agent && npm test",
      "test:agents:concierge": "cd tpe-agents/concierge-agent && npm test",
      
      // Database commands
      "db:migrate": "cd tpe-database && npm run migrate",
      "db:seed": "cd tpe-database && npm run seed",
      "db:reset": "cd tpe-database && npm run reset",
      
      // n8n Orchestration commands
      "orchestration:start": "cd tpe-orchestration && npm run start",
      "orchestration:deploy": "cd tpe-orchestration && npm run deploy",
      "workflows:export": "cd tpe-orchestration && npm run export",
      "workflows:import": "cd tpe-orchestration && npm run import",
      
      // Claude Code commands
      "claude:setup": "node scripts/claude-setup.js",
      "claude:verify": "node scripts/claude-verify.js",
      "claude:backup": "git checkout -b backup/$(date +'%Y%m%d-%H%M%S') && git add . && git commit -m 'Emergency backup' && git push origin backup/$(date +'%Y%m%d-%H%M%S')",
      "claude:status": "node scripts/claude-status.js",
      "claude:docs": "node scripts/update-claude-docs.js"
    },
    workspaces: [
      "tpe-front-end",
      "tpe-backend", 
      "tpe-orchestration",
      "tpe-agents/*",
      "tpe-integrations/*",
      "tpe-reports"
    ]
  };

  fs.writeFileSync('package.json', JSON.stringify(rootPackageJson, null, 2));
  console.log('✅ Created root-level package.json');
}

console.log('\n🎉 Claude Code setup complete for The Power100 Experience!');
console.log('\nNext steps:');
console.log('1. Run: claude --mcp-debug (to verify MCP setup)');
console.log('2. Use: /setup-verify (in Claude Code to test configuration)');
console.log('3. Start coding with: /feature "your-feature-description"');
console.log('4. Use: /status (to check project health anytime)');