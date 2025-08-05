# Development Server Troubleshooting Guide

## 🚨 Common Issues & Solutions

This guide documents solutions to common development server issues based on real troubleshooting sessions.

---

## Issue #1: White Screen / Blank Pages

### **Symptoms:**
- Frontend loads but shows completely white/blank screen
- No visible content, even on simple test pages
- Browser console shows errors

### **Primary Causes:**
1. **React JSX Runtime Missing** - Most common cause
2. **TypeScript compilation errors** 
3. **Dependency version conflicts**
4. **Missing or corrupted node_modules**

### **Solution Steps:**

#### Step 1: Check Browser Console
```bash
# Open browser Dev Tools (F12) and look for errors like:
# "Cannot find module 'react/jsx-runtime'"
# "Failed to fetch"
# TypeScript compilation errors
```

#### Step 2: Clean Reinstall Dependencies
```bash
cd tpe-front-end

# Remove existing dependencies
rm -rf node_modules
rm -f package-lock.json

# Reinstall with force flag
npm install --force

# If still issues, try:
npm audit fix --force
```

#### Step 3: Temporary TypeScript Fix
If TypeScript strict mode is causing compilation failures:

```json
// In tsconfig.json - temporarily set:
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true
  }
}
```

#### Step 4: Test with Simple Pages
Create minimal test pages to isolate issues:

```tsx
// src/app/test/page.tsx
export default function TestPage() {
  return <h1>Test Working</h1>;
}
```

---

## Issue #2: Failed to Fetch / API Connection Errors

### **Symptoms:**
- Frontend loads but can't connect to backend
- "Failed to fetch" errors in console
- CORS errors
- Authentication failures

### **Root Causes:**
1. **Port mismatches** between frontend/backend
2. **CORS configuration** not matching actual ports
3. **Missing environment variables** (JWT_SECRET, etc.)
4. **Backend not running** or crashed

### **Solution Steps:**

#### Step 1: Verify Server Status
```bash
# Check backend health
curl http://localhost:5000/health
# Should return: {"status":"ok",...}

# Check what's running on ports
netstat -ano | findstr ":3000\|:5000"
```

#### Step 2: Port Configuration Audit
**Critical**: Ensure all configurations match actual running ports

```bash
# Frontend typically runs on: 3000, 3004, 3005, 3006 (Next.js auto-assigns)
# Backend should run on: 5000

# Check frontend port in terminal output:
# "Local: http://localhost:3006"

# Update backend CORS immediately:
# tpe-backend/.env
FRONTEND_URL=http://localhost:3006  # Match actual frontend port
```

#### Step 3: Required Environment Variables
Ensure `tpe-backend/.env` contains:

```env
FRONTEND_URL=http://localhost:3000  # Match actual frontend port
PORT=5000
NODE_ENV=development
DATABASE_TYPE=sqlite
USE_SQLITE=true
JWT_SECRET=power100-development-secret-key-2024  # Required for auth
```

#### Step 4: Restart Servers in Correct Order
```bash
# 1. Kill all processes
powershell "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force"

# 2. Start backend first
cd tpe-backend
node src/server.js
# Wait for: "🚀 Server running on port 5000"

# 3. Start frontend
cd ../tpe-front-end  
npm run dev
# Note the actual port: "Local: http://localhost:3006"

# 4. Update backend CORS if port changed
# Edit tpe-backend/.env with correct frontend port
# Restart backend
```

---

## Issue #3: Database Connection Errors

### **Symptoms:**
- "PostgreSQL connection error" 
- Backend starts but crashes
- Database query failures

### **Solution:**
Ensure SQLite configuration in `tpe-backend/.env`:

```env
DATABASE_TYPE=sqlite
USE_SQLITE=true  # This is critical!
```

Without `USE_SQLITE=true`, the system defaults to PostgreSQL.

---

## Issue #4: Port Already in Use

### **Symptoms:**
- "EADDRINUSE: address already in use"
- Server won't start

