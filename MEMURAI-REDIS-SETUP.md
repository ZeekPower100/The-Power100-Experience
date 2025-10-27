# Memurai (Redis for Windows) - Setup & Troubleshooting

## Overview
The Power100 Experience uses **Memurai** (Windows-compatible Redis) for BullMQ worker queues that handle:
- IGE Queue (hourly automation)
- Event Orchestration Queue
- Follow-up Queue
- Proactive Message Queue
- Event Message Queue

**CRITICAL**: Without Memurai running, all workers are NON-FUNCTIONAL.

---

## Installation Location
- **Path**: `C:\Program Files\Memurai\`
- **Executable**: `memurai.exe`
- **Config**: `memurai.conf`
- **Log**: `memurai-log.txt`
- **Port**: `6379` (default Redis port)

---

## ✅ Automatic Startup Configuration (COMPLETED)

Memurai is configured to start automatically with Windows:

```powershell
# Verify auto-start is enabled
sc.exe qc Memurai | grep "START_TYPE"
# Should show: START_TYPE : 2   AUTO_START
```

**To change startup type (requires Administrator):**
```powershell
# Set to automatic
sc.exe config Memurai start= auto

# Set to manual (not recommended)
sc.exe config Memurai start= demand
```

**Or use GUI:**
1. Press `Win + R`, type `services.msc`
2. Find "Memurai"
3. Right-click → Properties → Startup type → Automatic

---

## 🔧 Common Issues & Solutions

### Issue 1: Workers showing `ECONNREFUSED 127.0.0.1:6379`

**Cause**: Memurai service is not running

**Solution**:
```powershell
# Check status
sc.exe query Memurai

# Start service (as Administrator)
net start Memurai
```

---

### Issue 2: Memurai won't start - "System error 183"

**Cause**: Lock file conflict from previous crash

**Full Error**: `Cannot create a file when that file already exists`

**Solution**: Clean up orphaned processes
```powershell
# Find process holding port 6379
netstat -ano | grep "6379"

# Kill orphaned node.exe processes (replace PID)
taskkill /PID <PID> /F

# Then start Memurai
net start Memurai
```

---

### Issue 3: "Permission denied" when binding to port 6379

**Cause**: Another process is using port 6379

**Solution**:
```powershell
# Find what's using the port
netstat -ano | grep "6379" | grep "LISTENING"

# Identify the process
tasklist | grep "<PID>"

# Kill the conflicting process
taskkill /PID <PID> /F

# Restart Memurai
net start Memurai
```

---

### Issue 4: Memurai Developer Edition auto-shutdown

**From logs**: `Memurai Developer Edition automatic shutdown...`

**Cause**: Developer Edition shuts down after 10 days

**Solution**:
1. Restart the service: `net start Memurai`
2. For production, upgrade to Memurai Pro (no auto-shutdown)
3. See: https://www.memurai.com/faq

---

## 🔍 Verification Commands

```powershell
# Check if Memurai is running
sc.exe query Memurai

# Check port 6379 is listening
netstat -ano | grep "6379"

# View recent logs
Get-Content "C:\Program Files\Memurai\memurai-log.txt" -Tail 50

# Test connection with Memurai CLI
cd "C:\Program Files\Memurai"
.\memurai-cli.exe ping
# Should return: PONG
```

---

## 🚀 Manual Start/Stop Commands

**Start** (requires Administrator):
```powershell
net start Memurai
```

**Stop** (requires Administrator):
```powershell
net stop Memurai
```

**Restart** (requires Administrator):
```powershell
net stop Memurai && net start Memurai
```

---

## 📊 Worker Queue Configuration

Workers connect to Memurai via `ioredis` in these files:
- `tpe-backend/src/queues/igeQueue.js`
- `tpe-backend/src/queues/eventOrchestrationQueue.js`
- `tpe-backend/src/queues/followUpQueue.js`
- `tpe-backend/src/queues/proactiveMessageQueue.js`
- `tpe-backend/src/queues/eventMessageQueue.js`

**Connection config** (from queue files):
```javascript
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});
```

**Environment variables** (optional - defaults used if not set):
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # No password by default
```

---

## 🛡️ Production Deployment

For production environments, ensure:

1. ✅ Memurai service set to "Automatic" startup
2. ✅ Monitoring for Memurai availability
3. ✅ Alert if workers show ECONNREFUSED errors
4. ⚠️ Consider upgrading to Memurai Pro (no 10-day limit)

---

## 📝 Critical Incident Resolution (October 26, 2025)

**Problem**: All workers non-functional with repeated `ECONNREFUSED 127.0.0.1:6379` errors

**Root Cause Chain**:
1. Memurai service was STOPPED (unknown trigger)
2. Orphaned node.exe process (PID 32624) held dead connection to port 6379
3. Memurai couldn't restart due to port conflict
4. All BullMQ workers failed to connect

**Resolution Steps**:
1. Identified Memurai as stopped: `sc.exe query Memurai`
2. Found port conflict: `netstat -ano | grep "6379"`
3. Killed orphaned process: `taskkill /PID 32624 /F`
4. Started Memurai: `net start Memurai`
5. Set auto-start: `sc.exe config Memurai start= auto`
6. Verified workers functional ✅

**Prevention**:
- Memurai now set to AUTO_START
- Will survive system reboots
- No manual intervention needed

---

## 🔗 Resources

- Memurai Website: https://www.memurai.com
- Memurai FAQ: https://www.memurai.com/faq
- Redis Documentation: https://redis.io/documentation
- BullMQ Documentation: https://docs.bullmq.io

---

**Last Updated**: October 26, 2025
**Status**: ✅ Configured for automatic startup
