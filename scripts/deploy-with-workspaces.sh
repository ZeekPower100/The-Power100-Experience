#!/bin/bash
# Deployment script for npm workspaces setup
# This properly handles monorepo dependencies without symlink issues

set -e

echo "🚀 NPM Workspaces Deployment Script"
echo "===================================="

# Navigate to project root
cd /home/ubuntu/The-Power100-Experience

echo "📥 Pulling latest code..."
git pull origin master

echo "🧹 Cleaning old node_modules (removing symlinks)..."
# Remove any symlinks that might exist
if [ -L "tpe-backend/node_modules" ]; then
  echo "  Removing backend symlink..."
  rm tpe-backend/node_modules
fi

if [ -L "tpe-front-end/node_modules" ]; then
  echo "  Removing frontend symlink..."
  rm tpe-front-end/node_modules
fi

# Clean root node_modules for fresh install
rm -rf node_modules package-lock.json

echo "📦 Installing all workspace dependencies..."
# This will properly install and hoist shared dependencies
npm install --legacy-peer-deps

echo "✅ Verifying backend dependencies..."
# Check that Express is accessible from backend
cd tpe-backend
node -e "require('express'); console.log('✓ Express found')"
node -e "require('pg'); console.log('✓ PostgreSQL found')"
node -e "require('jsonwebtoken'); console.log('✓ JWT found')"
cd ..

echo "🏗️ Building frontend..."
npm run build:frontend

echo "♻️ Restarting PM2 services..."
pm2 restart all
pm2 save

echo "✅ Deployment complete!"
pm2 status