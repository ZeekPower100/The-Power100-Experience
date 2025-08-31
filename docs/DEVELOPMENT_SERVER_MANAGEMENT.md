# Development Server Management Guide

## ⚠️ CRITICAL: Always Use --legacy-peer-deps

**IMPORTANT**: Due to React version conflicts in this project, ALWAYS use `--legacy-peer-deps` flag when running `npm install`:
```bash
npm install --legacy-peer-deps
```
This applies to ALL npm install commands throughout the project, whether from root or within workspaces.

## Best Practices for Restarting Development Servers

### ⚠️ IMPORTANT: Avoid Using `taskkill` When Possible

Using `taskkill` to forcefully terminate Node.js processes can cause issues with npm workspaces, including:
- Broken symlinks in node_modules
- Module resolution errors (`MODULE_NOT_FOUND`)
- Incomplete cleanup of resources
- Port binding issues

## Recommended Methods for Server Management

### 1. **Graceful Shutdown (PREFERRED)**
**Use Ctrl+C in the terminal where the server is running**
- Allows Next.js/Express to clean up properly
- Preserves npm workspace symlinks
- Ensures ports are released correctly
- No module resolution issues after restart

### 2. **Hot Module Replacement (HMR)**
**For frontend changes that aren't being picked up:**
- Next.js dev server auto-reloads on file save
- If HMR fails, try:
  - Clear Next.js cache: `rm -rf tpe-front-end/.next`
  - Touch the file to trigger reload: `touch tpe-front-end/src/app/layout.tsx`
  - Edit and save any parent component

### 3. **PM2 Process Manager (If Configured)**
```bash
# List all processes
pm2 list

# Restart specific service
pm2 restart frontend
pm2 restart backend

# Reload with zero downtime
pm2 reload frontend
```

### 4. **NPM Scripts from Workspace Directory**
If you must restart programmatically:
```bash
# Stop and start from within the workspace
cd tpe-front-end
# Press Ctrl+C to stop
npm run dev

# Or for backend
cd tpe-backend
# Press Ctrl+C to stop
npm start
```

### 5. **Clear Cache for Persistent Issues**
When changes aren't being picked up:
```bash
# Clear Next.js build cache
rm -rf tpe-front-end/.next

# Clear Node module cache
npm cache clean --force

# Clear TypeScript build info
rm -rf tpe-front-end/tsconfig.tsbuildinfo
```

## If You Must Use `taskkill`

### Windows Command Syntax
```bash
# Find the process ID
netstat -ano | findstr :3002  # for frontend
netstat -ano | findstr :5000  # for backend

# Kill with double slashes (Git Bash on Windows)
taskkill //PID [PID_NUMBER] //F

# Alternative: Use PowerShell
Stop-Process -Id [PID_NUMBER] -Force
```

### After Using `taskkill` - Recovery Steps
1. **Reinstall dependencies** (fixes module resolution):
   ```bash
   npm install --legacy-peer-deps  # from project root
   ```

2. **Or try starting from workspace directory**:
   ```bash
   cd tpe-front-end && npm run dev
   ```

3. **If ports are still bound**:
   ```bash
   # Windows: Find and kill process on specific port
   netstat -ano | findstr :3002
   taskkill //PID [PID] //F
   ```

## Common Issues and Solutions

### Issue: "MODULE_NOT_FOUND" after taskkill
**Cause:** npm workspace symlinks broken
**Solution:** 
```bash
# From project root
npm install --legacy-peer-deps
# Then start normally
cd tpe-front-end && npm run dev
```

### Issue: Changes not reflected in browser
**Solutions in order of preference:**
1. Hard refresh browser: `Ctrl+Shift+R`
2. Clear Next.js cache: `rm -rf tpe-front-end/.next`
3. Restart dev server with Ctrl+C (not taskkill)
4. Check for syntax errors in console
5. Verify file saved successfully

### Issue: Port already in use
**Solution:**
```bash
# Find process using port
netstat -ano | findstr :3002
# Kill it properly
taskkill //PID [PID] //F
# Or change port in package.json
```

## Development Workflow Best Practices

1. **Keep terminals open** for each service (frontend, backend)
2. **Use Ctrl+C** for graceful shutdown
3. **Let HMR handle most updates** automatically
4. **Only restart when necessary** (dependency changes, config changes)
5. **Use workspace commands** when possible: `npm run dev` from within workspace
6. **Monitor console output** for errors before restarting

## Quick Reference

| Scenario | Command | Location |
|----------|---------|----------|
| Stop frontend gracefully | `Ctrl+C` | Terminal running frontend |
| Start frontend | `npm run dev` | `tpe-front-end/` directory |
| Stop backend gracefully | `Ctrl+C` | Terminal running backend |
| Start backend | `npm start` | `tpe-backend/` directory |
| Install all dependencies | `npm install --legacy-peer-deps` | Project root |
| Clear frontend cache | `rm -rf .next` | `tpe-front-end/` directory |
| Find process on port | `netstat -ano \| findstr :PORT` | Any location |
| Force kill (last resort) | `taskkill //PID [PID] //F` | Any location |

## Environment-Specific Notes

### Windows with Git Bash
- Use double slashes for taskkill: `//PID` instead of `/PID`
- Paths use forward slashes: `cd tpe-front-end`
- Some commands may need winpty prefix

### Production (PM2)
- Never use taskkill on production
- Always use PM2 commands for process management
- Check ecosystem.config.js for service names