# The Power100 Experience - Production Runbook
## AI Concierge System - Phase 5 Complete

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Status**: Active
**Owner**: Development Team

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Health Monitoring](#health-monitoring)
3. [Performance Baselines](#performance-baselines)
4. [Troubleshooting Guides](#troubleshooting-guides)
5. [Rollback Procedures](#rollback-procedures)
6. [Escalation Paths](#escalation-paths)
7. [Maintenance Procedures](#maintenance-procedures)

---

## 1. System Overview

### Architecture Components

**Frontend**: Next.js 15.4.4
- **URL**: https://tpx.power100.io
- **Port**: 3000
- **Process Manager**: PM2 (tpe-frontend)

**Backend**: Node.js/Express
- **URL**: http://localhost:5000 (internal)
- **Port**: 5000
- **Process Manager**: PM2 (tpe-backend)

**Database**: PostgreSQL 15.12
- **Host**: tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com
- **Database**: tpedb
- **User**: tpeadmin

**Caching**: Redis (Phase 5 Day 3)
- **Host**: localhost:6379
- **Purpose**: Contractor bundles, event context caching

**Infrastructure**: AWS
- **EC2**: Application servers
- **RDS**: PostgreSQL database
- **ElastiCache**: Redis (if configured)

---

## 2. Health Monitoring

### Quick Health Check

```bash
# 1. Check all PM2 processes
pm2 list

# 2. Check health endpoint
curl http://localhost:5000/api/health

# 3. Check public endpoints
curl https://tpx.power100.io/api/health
curl https://tpx.power100.io/api/state-machine/diagram
curl https://tpx.power100.io/api/state-machine/metadata
```

**Expected Response (Health Endpoint)**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T01:41:28.253Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### System Health Indicators

#### ✅ Healthy System
- All PM2 processes showing "online" status
- Health endpoint returns 200 OK
- p95 latency < 300ms (well below 500ms target)
- Error rate < 0.1%
- Database connections < 80% of max pool

#### ⚠️ Warning Signs
- PM2 process restart count > 5 in 1 hour
- p95 latency between 300-500ms
- Error rate between 0.1-1%
- Database connections > 80% of max pool
- Redis cache hit rate < 50%

#### ❌ Critical Issues
- Any PM2 process showing "errored" or "stopped"
- Health endpoint returns 500 or timeout
- p95 latency > 500ms
- Error rate > 1%
- Database connections at max pool
- Redis unavailable

### Monitoring Commands

```bash
# Check PM2 logs
pm2 logs tpe-backend --lines 50
pm2 logs tpe-frontend --lines 50

# Check PM2 metrics
pm2 monit

# Check database connections
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT count(*) FROM pg_stat_activity WHERE datname='tpedb';"

# Check Redis status (if running)
redis-cli ping
redis-cli INFO stats

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

---

## 3. Performance Baselines

### Production Performance (Established October 17, 2025)

| Endpoint | Success Rate | p95 Latency | Rating |
|----------|-------------|-------------|---------|
| State Machine Diagram | 100% | 172ms | ✅ EXCELLENT |
| State Machine Metadata | 100% | 170ms | ✅ EXCELLENT |
| Health Check | 100% | 169ms | ✅ EXCELLENT |
| **OVERALL** | **100%** | **170.33ms avg** | **✅ EXCELLENT** |

### Performance Targets

- **p95 Latency**: < 500ms (Current: 170ms - 66% better)
- **Success Rate**: > 99% (Current: 100%)
- **Error Rate**: < 1% (Current: 0%)
- **Database Query Time**: < 100ms for cached data
- **Cache Hit Rate**: > 70% for contractor data

### Phase 5 Optimizations Applied

1. **Day 2: Database Optimization**
   - UPSERT pattern for state persistence
   - Indexed queries for faster lookups
   - Query performance improvements

2. **Day 3: Redis Caching**
   - Contractor bundles: 5-minute TTL
   - Event context: 1-minute TTL
   - State machine states: Session-based (no expiry)

3. **Day 4: Load Testing**
   - Baseline measurements established
   - Health endpoint fixed (0% → 100% success)
   - Performance validated

---

## 4. Troubleshooting Guides

### Issue 1: Backend Process Down

**Symptoms**:
- `pm2 list` shows tpe-backend as "stopped" or "errored"
- Health endpoint returns connection refused
- Frontend shows API connection errors

**Investigation**:
```bash
# Check PM2 logs for errors
pm2 logs tpe-backend --lines 100 --err

# Check system resources
free -h
df -h
```

**Resolution**:
```bash
# Restart backend
pm2 restart tpe-backend

# If restart fails, check logs and fix code issue
pm2 logs tpe-backend --lines 200
```

### Issue 2: High Latency (p95 > 500ms)

**Symptoms**:
- Slow API responses
- User complaints about performance
- Benchmark shows high p95 latency

**Investigation**:
```bash
# Run benchmark
cd /home/ubuntu/The-Power100-Experience/tpe-backend
node scripts/benchmarkProduction.js

# Check database slow queries
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis cache hit rate
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

**Resolution**:
1. Check if Redis is running: `redis-cli ping`
2. Warm cache if needed: `node scripts/warmCache.js`
3. Review slow queries and add indexes if needed
4. Consider scaling database if consistently slow

### Issue 3: Health Endpoint Returns 404

**Symptoms**:
- `/api/health` returns 404 Not Found
- Monitoring checks fail

**Investigation**:
```bash
# Test health endpoint directly on backend
curl http://localhost:5000/api/health

# Test through Next.js proxy
curl https://tpx.power100.io/api/health
```

**Resolution**:
- If backend works but proxy doesn't, check Next.js rewrites in `next.config.js`
- Ensure `/api/health` route exists in `server.js` (added in Phase 5 Day 4)
- Restart frontend if needed: `pm2 restart tpe-frontend`

### Issue 4: Database Connection Errors

**Symptoms**:
- "Connection pool exhausted" errors
- "Too many connections" errors
- Queries timing out

**Investigation**:
```bash
# Check active connections
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT count(*), state FROM pg_stat_activity WHERE datname='tpedb' GROUP BY state;"

# Check max connections
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SHOW max_connections;"
```

**Resolution**:
1. Review connection pool settings in `database.js`
2. Kill idle connections if needed
3. Restart backend to reset connection pool: `pm2 restart tpe-backend`
4. Contact AWS support if RDS needs parameter adjustment

### Issue 5: Redis Cache Not Working

**Symptoms**:
- Low cache hit rate (< 50%)
- Cache warming fails
- Slow response times despite caching

**Investigation**:
```bash
# Check if Redis is running
redis-cli ping

# Check Redis memory usage
redis-cli INFO memory

# Check key count
redis-cli DBSIZE

# Check for specific keys
redis-cli KEYS "contractor:*" | head -10
```

**Resolution**:
```bash
# Start Redis if not running
sudo systemctl start redis

# Or on Windows (development):
# redis-server

# Warm cache
cd /home/ubuntu/The-Power100-Experience/tpe-backend
node scripts/warmCache.js

# Clear cache if corrupted
redis-cli FLUSHDB
node scripts/warmCache.js
```

---

## 5. Rollback Procedures

### Rollback Decision Criteria

**Immediate Rollback Required If**:
- Critical security vulnerability discovered
- Data corruption or loss occurring
- System completely unavailable for > 5 minutes
- Error rate > 5% for > 10 minutes

**Schedule Rollback If**:
- Performance degradation > 50% from baseline
- Non-critical bugs affecting user experience
- Error rate 1-5% sustained for > 30 minutes

### Rollback Procedure

#### Step 1: Identify Last Known Good Version

```bash
# On production server
cd /home/ubuntu/The-Power100-Experience

# Check git history
git log --oneline -20

# Identify commit hash to rollback to
# Example: 6146a13 (before problematic deployment)
```

#### Step 2: Execute Rollback

```bash
# Stop all processes
pm2 stop all

# Rollback code
git checkout <commit-hash>

# Example: git checkout 6146a13

# Reinstall dependencies (only if package.json changed)
cd tpe-backend && npm install
cd ../tpe-front-end && npm install

# Rebuild frontend
cd tpe-front-end
npm run build

# Restart all processes
pm2 restart all
```

#### Step 3: Verify Rollback

```bash
# Wait 2 minutes for processes to stabilize
sleep 120

# Check health
curl http://localhost:5000/api/health
curl https://tpx.power100.io/api/health

# Run benchmark
cd /home/ubuntu/The-Power100-Experience/tpe-backend
node scripts/benchmarkProduction.js

# Check PM2 status
pm2 list
pm2 logs --lines 50
```

#### Step 4: Database Rollback (If Needed)

**⚠️ WARNING**: Only rollback database if absolutely necessary. Data loss possible!

```bash
# If database migration was applied, check migrations table
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Contact database admin before proceeding with database rollback
# Typically requires restoring from backup
```

#### Step 5: Communication

1. **Update team** on Slack/Discord about rollback
2. **Document incident** including:
   - What went wrong
   - When rollback occurred
   - What version was rolled back to
   - Current system status
3. **Schedule post-mortem** to analyze root cause

### Emergency Contacts

- **Primary**: Development Team Lead
- **Secondary**: DevOps Team
- **Database Issues**: AWS RDS Support
- **Infrastructure**: AWS Support

---

## 6. Escalation Paths

### Severity Levels

#### P0 - Critical (Immediate Action)
- **Definition**: Complete system outage or data loss
- **Response Time**: Immediate (24/7)
- **Escalation**: Alert all team members immediately
- **Examples**:
  - Database unavailable
  - All API endpoints returning 500
  - Data corruption detected

#### P1 - High (Urgent Action)
- **Definition**: Major functionality impaired
- **Response Time**: Within 1 hour
- **Escalation**: Alert on-call engineer
- **Examples**:
  - Single critical endpoint down
  - Performance degradation > 50%
  - Error rate > 5%

#### P2 - Medium (Schedule Fix)
- **Definition**: Minor functionality impaired
- **Response Time**: Within 4 hours
- **Escalation**: Create ticket, notify team
- **Examples**:
  - Non-critical endpoint slow
  - UI bugs affecting some users
  - Cache not working optimally

#### P3 - Low (Backlog)
- **Definition**: Cosmetic issues or enhancements
- **Response Time**: Next sprint
- **Escalation**: Add to backlog
- **Examples**:
  - UI polish needed
  - Performance optimization opportunities
  - Feature requests

### Escalation Workflow

```
1. Detection (Monitoring/User Report)
   ↓
2. Initial Assessment (On-Call Engineer)
   ↓
3. Classify Severity (P0-P3)
   ↓
4. P0/P1: Immediate Action
   P2/P3: Create Ticket
   ↓
5. Resolve or Escalate to Team Lead
   ↓
6. Document and Post-Mortem (if P0/P1)
```

---

## 7. Maintenance Procedures

### Routine Maintenance Schedule

#### Daily
- [ ] Check PM2 process status: `pm2 list`
- [ ] Review error logs: `pm2 logs --lines 100 --err`
- [ ] Monitor disk space: `df -h`

#### Weekly
- [ ] Run performance benchmark: `node scripts/benchmarkProduction.js`
- [ ] Review database slow queries
- [ ] Check cache hit rates
- [ ] Review and archive old logs

#### Monthly
- [ ] Security updates: `npm audit` and patch
- [ ] Database vacuum and analyze
- [ ] Review and optimize indexes
- [ ] Capacity planning review

#### Quarterly
- [ ] Full system performance audit
- [ ] Disaster recovery drill
- [ ] Update documentation
- [ ] Review and update monitoring thresholds

### Deployment Procedure

**Standard Deployment (Non-Emergency)**:

1. **Pre-Deployment Checklist**:
   - [ ] All tests passing
   - [ ] Code reviewed and approved
   - [ ] Staging environment tested
   - [ ] Deployment notes prepared

2. **Deployment Steps**:
   ```bash
   # Code is auto-deployed via git push to master
   # Monitor deployment:
   git log -1  # Verify latest commit

   # Wait 13-14 minutes for auto-deployment
   sleep 840

   # Verify deployment
   curl https://tpx.power100.io/api/health
   ```

3. **Post-Deployment Verification**:
   - [ ] Health check passing
   - [ ] Benchmark results within baseline
   - [ ] No error spikes in logs
   - [ ] PM2 processes stable

4. **Rollback if Needed**: See [Rollback Procedures](#rollback-procedures)

### Cache Maintenance

```bash
# Warm cache after deployment
cd /home/ubuntu/The-Power100-Experience/tpe-backend
node scripts/warmCache.js

# Clear cache if needed (use sparingly)
redis-cli FLUSHDB

# Check cache statistics
redis-cli INFO stats
```

### Database Maintenance

```bash
# Vacuum and analyze (run during low-traffic periods)
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "VACUUM ANALYZE ai_concierge_sessions;"

# Check table sizes
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(tablename::text) DESC LIMIT 10;"

# Check index usage
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC LIMIT 10;"
```

---

## 📞 Quick Reference

### Critical Commands

```bash
# System Status
pm2 list
pm2 monit

# Health Checks
curl http://localhost:5000/api/health
curl https://tpx.power100.io/api/health

# Performance Benchmark
node scripts/benchmarkProduction.js

# Logs
pm2 logs tpe-backend --lines 100
pm2 logs tpe-frontend --lines 100

# Restart Services
pm2 restart tpe-backend
pm2 restart tpe-frontend
pm2 restart all

# Rollback
git checkout <commit-hash>
pm2 restart all
```

### Performance Baselines (Phase 5)

- **p95 Latency**: 170ms (Target: < 500ms)
- **Success Rate**: 100% (Target: > 99%)
- **Cache Hit Rate**: > 70% (Target)
- **Database Query**: < 100ms cached (Target)

### Contact Information

- **Team Lead**: [Name]
- **DevOps**: [Name]
- **AWS Support**: [Account ID]
- **Emergency**: [24/7 On-Call]

---

**Document Maintenance**:
- Review quarterly
- Update after major incidents
- Update after architecture changes
- Version control in git

**Last Review**: October 17, 2025
**Next Review**: January 17, 2026
**Document Owner**: Development Team
