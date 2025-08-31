# NPM Workspaces Migration Guide

## 🚨 CRITICAL: Issues Encountered During Local Migration

### 1. **SQLite Binding Errors (Windows-specific)**
- **Issue**: SQLite3 module throws binding errors even when `USE_SQLITE=false`
- **Root Cause**: Files still importing `database.sqlite` directly
- **Solution**: 
  - Changed all `require('../config/database.sqlite')` to `require('../config/database')`
  - Modified `database.js` to only load PostgreSQL module
- **Production Note**: Ubuntu won't have this issue but we should still clean imports

### 2. **Module Resolution Issues**
- **Issue**: Express and other modules "not found" after workspace setup
- **Root Cause**: Windows doesn't resolve hoisted modules from subdirectories
- **Solution**:
  - Run backend from root: `node tpe-backend/src/server.js`
  - Run frontend from root: `cd tpe-front-end && node ../node_modules/next/dist/bin/next dev`
- **Production Note**: Linux handles this better but we should use same approach

### 3. **Clean Install Required**
- **Issue**: Partial installs left broken dependencies
- **Solution**: Always do clean install:
  ```bash
  rm -rf node_modules package-lock.json
  rm -rf tpe-backend/node_modules tpe-backend/package-lock.json
  rm -rf tpe-front-end/node_modules tpe-front-end/package-lock.json
  npm install --legacy-peer-deps
  ```

### 4. **Script Updates Required**
- **Issue**: npm scripts still trying to run from subdirectories
- **Changes Made**:
  ```json
  "dev:backend": "node tpe-backend/src/server.js",
  "dev:frontend": "cd tpe-front-end && node ../node_modules/next/dist/bin/next dev --port 3002"
  ```

### 5. **Port Conflicts**
- **Issue**: Port 3002 remained in use after kills
- **Solution**: Always check and kill processes before starting

## 📋 Production Migration Checklist

### Pre-Migration Setup
- [ ] Create backup branch: `git checkout -b backup/pre-workspaces-$(date +%s)`
- [ ] Test parallel environment at `/home/ubuntu/TPE-TEST`
- [ ] Ensure PM2 processes are documented

### Migration Steps for Ubuntu Production

#### 1. Clean Workspace Setup
```bash
#!/bin/bash
# Production Migration Script - Ubuntu

# Navigate to project
cd /home/ubuntu/The-Power100-Experience

# Create backup
git add .
git commit -m "Pre-workspace backup"
git push origin backup/$(date +%Y%m%d-%H%M%S)

# Pull workspace changes
git pull origin master

# CRITICAL: Clean all node_modules
rm -rf node_modules package-lock.json
rm -rf tpe-backend/node_modules tpe-backend/package-lock.json
rm -rf tpe-front-end/node_modules tpe-front-end/package-lock.json

# Install with workspaces
npm install --legacy-peer-deps

# Verify Express is accessible
node -e "require('express'); console.log('✓ Express found')"
```

#### 2. Fix SQLite Imports (if not already fixed)
```bash
# Replace all database.sqlite imports with database
find tpe-backend -name "*.js" -type f -exec sed -i 's/database\.sqlite/database/g' {} \;
```

#### 3. Update PM2 Configuration
```javascript
// ecosystem.config.js - UPDATED FOR WORKSPACES
module.exports = {
  apps: [
    {
      name: 'tpe-backend',
      script: 'node',
      args: 'tpe-backend/src/server.js',
      cwd: '/home/ubuntu/The-Power100-Experience',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'tpe-frontend',
      script: 'node',
      args: 'node_modules/next/dist/bin/next start',
      cwd: '/home/ubuntu/The-Power100-Experience/tpe-front-end',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

#### 4. Update Deployment Scripts
```bash
# deploy-production.sh - UPDATED
#!/bin/bash
cd /home/ubuntu/The-Power100-Experience
git pull origin master

# Clean install with workspaces
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Build frontend
cd tpe-front-end
node ../node_modules/next/dist/bin/next build
cd ..

# Restart PM2
pm2 restart ecosystem.config.js
pm2 save
```

## 🔍 Verification Steps

### Local Development
```bash
# Start backend
npm run dev:backend
# Verify: http://localhost:5000/health

# Start frontend  
npm run dev:frontend
# Verify: http://localhost:3002
```

### Production
```bash
# Check module resolution
node -e "require('express'); console.log('Express OK')"
node -e "require('pg'); console.log('PostgreSQL OK')"
node -e "require('jsonwebtoken'); console.log('JWT OK')"

# Test backend directly
NODE_ENV=production node tpe-backend/src/server.js

# Check PM2 status
pm2 status
pm2 logs tpe-backend
pm2 logs tpe-frontend
```

## ⚠️ Rollback Plan

If issues occur:
```bash
# Revert to backup branch
git checkout backup/pre-workspaces-[timestamp]

# Reinstall old way
cd tpe-backend && npm install
cd ../tpe-front-end && npm install
cd ..

# Restart PM2 with old config
pm2 restart all
```

## 🎯 Benefits After Migration

1. **No More Express Disappearing**: Dependencies are hoisted to root, no symlinks to break
2. **Consistent Installs**: Single package-lock.json ensures reproducible builds
3. **Faster Installs**: Shared dependencies installed once
4. **Better Windows Support**: Works identically on Windows and Linux

## 📝 Key Differences: Windows vs Ubuntu

| Issue | Windows | Ubuntu |
|-------|---------|--------|
| Module Resolution | Requires explicit paths | Better automatic resolution |
| SQLite Bindings | Fails even when unused | Cleaner handling |
| Path Separators | Backslash issues | Forward slash only |
| Process Management | taskkill //F //PID | kill -9 PID |
| PM2 | Not used | Critical for production |

## 🚀 Final Production Script

Save this as `/home/ubuntu/The-Power100-Experience/migrate-to-workspaces.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting NPM Workspaces Migration"
echo "====================================="

# Backup current state
echo "📦 Creating backup..."
git add .
git commit -m "Pre-workspaces backup" || true
git push origin backup/$(date +%Y%m%d-%H%M%S) || true

# Stop services
echo "🛑 Stopping PM2 services..."
pm2 stop all

# Clean everything
echo "🧹 Cleaning old node_modules..."
rm -rf node_modules package-lock.json
rm -rf tpe-backend/node_modules tpe-backend/package-lock.json
rm -rf tpe-front-end/node_modules tpe-front-end/package-lock.json

# Install with workspaces
echo "📦 Installing dependencies with workspaces..."
npm install --legacy-peer-deps

# Fix SQLite imports
echo "🔧 Fixing database imports..."
find tpe-backend -name "*.js" -type f -exec sed -i 's/database\.sqlite/database/g' {} \;

# Build frontend
echo "🏗️ Building frontend..."
cd tpe-front-end
node ../node_modules/next/dist/bin/next build
cd ..

# Update PM2
echo "♻️ Restarting PM2..."
pm2 restart ecosystem.config.js
pm2 save

echo "✅ Migration complete!"
pm2 status
```

## ✅ Success Criteria

- Backend starts without "Module not found" errors
- Frontend compiles and serves pages
- No SQLite binding errors
- API endpoints respond correctly
- PM2 processes stay running
- Automated deployments work without manual intervention