### **Solution:**
```bash
# Find process using the port
netstat -ano | findstr :5000

# Kill specific process (replace PID)
powershell "Stop-Process -Id 12345 -Force"

# Or kill all node processes (nuclear option)
powershell "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force"
```

---

## 🛠️ Development Server Startup Checklist

Use this checklist every time you start development:

### **1. Environment Check:**
- [ ] `tpe-backend/.env` exists with all required variables
- [ ] JWT_SECRET is set
- [ ] USE_SQLITE=true is set
- [ ] FRONTEND_URL matches expected frontend port

### **2. Clean Startup Process:**
- [ ] Kill all existing node processes
- [ ] Start backend first: `cd tpe-backend && node src/server.js`
- [ ] Verify backend health: `curl http://localhost:5000/health`
- [ ] Start frontend: `cd tpe-front-end && npm run dev`
- [ ] Note actual frontend port from terminal output
- [ ] Update backend CORS if port differs from .env
- [ ] Restart backend if CORS was updated

### **3. Test Basic Functionality:**
- [ ] Frontend test page loads: `http://localhost:3000/test`
- [ ] Backend health check works
- [ ] Admin login works: admin@power100.io / admin123
- [ ] Browser console shows no critical errors

---

## 🚀 Quick Recovery Commands

Save these commands for quick troubleshooting:

```bash
# Complete reset - use when everything is broken
cd tpe-front-end
rm -rf node_modules package-lock.json
npm install --force
cd ../tpe-backend
powershell "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force"
node src/server.js &
cd ../tpe-front-end
npm run dev

# Quick port check
netstat -ano | findstr ":3000\|:5000"

# Test API connectivity
curl http://localhost:5000/health
curl -X POST -H "Content-Type: application/json" -d '{"email":"admin@power100.io","password":"admin123"}' http://localhost:5000/api/auth/login
```

---

## 📝 Configuration Files to Monitor

Keep these files in sync:

1. **`tpe-backend/.env`** - Port and CORS configuration
2. **`tpe-front-end/.env.local`** - API URL configuration  
3. **`tpe-front-end/tsconfig.json`** - TypeScript strictness
4. **`tpe-front-end/package.json`** - Dependencies

---

## 🔍 Debugging Tools

### Browser Developer Tools:
- **Console Tab**: Check for JavaScript errors
- **Network Tab**: Monitor API calls and CORS issues
- **Application Tab**: Check localStorage for auth tokens

### Command Line Tools:
```bash
# Port checking
netstat -ano | findstr :PORT

# Process management  
powershell "Get-Process | Where-Object {$_.ProcessName -eq 'node'}"

# API testing
curl -v http://localhost:5000/health

# CORS testing
curl -H "Origin: http://localhost:3000" -X OPTIONS http://localhost:5000/api/auth/me
```

---

## ⚠️ Critical Notes

1. **Port Mismatches**: The #1 cause of "Failed to fetch" errors. Always verify actual running ports match configuration.

2. **CORS Updates**: Any time the frontend port changes, the backend CORS must be updated and backend restarted.

3. **JWT Secret**: Required for authentication. Without it, login will fail with "secretOrPrivateKey must have a value".

4. **SQLite Flag**: `USE_SQLITE=true` is required, or the system tries to connect to PostgreSQL.

5. **Dependencies**: React 19 with Next.js 15.4.4 can have compatibility issues. Force reinstall resolves most problems.

---

## 📞 Emergency Recovery

If nothing else works:

1. **Complete Nuclear Reset:**
   ```bash
   cd tpe-front-end
   rm -rf node_modules .next package-lock.json
   npm install --force
   ```

2. **Verify Minimal Setup:**
   - Create simple test page
   - Use basic curl commands to test backend
   - Check all environment variables

3. **Incremental Testing:**
   - Get basic frontend working first
   - Get basic backend working second  
   - Connect them together last

This systematic approach will resolve 95% of development server issues.

---

## 🔗 Related Documentation

- **JSON Field Issues**: See `docs/JSON-FIELD-HANDLING.md` for handling SQLite JSON string parsing errors
- **Quick Start Guide**: See `docs/QUICK-START-DEV-SERVERS.md` for standard startup process