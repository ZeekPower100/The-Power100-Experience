# Server Configuration Troubleshooting Guide

## Standard Server Restart Protocol (REQUIRED)

**⚠️ CRITICAL: Always follow this exact protocol when restarting servers throughout the project**

### 1. Find Processes Using Required Ports
**FIRST: Identify what's using the ports**
```bash
# Check port 5000 (backend)
netstat -ano | findstr :5000

# Check port 3002 (frontend) 
netstat -ano | findstr :3002

# Example output: TCP [::1]:5000 [::]:0 LISTENING 26912
# The last number (26912) is the Process ID (PID)
```

### 2. Kill Specific Process by PID
**SECOND: Kill using the exact Process ID found**
```bash
# Kill by PID (replace XXXX with actual PID from step 1)
taskkill //F //PID XXXX

# Example: taskkill //F //PID 26912
```

### 3. Verify Ports Are Free
**THIRD: Confirm ports are no longer in use**
```bash
# These should return empty (no results)
netstat -ano | findstr :5000
netstat -ano | findstr :3002
```

### 4. Alternative: Kill All Node Processes (Use Sparingly)
**ONLY if you need to kill ALL Node processes at once**
```bash
# Windows - kills ALL Node processes
taskkill //F //IM node.exe

# PowerShell alternative
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
```

**⚠️ WARNING: Method 4 will kill ALL Node processes on your system, not just our project servers**

### 2. Verify Port Configuration Consistency
**Standard Configuration:**
- **Backend**: Port 5000 (default in .env file)
- **Frontend**: Port 3002
- **API URL**: `http://localhost:5000/api`

**Check these files match:**
```bash
# Frontend environment variable
cat tpe-front-end/.env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Frontend API configuration
grep "API_BASE_URL" tpe-front-end/src/lib/api.ts
# Should default to: http://localhost:5000/api
```

### 3. Restart Servers in Order
```bash
# 1. Start Backend (Port 5000)
cd tpe-backend
npm start

# Verify backend is running:
curl http://localhost:5000/health

# 2. Start Frontend (Port 3002)
cd tpe-front-end
npm run dev

# Verify frontend is running:
# Open http://localhost:3002/admindashboard
```

### 4. Test Connection
```bash
# Test backend directly
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@power100.io","password":"admin123"}'

# Should return a JWT token
```

## Common "Failed to fetch" Error Solutions

This document addresses the recurring server configuration issues that cause the frontend to be unable to connect to the backend API.

### Problem: TypeError: Failed to fetch

**Symptoms:**
- Frontend shows "Failed to fetch" error when trying to login
- API requests fail with network errors
- Frontend can't connect to backend

### Root Causes & Solutions

#### 1. Backend Server Not Running
**Check:** Use curl to test backend directly
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@power100.io","password":"admin123"}'
```

**Expected Response:** JSON with token and user data
**If Connection Refused:** Backend server is not running

**Solution:**
```bash
cd tpe-backend
node src/server.js
```

#### 2. Server Binding Issues (Windows-specific)
**Problem:** Server starts but doesn't bind to network interface
**Symptoms:** Server shows "running on port 5000" but curl fails

**Solution:** Ensure explicit host binding in server.js:
```javascript
const HOST = process.env.HOST || 'localhost';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
```

#### 3. Port Configuration Mismatch
**Check Current Configuration:**

**Frontend API URL:** `tpe-front-end/src/lib/api.ts`
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

**Backend Port:** `tpe-backend/.env`
```
PORT=5000
```

**Backend CORS:** `tpe-backend/src/server.js`
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',  // Next.js default
    'http://localhost:3001',
    'http://localhost:3002',  // Sometimes used
  ]
}));
```

#### 4. Corrupted Next.js Build
**Symptoms:** Next.js shows manifest errors or route errors

**Solution:**
```bash
cd tpe-front-end
# Remove corrupted build directory
rmdir /s /q .next  # Windows
# or
rm -rf .next       # Unix/Git Bash

# Restart development server
npm run dev
```

### Quick Diagnostic Checklist

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@power100.io","password":"admin123"}'
   ```

2. **Frontend Health Check:**
   ```bash
   curl -I http://localhost:3000
   ```

3. **Port Verification:**
   ```bash
   netstat -ano | findstr ":3000\|:5000"  # Windows
   lsof -i :3000 -i :5000                 # Unix
   ```

### Standard Startup Procedure

#### Terminal 1 - Backend
```bash
cd tpe-backend
node src/server.js
# Wait for: "🚀 Server running on http://localhost:5000"
```

#### Terminal 2 - Frontend  
```bash
cd tpe-front-end
npm run dev
# Wait for: "✓ Ready in [time]s"
```

#### Verify Connection
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@power100.io","password":"admin123"}'
```

### Configuration Files to Check

1. **`tpe-backend/.env`**
   - PORT=5000
   - FRONTEND_URL=http://localhost:3000

2. **`tpe-backend/src/server.js`**
   - CORS origins include frontend port
   - Server binds to localhost explicitly

3. **`tpe-front-end/src/lib/api.ts`**
   - API_BASE_URL points to correct backend port

### Prevention Measures

1. **Always verify both servers are running before testing**
2. **Use explicit host binding in server.js**
3. **Keep port configurations consistent across files**
4. **Document any port changes in both frontend and backend**
5. **Test API connectivity with curl before browser testing**

### Emergency Recovery

If servers are completely unresponsive:

```bash
# Kill any hanging Node processes
taskkill /f /im node.exe  # Windows
pkill node                # Unix

# Clean build directories
cd tpe-front-end && rmdir /s /q .next
cd tpe-backend && rm -rf node_modules/.cache

# Restart in correct order
cd tpe-backend && node src/server.js
# In new terminal:
cd tpe-front-end && npm run dev
```

---

**Last Updated:** August 5, 2025
**Status:** Active troubleshooting guide for recurring server connectivity issues