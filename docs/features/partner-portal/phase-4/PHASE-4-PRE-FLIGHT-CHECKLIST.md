# PHASE 4 - Production & Scaling
## Pre-Flight Checklist

**Purpose**: Verify all prerequisites before production deployment
**Date**: October 25, 2025

---

## PHASE 3 COMPLETION VERIFICATION

### Phase 3 Status
- [ ] Phase 3 COMPLETE (Lead management working)
- [ ] All Phase 3 endpoints functional
- [ ] Partner leads page working in development
- [ ] No critical bugs or errors in development
- [ ] All tests passing

**Verification Commands:**
```bash
# Test Phase 3 lead endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/partner-portal/leads/stats

# Should return lead statistics
```

---

## PRODUCTION INFRASTRUCTURE READINESS

### AWS Account & Resources

#### Database (AWS RDS)
- [ ] Production database already deployed ✅
  - Host: `tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com`
  - Database: `tpedb`
  - User: `tpeadmin`
  - Password: `dBP0wer100!!`
- [ ] Database accessible from deployment environment
- [ ] SSL connections enabled
- [ ] Automated backups configured
- [ ] Backup retention period set (30 days recommended)

**Verification Command:**
```bash
# Test production database connection
PGPASSWORD='dBP0wer100!!' psql \
  -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com \
  -U tpeadmin \
  -d tpedb \
  -c "SELECT version();"
```

#### EC2 or ECS Instances
- [ ] **Decision needed**: Deployment platform chosen (EC2 vs ECS vs Lambda)
- [ ] Instance type selected (if EC2)
- [ ] Security groups configured
- [ ] IAM roles created for instances
- [ ] Elastic IP or Load Balancer configured

#### Domain & DNS
- [ ] Production domain available: `tpx.power100.io` ✅
- [ ] DNS managed by (Route 53 / Cloudflare / Other)
- [ ] SSL certificate obtained
- [ ] SSL certificate installed
- [ ] DNS records configured:
  - [ ] A record for `tpx.power100.io` → Frontend
  - [ ] A record for `api.tpx.power100.io` → Backend (optional)
  - [ ] CNAME records for partner subdomains (if using)

**Verification Command:**
```bash
# Check DNS resolution
nslookup tpx.power100.io

# Check SSL certificate
openssl s_client -connect tpx.power100.io:443 -servername tpx.power100.io
```

---

## ENVIRONMENT CONFIGURATION

### Environment Variables Documentation
- [ ] All environment variables documented
- [ ] Production values different from development
- [ ] Secrets identified and secured
- [ ] Environment variable template created

**Required Environment Variables:**

#### Backend (.env.production)
```bash
# Core
NODE_ENV=production
PORT=5000

# Database (AWS RDS)
DB_HOST=tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com
DB_USER=tpeadmin
DB_PASSWORD=[SECURE_IN_AWS_SECRETS_MANAGER]
DB_NAME=tpedb
DB_PORT=5432
DB_SSL=true

# JWT (MUST BE DIFFERENT FROM DEV)
JWT_SECRET=[NEW_PRODUCTION_SECRET_64_CHARS]
JWT_EXPIRE=7d

# API Keys
TPX_N8N_API_KEY=[PRODUCTION_API_KEY]

# Frontend URLs
FRONTEND_URL=https://tpx.power100.io
ADMIN_DASHBOARD_URL=https://tpx.power100.io/admindashboard

# Email Service (SendGrid or AWS SES)
SENDGRID_API_KEY=[TO_BE_CONFIGURED]
EMAIL_FROM=noreply@power100.io

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=[TO_BE_CONFIGURED]
TWILIO_AUTH_TOKEN=[TO_BE_CONFIGURED]
TWILIO_PHONE_NUMBER=[TO_BE_CONFIGURED]

# Monitoring
SENTRY_DSN=[TO_BE_CONFIGURED]
LOG_LEVEL=info

# Redis (if using)
REDIS_HOST=[TO_BE_CONFIGURED]
REDIS_PORT=6379
REDIS_PASSWORD=[TO_BE_CONFIGURED]
```

#### Frontend (.env.production)
```bash
NEXT_PUBLIC_API_URL=https://tpx.power100.io/api
NEXT_PUBLIC_ENVIRONMENT=production
```

### Secrets Management
- [ ] **Decision needed**: Secrets storage solution (AWS Secrets Manager / HashiCorp Vault / Environment Variables)
- [ ] All sensitive credentials moved to secrets manager
- [ ] Secrets rotation policy defined
- [ ] Emergency secret revocation procedure documented

---

## SECURITY REQUIREMENTS

