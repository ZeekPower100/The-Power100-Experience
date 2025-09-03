#!/usr/bin/env node

/**
 * Git Hook Installer
 * Installs the compatibility checker as a pre-push hook
 */

const fs = require('fs');
const path = require('path');

const prePushHook = `#!/bin/sh
# Pre-push hook to check code compatibility before pushing to GitHub
# This prevents breaking production with incompatible changes

echo "🔍 Running compatibility check before push..."

# Run the compatibility checker
node compatibility-check.js

# Check if compatibility check passed
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Push blocked: Compatibility issues detected"
    echo "Please fix the issues above and try again"
    echo ""
    echo "To bypass this check (NOT RECOMMENDED):"
    echo "  git push --no-verify"
    echo ""
    exit 1
fi

echo "✅ Compatibility check passed. Proceeding with push..."
`;

const installHook = () => {
  const gitHooksDir = path.join(__dirname, '.git', 'hooks');
  const prePushPath = path.join(gitHooksDir, 'pre-push');

  // Check if .git directory exists
  if (!fs.existsSync(path.join(__dirname, '.git'))) {
    console.error('❌ Error: .git directory not found. Are you in the project root?');
    process.exit(1);
  }

  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  // Check if pre-push hook already exists
  if (fs.existsSync(prePushPath)) {
    console.log('⚠️  Warning: pre-push hook already exists.');
    console.log('   Creating backup at pre-push.backup');
    fs.copyFileSync(prePushPath, `${prePushPath}.backup`);
  }

  // Write the pre-push hook
  fs.writeFileSync(prePushPath, prePushHook);
  
  // Make it executable (on Unix-like systems)
  if (process.platform !== 'win32') {
    fs.chmodSync(prePushPath, '755');
  }

  console.log('✅ Git pre-push hook installed successfully!');
  console.log('');
  console.log('The compatibility checker will now run automatically before each push.');
  console.log('');
  console.log('To test it manually, run:');
  console.log('  npm run check-compatibility');
  console.log('');
  console.log('To disable temporarily, push with:');
  console.log('  git push --no-verify');
  console.log('');
  console.log('To uninstall the hook:');
  console.log('  npm run uninstall-compatibility-hook');
};

// Run installer
installHook();