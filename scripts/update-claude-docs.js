// scripts/update-claude-docs.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📚 Updating Claude Code documentation for The Power100 Experience...');

// Update CLAUDE.md with current project state
const updateClaudeDoc = () => {
  // Get project statistics
  const getFileCount = (dir) => {
    try {
      const files = execSync(`find ${dir} -type f 2>/dev/null | wc -l`, { encoding: 'utf8' });
      return parseInt(files.trim()) || 0;
    } catch {
      return 0;
    }
  };
  
  const getCodeFileCount = (dir) => {
    try {
      const files = execSync(`find ${dir} -type f -name "*.tsx" -o -name "*.ts" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l`, { encoding: 'utf8' });
      return parseInt(files.trim()) || 0;
    } catch {
      return 0;
    }
  };

  // Check package.json files for dependencies
  const getFrontendDeps = () => {
    try {
      const pkg = JSON.parse(fs.readFileSync('tpe-front-end/package.json', 'utf8'));
      return {
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length
      };
    } catch {
      return { dependencies: 0, devDependencies: 0 };
    }
  };

  const getBackendDeps = () => {
    try {
      const pkg = JSON.parse(fs.readFileSync('tpe-backend/package.json', 'utf8'));
      return {
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length
      };
    } catch {
      return { dependencies: 0, devDependencies: 0 };
    }
  };

  const stats = {
    frontendFiles: getCodeFileCount('tpe-front-end/src'),
    backendFiles: getCodeFileCount('tpe-backend/src'),
    totalFiles: getFileCount('tpe-front-end') + getFileCount('tpe-backend'),
    claudeCommands: fs.existsSync('.claude/commands') ? fs.readdirSync('.claude/commands').length : 0,
    frontendDeps: getFrontendDeps(),
    backendDeps: getBackendDeps(),
    hasBackend: fs.existsSync('tpe-backend'),
    hasDatabase: fs.existsSync('tpe-database')
  };
  
  // Get Git information
  let gitInfo = {};
  try {
    gitInfo.currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    gitInfo.totalCommits = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    gitInfo.lastCommit = execSync('git log -1 --format="%h %s"', { encoding: 'utf8' }).trim();
  } catch {
    gitInfo = { currentBranch: 'unknown', totalCommits: '0', lastCommit: 'No commits' };
  }

  const timestamp = new Date().toISOString();
  
  const statusAppend = `

---

## 📊 Project Statistics (Updated: ${timestamp})

### 📈 Development Progress
- **Frontend Files**: ${stats.frontendFiles} TypeScript/React files
- **Backend Files**: ${stats.backendFiles} ${stats.hasBackend ? 'files' : '(not yet created)'}
- **Total Project Files**: ${stats.totalFiles}
- **Claude Commands**: ${stats.claudeCommands}/8 configured

### 📦 Dependencies
- **Frontend Dependencies**: ${stats.frontendDeps.dependencies}
- **Frontend Dev Dependencies**: ${stats.frontendDeps.devDependencies}
- **Backend Dependencies**: ${stats.backendDeps.dependencies} ${stats.hasBackend ? '' : '(pending)'}

### 🔧 Infrastructure Status
- **Backend API**: ${stats.hasBackend ? '✅ Created' : '📋 Planned'}
- **Database Schema**: ${stats.hasDatabase ? '✅ Designed' : '📋 To Be Designed'}
- **CI/CD Pipeline**: ${fs.existsSync('.github/workflows') ? '✅ Configured' : '📋 Pending'}

### 📍 Git Status
- **Current Branch**: ${gitInfo.currentBranch}
- **Total Commits**: ${gitInfo.totalCommits}
- **Last Commit**: ${gitInfo.lastCommit}

### 🎯 Next Development Priorities
${stats.frontendFiles < 10 ? '- Complete frontend contractor flow components' : ''}
${!stats.hasBackend ? '- Begin backend API development' : ''}
${!stats.hasDatabase ? '- Design database schema' : ''}
${stats.claudeCommands < 8 ? '- Complete Claude Code command setup' : ''}

## 🔄 Last Update Process
- Documentation auto-updated by Claude Code
- Statistics refreshed from current project state
- Ready for development with latest context
- All systems optimized for The Power100 Experience development

## 🚀 Quick Start for New Developers
1. Run \`npm run claude:verify\` to check setup
2. Use \`/status\` in Claude Code for project health
3. Start new features with \`/feature "description"\`
4. Always test with \`/test "component-name"\`
5. Deploy safely with \`/deploy staging\` first

## 🎯 Power100 Experience Development Focus
- Contractor onboarding flow optimization
- Partner matching algorithm refinement  
- Admin dashboard analytics enhancement
- PowerConfidence scoring system implementation
- Full-stack integration completion
`;
  
  // Read current CLAUDE.md and update it
  let claudeContent = '';
  if (fs.existsSync('CLAUDE.md')) {
    claudeContent = fs.readFileSync('CLAUDE.md', 'utf8');
    
    // Remove old statistics section if it exists
    claudeContent = claudeContent.replace(/\n---\n\n## 📊 Project Statistics.*$/s, '');
  } else {
    console.log('⚠️  CLAUDE.md not found - creating basic version');
    claudeContent = '# The Power100 Experience - Project Context\n\nThis file will be updated with project statistics.\n';
  }
  
  // Append new statistics
  claudeContent += statusAppend;
  
  fs.writeFileSync('CLAUDE.md', claudeContent);
  console.log('✅ Updated CLAUDE.md with current project statistics');
};

// Create or update project README
const updateReadme = () => {
  const readmeContent = `# The Power100 Experience

Full-stack web application connecting contractors with strategic partners through AI-driven matching.

## 🚀 Quick Start

### Frontend Development
\`\`\`bash
cd tpe-front-end
npm install
npm run dev
\`\`\`

### Backend Development (When Available)
\`\`\`bash
cd tpe-backend
npm install
npm run dev
\`\`\`

## 🤖 Claude Code Integration

This project is optimized for Claude Code development:

### Available Commands
- \`/feature "description"\` - Create new features
- \`/bugfix "description"\` - Fix bugs
- \`/test "component"\` - Create tests
- \`/status\` - Check project health
- \`/backup\` - Create emergency backup
- \`/review\` - Code review
- \`/deploy staging|production\` - Deploy application

### Getting Started with Claude Code
1. Navigate to project root
2. Run \`claude\` in terminal
3. Use \`/setup-verify\` to confirm configuration
4. Start developing with \`/feature "your-feature-name"\`

## 📁 Project Structure

- \`tpe-front-end/\` - Next.js frontend application
- \`tpe-backend/\` - Node.js backend API (planned)
- \`tpe-database/\` - Database schemas (planned)
- \`.claude/\` - Claude Code configuration
- \`scripts/\` - Development helper scripts

## 🛠️ Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express (planned)
- **Database**: PostgreSQL (planned)
- **AI Development**: Claude Code with custom workflows

Last updated: ${new Date().toISOString()}
`;

  fs.writeFileSync('README.md', readmeContent);
  console.log('✅ Updated README.md');
};

// Main execution
try {
  updateClaudeDoc();
  updateReadme();
  
  console.log('\n📚 Documentation update complete!');
  console.log('\n📋 Summary:');
  console.log('- CLAUDE.md updated with latest project statistics');
  console.log('- README.md updated with current information');
  console.log('- Ready for enhanced Claude Code development');
  
} catch (error) {
  console.error('❌ Error updating documentation:', error.message);
  console.log('Please check file permissions and try again.');
}