### SSL/TLS Certificates
- [ ] SSL certificate obtained for `tpx.power100.io`
- [ ] SSL certificate obtained for `*.tpx.power100.io` (wildcard for subdomains)
- [ ] Certificate installation tested
- [ ] Auto-renewal configured (Let's Encrypt or AWS Certificate Manager)
- [ ] HTTPS redirect enabled
- [ ] HSTS headers configured

**SSL Test:**
```bash
# Test SSL configuration
curl -I https://tpx.power100.io
# Should return 200 OK with security headers
```

### Security Hardening Checklist
- [ ] All npm packages updated to latest secure versions
- [ ] `npm audit` shows no vulnerabilities
- [ ] Rate limiting configured on all endpoints
- [ ] Helmet.js security headers enabled
- [ ] CORS configured for production domain only
- [ ] SQL injection prevention verified (all queries parameterized)
- [ ] XSS protection enabled
- [ ] CSRF protection implemented (if using cookies)

**Security Audit Commands:**
```bash
# Check for vulnerabilities
cd tpe-backend && npm audit
cd tpe-front-end && npm audit

# Fix vulnerabilities
npm audit fix
```

### Access Control
- [ ] Admin accounts created with strong passwords
- [ ] Partner accounts secured
- [ ] Database user privileges reviewed (principle of least privilege)
- [ ] SSH keys configured (no password authentication)
- [ ] Firewall rules configured (only necessary ports open)

---

## MONITORING & LOGGING

### Error Tracking
- [ ] **Decision needed**: Error tracking service (Sentry / Rollbar / Bugsnag)
- [ ] Sentry account created (if using Sentry)
- [ ] Sentry DSN obtained
- [ ] Sentry integrated in backend
- [ ] Sentry integrated in frontend
- [ ] Error alerts configured
- [ ] Team members added to error tracking

**Sentry Verification:**
```bash
# Test Sentry integration
curl -X POST https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/events/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Test error from TPE"}'
```

### Application Monitoring
- [ ] **Decision needed**: APM solution (New Relic / DataDog / AWS CloudWatch)
- [ ] APM account created
- [ ] APM agents installed
- [ ] Custom metrics defined
- [ ] Dashboards created
- [ ] Performance alerts configured

### Logging Infrastructure
- [ ] **Decision needed**: Log aggregation (AWS CloudWatch / ELK Stack / Papertrail)
- [ ] Structured logging implemented (Winston / Bunyan)
- [ ] Log levels configured correctly
- [ ] Log retention policy defined
- [ ] Log-based alerts configured
- [ ] Log search/query capability tested

**Log Verification:**
```bash
# Check logs are being generated
tail -f tpe-backend/logs/combined.log

# Check for errors
grep -i error tpe-backend/logs/combined.log
```

### Database Monitoring
- [ ] AWS RDS Performance Insights enabled
- [ ] Slow query logging enabled
- [ ] Connection pool monitoring configured
- [ ] Disk space alerts configured
- [ ] CPU/Memory alerts configured

**RDS Monitoring Check:**
```bash
# Via AWS CLI
aws rds describe-db-instances \
  --db-instance-identifier tpe-database-production \
  --query 'DBInstances[0].{Monitoring:MonitoringInterval,Insights:PerformanceInsightsEnabled}'
```

---

## BACKUP & DISASTER RECOVERY

### Automated Backups
- [ ] AWS RDS automated backups enabled ✅ (should already be configured)
- [ ] Backup retention period set (30 days recommended)
- [ ] Backup window scheduled (off-peak hours)
- [ ] Point-in-time recovery enabled
- [ ] Backup restoration tested successfully
- [ ] Backup monitoring and alerts configured

**Backup Verification:**
```bash
# Check backup configuration
aws rds describe-db-instances \
  --db-instance-identifier tpe-database-production \
  --query 'DBInstances[0].{RetentionPeriod:BackupRetentionPeriod,Window:PreferredBackupWindow}'
```

### Disaster Recovery Plan
- [ ] Recovery Time Objective (RTO) defined
- [ ] Recovery Point Objective (RPO) defined
- [ ] Disaster recovery runbook created
- [ ] Failover procedures documented
- [ ] Emergency contact list created
- [ ] Disaster recovery drill scheduled

**Recommended Metrics:**
- RTO: 2 hours (maximum downtime)
- RPO: 5 minutes (maximum data loss)

### Manual Backup Procedures
- [ ] Database dump procedure documented
- [ ] Application state backup procedure documented
- [ ] Backup storage location secured (S3 bucket)
- [ ] Backup encryption enabled

**Manual Backup Command:**
```bash
# Create manual database backup
pg_dump -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com \
  -U tpeadmin -d tpedb -F c -f backup-$(date +%Y%m%d).dump
```

---

## INTEGRATION SERVICES

### Email Service
- [ ] **Decision needed**: Email provider (SendGrid / AWS SES / Mailgun)
- [ ] Email service account created
- [ ] API key obtained
- [ ] Sending domain configured
- [ ] SPF record added to DNS
- [ ] DKIM configured
- [ ] DMARC policy configured
- [ ] Email templates created
- [ ] Email deliverability tested
- [ ] Bounce handling configured

**Email Test:**
```bash
# Test email sending
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}]
    }],
    "from": {"email": "noreply@power100.io"},
    "subject": "TPE Email Test",
    "content": [{"type": "text/plain", "value": "Test email"}]
  }'
```

### SMS Service (Twilio)
- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Account SID obtained
- [ ] Auth token obtained
- [ ] SMS templates created
- [ ] SMS deliverability tested
- [ ] SMS rate limiting configured
- [ ] Fallback to email configured

**SMS Test:**
```bash
# Test SMS via Twilio
curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json \
  --data-urlencode "From=+1234567890" \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "Body=TPE SMS Test" \
  -u YOUR_SID:YOUR_TOKEN
```

### Partner Subdomain Routing
- [ ] DNS wildcard configured for `*.partner.power100.io` (if using subdomains)
- [ ] Email routing rules configured
- [ ] Subdomain SSL certificates configured
- [ ] Routing tested with sample partner

---

## DEPLOYMENT STRATEGY

### Deployment Platform
- [ ] **Decision needed**: Deployment method (Docker / PM2 / Systemd / Kubernetes)
- [ ] Deployment scripts created
- [ ] Deployment tested on staging environment
- [ ] Rollback procedure documented
- [ ] Zero-downtime deployment strategy defined

### Docker Configuration (if using Docker)
- [ ] Dockerfile created for backend
- [ ] Dockerfile created for frontend
- [ ] docker-compose.yml for production created
- [ ] Docker images build successfully
- [ ] Docker registry configured (Docker Hub / AWS ECR)
- [ ] Container health checks configured

**Docker Build Test:**
```bash
# Build backend image
cd tpe-backend
docker build -t tpe-backend:latest .

# Build frontend image
cd tpe-front-end
docker build -t tpe-frontend:latest .

# Test containers locally
docker-compose -f docker-compose.production.yml up
```

### CI/CD Pipeline
- [ ] **Decision needed**: CI/CD platform (GitHub Actions / GitLab CI / Jenkins)
- [ ] Pipeline configuration file created
- [ ] Automated testing configured
- [ ] Automated deployment configured
- [ ] Manual approval required for production
- [ ] Deployment notifications configured (Slack / Email)
- [ ] Rollback triggers configured

**GitHub Actions Test:**
```bash
# Validate workflow syntax
cd .github/workflows
yamllint deploy-production.yml
```

---

## PERFORMANCE REQUIREMENTS

### Load Testing
- [ ] Expected traffic volume defined
  - [ ] Concurrent users (estimated)
  - [ ] Requests per second (estimated)
  - [ ] Peak traffic hours identified
- [ ] Load testing tools selected (Artillery / k6 / JMeter)
- [ ] Load test scenarios created
- [ ] Load tests executed
- [ ] Performance bottlenecks identified
- [ ] Optimizations implemented

**Load Test Command:**
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run load-test.yml

# Expected results:
# - 95th percentile response time < 500ms
# - 0% error rate
# - System remains stable under load
```

### Caching Strategy
- [ ] **Decision needed**: Caching layer (Redis / Memcached / In-memory)
- [ ] Cache server deployed (if using external cache)
- [ ] Cache configuration documented
- [ ] Cache hit ratio monitored
- [ ] Cache invalidation strategy defined
- [ ] Cache warming procedure documented

### Database Performance
- [ ] All queries reviewed with EXPLAIN
- [ ] Missing indexes identified and added
- [ ] Connection pooling configured
- [ ] Slow query threshold set (e.g., > 1 second)
- [ ] Query performance baseline established

**Performance Test:**
```bash
# Test database query performance
PGPASSWORD='dBP0wer100!!' psql \
  -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com \
  -U tpeadmin -d tpedb \
  -c "EXPLAIN ANALYZE SELECT * FROM contractor_partner_matches WHERE partner_id = 94;"
```

---

## TESTING REQUIREMENTS

### Automated Tests
- [ ] Unit test suite created
- [ ] Integration test suite created
- [ ] End-to-end test suite created
- [ ] Test coverage > 70%
- [ ] All tests passing
- [ ] CI/CD runs tests on every commit

**Test Commands:**
```bash
# Run all tests
npm test

# Check test coverage
npm run test:coverage

# Run integration tests only
npm run test:integration
```

### Manual Testing Checklist
- [ ] Contractor flow tested end-to-end
- [ ] Partner login tested
- [ ] Partner profile editing tested
- [ ] Lead management tested
- [ ] Admin dashboard tested
- [ ] All forms validated
- [ ] Error handling tested
- [ ] Mobile responsiveness tested

### Security Testing
- [ ] OWASP ZAP scan completed
- [ ] SQL injection tests passed
- [ ] XSS tests passed
- [ ] Authentication bypass tests passed
- [ ] Authorization tests passed
- [ ] All vulnerabilities remediated

**Security Scan:**
```bash
# OWASP ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://tpx.power100.io \
  -r security-report.html
```

---

## COMPLIANCE & DOCUMENTATION

### Legal & Compliance
- [ ] Privacy Policy updated with production URL
- [ ] Terms of Service updated
- [ ] Cookie consent implemented (if needed)
- [ ] GDPR compliance verified (if applicable)
- [ ] Data retention policies documented
- [ ] User data deletion procedures documented

### Documentation
- [ ] API documentation updated
- [ ] Deployment documentation created
- [ ] Runbook for common issues created
- [ ] Architecture diagrams updated
- [ ] Database schema documented
- [ ] Environment setup guide created

**Documentation Checklist:**
- [ ] `README.md` updated for production
- [ ] `DEPLOYMENT.md` created
- [ ] `RUNBOOK.md` created for operations
- [ ] `ARCHITECTURE.md` updated

---

## TEAM READINESS

### Access & Permissions
- [ ] Team members have necessary AWS access
- [ ] Team members have database access (read-only for most)
- [ ] Team members have monitoring tool access
- [ ] Team members have error tracking access
- [ ] On-call rotation defined
- [ ] Escalation procedures documented

### Training
- [ ] Team trained on deployment process
- [ ] Team trained on monitoring tools
- [ ] Team trained on incident response
- [ ] Team knows how to access logs
- [ ] Team knows how to roll back deployment

---

## FINAL CHECKLIST

### Before Deployment
- [ ] All Phase 3 features working ✅
- [ ] All environment variables configured
- [ ] All secrets secured
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backups verified working
- [ ] Load testing passed
- [ ] Security testing passed
- [ ] Documentation complete

### Deployment Day
- [ ] Communication plan ready (notify users if needed)
- [ ] Team members available for support
- [ ] Rollback plan ready
- [ ] Monitoring dashboards open
- [ ] Database backup taken immediately before
- [ ] Deployment window scheduled (low-traffic time)

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Monitoring shows healthy metrics
- [ ] Error rate normal
- [ ] Performance metrics normal
- [ ] User testing successful
- [ ] Incident response plan ready

---

## DECISION TRACKING

### Required Decisions

1. **Deployment Platform**
   - [ ] EC2 instances
   - [ ] ECS containers
   - [ ] Serverless (Lambda)

2. **Error Tracking**
   - [ ] Sentry
   - [ ] Rollbar
   - [ ] Bugsnag

3. **Email Service**
   - [ ] SendGrid
   - [ ] AWS SES
   - [ ] Mailgun

4. **Caching Layer**
   - [ ] Redis
   - [ ] Memcached
   - [ ] None (start simple)

5. **CI/CD Platform**
   - [ ] GitHub Actions
   - [ ] GitLab CI
   - [ ] Jenkins

6. **Secrets Management**
   - [ ] AWS Secrets Manager
   - [ ] HashiCorp Vault
   - [ ] Environment Variables only

---

## STAGING ENVIRONMENT

### Staging Setup (Recommended)
- [ ] Staging environment created (mirrors production)
- [ ] Staging database created
- [ ] Staging deployment tested
- [ ] Team can access staging
- [ ] Staging used for final pre-production testing

**Staging Environment Benefits:**
- Test production deployment process
- Validate environment configuration
- Test with production-like data
- Identify issues before production

---

## READY TO DEPLOY?

**All items above should be checked ✅ before production deployment.**

If any items are ❌, resolve them first before proceeding to deployment.

---

## EMERGENCY PROCEDURES

### If Deployment Fails
1. Immediately rollback to previous version
2. Notify team via communication channel
3. Investigate error logs
4. Fix issue in development
5. Test fix thoroughly
6. Redeploy when ready

### If Production Issues Occur
1. Check monitoring dashboards
2. Check error tracking (Sentry)
3. Check application logs
4. Check database health
5. Execute appropriate runbook procedure
6. Document incident for post-mortem

---

## QUICK START GUIDE

Once all prerequisites are met:

### Step 1: Final Preparation (1 day)
1. Complete all checklist items above
2. Take final database backup
3. Notify team of deployment window
4. Prepare rollback plan

### Step 2: Deployment (2-4 hours)
1. Deploy backend to production
2. Run database migrations
3. Deploy frontend to production
4. Verify health checks passing
5. Run smoke tests
6. Monitor for errors

### Step 3: Post-Deployment (1-2 hours)
1. Monitor metrics closely
2. Test critical user flows
3. Verify integrations working
4. Update documentation
5. Notify team of successful deployment

---

**Checklist Created**: October 25, 2025
**Last Updated**: October 25, 2025
**Status**: Ready for Review
