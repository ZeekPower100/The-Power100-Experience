// scripts/claude-verify.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Claude Code setup for The Power100 Experience...');

const checks = [
  {
    name: 'CLAUDE.md exists with TPE context',
    check: () => {
      if (!fs.existsSync('CLAUDE.md')) return false;
      const content = fs.readFileSync('CLAUDE.md', 'utf8');
      return content.includes('Power100 Experience') && content.includes('contractor flow');
    },
    fix: 'Create CLAUDE.md file with Power100 Experience project context'
  },
  {
    name: '.mcp.json configuration',
    check: () => {
      if (!fs.existsSync('.mcp.json')) return false;
      const content = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'));
      return content.mcpServers && content.safetyRules;
    },
    fix: 'Create .mcp.json file with MCP server configuration'
  },
  {
    name: 'Claude commands directory',
    check: () => {
      if (!fs.existsSync('.claude/commands')) return false;
      const commandFiles = ['feature.md', 'bugfix.md', 'test.md', 'status.md', 'backup.md', 'review.md', 'deploy.md', 'setup-verify.md'];
      return commandFiles.every(file => fs.existsSync(`.claude/commands/${file}`));
    },
    fix: 'Create .claude/commands directory and add all 8 command files'
  },
  {
    name: 'Git repository',
    check: () => {
      try {
        execSync('git status', { stdio: 'ignore' });
        return true;
      } catch { return false; }
    },
    fix: 'Initialize Git repository: git init'
  },
  {
    name: 'TPE Frontend structure',
    check: () => {
      return fs.existsSync('tpe-front-end') && 
             fs.existsSync('tpe-front-end/src') &&
             fs.existsSync('tpe-front-end/src/app');
    },
    fix: 'Ensure tpe-front-end directory exists with proper structure'
  },
  {
    name: 'Project scripts directory',
    check: () => {
      return fs.existsSync('scripts') && 
             fs.existsSync('scripts/claude-setup.js') &&
             fs.existsSync('scripts/claude-verify.js');
    },
    fix: 'Create scripts directory with Claude helper scripts'
  },
  {
    name: 'Root package.json with Claude scripts',
    check: () => {
      if (!fs.existsSync('package.json')) return false;
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts && pkg.scripts['claude:setup'];
    },
    fix: 'Add Claude scripts to root package.json'
  },
  {
    name: 'GitHub workflows directory',
    check: () => fs.existsSync('.github/workflows'),
    fix: 'Create .github/workflows directory for CI/CD'
  }
];

let allPassed = true;
let passedChecks = 0;

checks.forEach(({ name, check, fix }) => {
  const passed = check();
  if (passed) {
    console.log(`✅ ${name}`);
    passedChecks++;
  } else {
    console.log(`❌ ${name} - ${fix}`);
    allPassed = false;
  }
});

console.log(`\n📊 Setup Status: ${passedChecks}/${checks.length} checks passed`);

if (allPassed) {
  console.log('\n🎉 All checks passed! Claude Code is ready for The Power100 Experience.');
  console.log('\n🚀 Available commands:');
  console.log('- /feature "description" - Create new feature');
  console.log('- /bugfix "description" - Fix bugs');
  console.log('- /test "component" - Create tests');
  console.log('- /status - Check project health');
  console.log('- /backup - Create emergency backup');
  console.log('- /review - Code review');
  console.log('- /deploy "staging|production" - Deploy application');
  console.log('- /setup-verify - Verify setup again');
  
  console.log('\n💡 Pro tips:');
  console.log('- Run /status regularly to monitor project health');
  console.log('- Use /backup before major changes');
  console.log('- Always /test your components after building them');
  console.log('- Deploy to staging first, then production');
} else {
  console.log('\n⚠️  Some issues found. Please fix them before using Claude Code.');
  console.log('Run: npm run claude:setup to auto-fix some issues.');
}

// Check TPE-specific files
console.log('\n🎯 Power100 Experience specific checks:');
const tpeFiles = [
  'tpe-front-end/src/app/contractorflow/page.tsx',
  'tpe-front-end/src/app/admindashboard/page.tsx',
  'tpe-front-end/src/app/globals.css'
];

tpeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} found`);
  } else {
    console.log(`⚠️  ${file} not found`);
  }
});

console.log('\n🔄 Ready to build The Power100 Experience with Claude Code!');