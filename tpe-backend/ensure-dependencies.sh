#!/bin/bash
# Ensure backend dependencies are available

set -e

echo "🔍 Checking backend dependencies..."

# Navigate to backend directory
cd /home/ubuntu/The-Power100-Experience/tpe-backend

# Check if symlink exists and is valid
if [ ! -L node_modules ] || [ ! -e node_modules ]; then
  echo "⚠️ Creating symlink to parent node_modules..."
  rm -rf node_modules
  ln -sf ../node_modules node_modules
fi

# Check if critical dependencies exist
MISSING_DEPS=""
for dep in express pg jsonwebtoken bcryptjs cors dotenv express-rate-limit; do
  if [ ! -d "node_modules/$dep" ]; then
    MISSING_DEPS="$MISSING_DEPS $dep"
  fi
done

if [ -n "$MISSING_DEPS" ]; then
  echo "📦 Installing missing dependencies:$MISSING_DEPS"
  cd /home/ubuntu/The-Power100-Experience
  npm install $MISSING_DEPS --save --legacy-peer-deps
else
  echo "✅ All dependencies are available"
fi

# Verify Express is accessible
if node -e "require('express')" 2>/dev/null; then
  echo "✅ Express module verified"
else
  echo "❌ Express module not accessible"
  exit 1
fi