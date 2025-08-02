// scripts/claude-status.js
const { execSync } = require('child_process');
const fs = require('fs');

console.log('📊 The Power100 Experience - Project Status Report\n');

// Git status
try {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`📍 Current branch: ${branch}`);
  
  if (branch === 'main' || branch === 'master') {
    console.log('⚠️  WARNING: You are on the main/master branch!');
    console.log('   Consider creating a feature branch: git checkout -b claude/feature-name');
  }
  
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.log('📝 Uncommitted changes:');
    console.log(status);
  } else {
    console.log('✅ Working directory clean');
  }
  
  const commits = execSync('git log --oneline -5', { encoding: 'utf8' });
  console.log('\n📈 Recent commits:');
  console.log(commits);
  
  // Check for Claude-generated commits
  const claudeCommits = execSync('git log --oneline --grep="claude-generated" -5', { encoding: 'utf8' });
  if (claudeCommits.trim()) {
    console.log('🤖 Recent Claude Code commits:');
    console.log(claudeCommits);
  }
} catch (error) {
  console.log('❌ Git not available or not a repository');
}

// Frontend health checks
console.log('\n🎨 Frontend (tpe-front-end) Health:');
if (fs.existsSync('tpe-front-end')) {
  try {
    // TypeScript check
    try {
      execSync('cd tpe-front-end && npm run type-check', { stdio: 'ignore' });
      console.log('✅ TypeScript compilation successful');
    } catch {
      console.log('❌ TypeScript compilation failed');
    }
    
    // Build check
    try {
      execSync('cd tpe-front-end && npm run build', { stdio: 'ignore' });
      console.log('✅ Frontend build successful');
    } catch {
      console.log('❌ Frontend build failed');
    }
    
    // Test check
    try {
      execSync('cd tpe-front-end && npm test -- --passWithNoTests', { stdio: 'ignore' });
      console.log('✅ Frontend tests passing');
    } catch {
      console.log('❌ Frontend tests failing');
    }
    
  } catch (error) {
    console.log('⚠️  Could not run frontend health checks - ensure npm dependencies are installed');
  }
} else {
  console.log('❌ tpe-front-end directory not found');
}

// Backend health checks
console.log('\n⚙️  Backend (tpe-backend) Health:');
if (fs.existsSync('tpe-backend')) {
  try {
    execSync('cd tpe-backend && npm test', { stdio: 'ignore' });
    console.log('✅ Backend tests passing');
  } catch {
    console.log('❌ Backend tests failing or not configured');
  }
} else {
  console.log('📋 Backend not yet created (planned for future development)');
}

// Project structure check
console.log('\n📁 Project Structure:');
const importantFiles = [
  'CLAUDE.md',
  '.mcp.json',
  'tpe-front-end/src/app/contractorflow/page.tsx',
  'tpe-front-end/src/app/admindashboard/page.tsx', 
  'tpe-front-end/src/app/globals.css',
  'tpe-front-end/src/app/layout.tsx',
  '.claude/commands/feature.md',
  'scripts/claude-setup.js'
];

importantFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Claude Code configuration check
console.log('\n🤖 Claude Code Configuration:');
const claudeFiles = [
  '.claude/commands/feature.md',
  '.claude/commands/bugfix.md',
  '.claude/commands/test.md',
  '.claude/commands/status.md',
  '.claude/commands/backup.md',
  '.claude/commands/review.md',
  '.claude/commands/deploy.md',
  '.claude/commands/setup-verify.md'
];

const claudeCommandsCount = claudeFiles.filter(file => fs.existsSync(file)).length;
console.log(`📋 Claude commands available: ${claudeCommandsCount}/8`);

if (claudeCommandsCount === 8) {
  console.log('✅ All Claude commands configured');
} else {
  console.log('⚠️  Some Claude commands missing - run npm run claude:setup');
}

// Project statistics
console.log('\n📊 Project Statistics:');
const getFileCount = (dir) => {
  try {
    const files = execSync(`find ${dir} -type f -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l`, { encoding: 'utf8' });
    return parseInt(files.trim()) || 0;
  } catch {
    return 0;
  }
};

if (fs.existsSync('tpe-front-end/src')) {
  const frontendFiles = getFileCount('tpe-front-end/src');
  console.log(`📝 Frontend files: ${frontendFiles}`);
}

if (fs.existsSync('tpe-backend/src')) {
  const backendFiles = getFileCount('tpe-backend/src');
  console.log(`📝 Backend files: ${backendFiles}`);
}

// Recommendations
console.log('\n💡 Recommendations:');
if (claudeCommandsCount < 8) {
  console.log('- Run npm run claude:setup to complete Claude Code configuration');
}
console.log('- Use /feature "description" to start new development work');
console.log('- Use /backup before making major changes');
console.log('- Use /test to ensure code quality');
console.log('- Use /deploy staging before production deployments');

console.log('\n🎯 Ready for The Power100 Experience development with Claude Code!');