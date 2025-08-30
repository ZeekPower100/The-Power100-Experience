#!/bin/bash
# Script to set up parallel test environment for npm workspaces
# This creates a safe testing environment without affecting production

set -e

echo "🔧 Setting up NPM Workspaces Test Environment"
echo "============================================="

# Create test directory
echo "📁 Creating test directory..."
mkdir -p /home/ubuntu/TPE-TEST
cd /home/ubuntu/TPE-TEST

# Clone repository
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
  echo "  Repository already exists, pulling latest..."
  git fetch origin
  git checkout feature/npm-workspaces-migration
  git pull origin feature/npm-workspaces-migration
else
  git clone https://github.com/ZeekPower100/The-Power100-Experience.git .
  git checkout feature/npm-workspaces-migration
fi

echo "🧹 Cleaning any existing node_modules..."
rm -rf node_modules package-lock.json
rm -rf tpe-backend/node_modules tpe-backend/package-lock.json
rm -rf tpe-front-end/node_modules tpe-front-end/package-lock.json

echo "📦 Installing workspace dependencies..."
npm install --legacy-peer-deps

echo "✅ Verifying installation..."
echo "  Checking backend dependencies..."
cd tpe-backend
node -e "try { require('express'); console.log('    ✓ Express found'); } catch(e) { console.log('    ✗ Express NOT found'); process.exit(1); }"
node -e "try { require('pg'); console.log('    ✓ PostgreSQL found'); } catch(e) { console.log('    ✗ PostgreSQL NOT found'); process.exit(1); }"
node -e "try { require('jsonwebtoken'); console.log('    ✓ JWT found'); } catch(e) { console.log('    ✗ JWT NOT found'); process.exit(1); }"
cd ..

echo "  Checking frontend dependencies..."
cd tpe-front-end
node -e "try { require('next/package.json'); console.log('    ✓ Next.js found'); } catch(e) { console.log('    ✗ Next.js NOT found'); process.exit(1); }"
node -e "try { require('react/package.json'); console.log('    ✓ React found'); } catch(e) { console.log('    ✗ React NOT found'); process.exit(1); }"
cd ..

echo "🔧 Setting up test environment variables..."
cp tpe-backend/.env.production tpe-backend/.env 2>/dev/null || echo "  No .env.production found, you'll need to configure it"

echo "🏗️ Building frontend..."
npm run build:frontend

echo "✅ Test environment setup complete!"
echo ""
echo "📍 Test environment location: /home/ubuntu/TPE-TEST"
echo "📍 Production location: /home/ubuntu/The-Power100-Experience"
echo ""
echo "Next steps:"
echo "1. Test the application in /home/ubuntu/TPE-TEST"
echo "2. Run PM2 with test config: pm2 start ecosystem.config.js --name-prefix TEST_"
echo "3. Once verified, apply changes to production"