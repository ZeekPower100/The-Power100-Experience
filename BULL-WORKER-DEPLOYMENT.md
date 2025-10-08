# Bull Worker Deployment Guide

## Current Production Status

**Running processes:**
- `tpe-backend` (ID: 13) - API server
- `tpe-frontend` (ID: 12) - Next.js frontend

**Need to add:**
- `tpe-worker` - Bull queue worker for follow-ups

---

## Prerequisites

### 1. Check Redis is installed and running

```bash
# On production server
redis-cli ping
# Should return: PONG
```

If Redis is not installed:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. Add Environment Variables

Add to `/home/ubuntu/The-Power100-Experience/tpe-backend/.env` (or `.env.production`):

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your_password_if_set

# n8n Outbound Webhook
N8N_OUTBOUND_WEBHOOK_URL=http://localhost:5678/webhook/sms-outbound

# OpenAI (should already exist)
OPENAI_API_KEY=your_existing_key
```

---

## Deployment Steps

### Step 1: Deploy Code to Production

```bash
# On production server
cd /home/ubuntu/The-Power100-Experience
git pull origin master
cd tpe-backend
npm install
```

### Step 2: Start the Worker

**Option A - Using ecosystem.config.js (Recommended):**

```bash
cd /home/ubuntu/The-Power100-Experience/tpe-backend

# Start just the worker (backend already running)
pm2 start ecosystem.config.js --only tpe-worker

# Save the process list
pm2 save
```

**Option B - Manual start:**

```bash
cd /home/ubuntu/The-Power100-Experience/tpe-backend
pm2 start src/workers/followUpWorker.js --name tpe-worker
pm2 save
```

### Step 3: Verify Worker is Running

```bash
# Check status
pm2 status

# Should now show 3 processes:
# - tpe-backend (existing)
# - tpe-frontend (existing)
# - tpe-worker (NEW)

# Check worker logs
pm2 logs tpe-worker --lines 20

# Should see:
# [FollowUpWorker] ✅ Worker ready and listening for jobs
```

---

## Verification Tests

### 1. Test Worker is Processing

```bash
# Check queue stats
curl http://localhost:5000/api/scheduler/stats

# Should return:
# {"success":true,"stats":{"scheduled_count":...}}
```

### 2. Check Worker Logs

```bash
pm2 logs tpe-worker --lines 50
```

### 3. Test End-to-End (Optional)

Create a test follow-up via AI Concierge and verify:
1. Job appears in Bull queue
2. Worker processes it at scheduled time
3. SMS sent via n8n

---

## Management Commands

### View Worker Status
```bash
pm2 status tpe-worker
pm2 info tpe-worker
```

### View Worker Logs
```bash
# Live tail
pm2 logs tpe-worker

# Last 50 lines
pm2 logs tpe-worker --lines 50

# Errors only
pm2 logs tpe-worker --err
```

### Restart Worker
```bash
pm2 restart tpe-worker
```

### Stop Worker
```bash
pm2 stop tpe-worker
```

### Delete Worker
```bash
pm2 delete tpe-worker
```

---

## Troubleshooting

### Worker Won't Start

**Check logs:**
```bash
pm2 logs tpe-worker --err
```

**Common issues:**

1. **Redis not running:**
```bash
sudo systemctl status redis-server
sudo systemctl start redis-server
```

2. **Missing environment variables:**
```bash
cat /home/ubuntu/The-Power100-Experience/tpe-backend/.env | grep REDIS
cat /home/ubuntu/The-Power100-Experience/tpe-backend/.env | grep N8N_OUTBOUND
```

3. **Wrong path:**
```bash
# Verify worker file exists
ls -la /home/ubuntu/The-Power100-Experience/tpe-backend/src/workers/followUpWorker.js
```

### Jobs Not Processing

1. **Check worker is running:**
```bash
pm2 status tpe-worker
# Should show "online"
```

2. **Check Redis connection:**
```bash
redis-cli ping
# Should return PONG
```

3. **Check for jobs in queue:**
```bash
curl http://localhost:5000/api/scheduler/stats
```

4. **Check worker logs for errors:**
```bash
pm2 logs tpe-worker --lines 100
```

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Stop the worker
pm2 stop tpe-worker

# Remove from PM2
pm2 delete tpe-worker

# Save PM2 list
pm2 save

# Backend and frontend continue running normally
```

---

## Production Checklist

- [ ] Redis installed and running
- [ ] Environment variables added to `.env`
- [ ] Code deployed: `git pull && npm install`
- [ ] Worker started: `pm2 start ecosystem.config.js --only tpe-worker`
- [ ] PM2 saved: `pm2 save`
- [ ] Worker shows "online": `pm2 status`
- [ ] Worker logs show "ready": `pm2 logs tpe-worker`
- [ ] Queue stats accessible: `curl localhost:5000/api/scheduler/stats`

---

## What the Worker Does

1. **Listens** to Bull queue (Redis)
2. **Executes jobs** at their exact scheduled time
3. **Personalizes messages** using AI (if enabled)
4. **Sends SMS** via n8n webhook → GHL
5. **Marks as sent** in database
6. **Auto-retries** if sending fails (3 attempts)
7. **Logs everything** for monitoring

---

## Performance

- **Concurrency**: 5 jobs simultaneously
- **Rate limit**: 10 jobs/minute (SMS safe)
- **Memory**: ~50-100MB typical usage
- **Auto-restart**: If crashes or exceeds 512MB

---

## Questions?

- Worker not starting? Check logs: `pm2 logs tpe-worker --err`
- Jobs not processing? Verify Redis: `redis-cli ping`
- Need to restart? `pm2 restart tpe-worker`
