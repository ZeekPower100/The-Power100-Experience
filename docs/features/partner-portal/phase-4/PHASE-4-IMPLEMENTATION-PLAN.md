# PHASE 4 - Production & Scaling
## Implementation Plan

**Timeline**: Week 7-8 (20-25 hours)
**Priority**: High (Production Readiness)
**Status**: Ready to Begin

---

## OBJECTIVE

Prepare The Power100 Experience platform for production deployment with robust infrastructure, monitoring, security hardening, and scalable architecture. This phase focuses on operational excellence, system reliability, and production-grade features.

---

## PRE-FLIGHT CHECKLIST

See `PHASE-4-PRE-FLIGHT-CHECKLIST.md` for complete verification steps.

**Critical Prerequisites:**
- ✅ Phase 3 Complete (Lead management working)
- ✅ All core features functional in development
- ⚠️ **Decision needed**: Production hosting strategy
- ⚠️ **Decision needed**: Monitoring and alerting requirements
- ⚠️ **Decision needed**: Backup and disaster recovery policies

---

## IMPLEMENTATION TASKS

### TASK 1: Production Infrastructure Setup (6-8 hours)

#### 1.1 Environment Configuration
**Purpose**: Separate development, staging, and production configurations

**Sub-tasks:**
- [ ] Create `.env.production` with production credentials
- [ ] Create `.env.staging` for pre-production testing
- [ ] Document all environment variables
- [ ] Implement environment-specific API URLs
- [ ] Configure production database connection strings
- [ ] Set up production JWT secrets (rotate from dev)
- [ ] Configure CORS for production domains

**Environment Variables to Configure:**
```bash
# Production Backend (.env.production)
NODE_ENV=production
PORT=5000

# Database (AWS RDS - Already deployed)
DB_HOST=tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com
DB_USER=tpeadmin
DB_PASSWORD=dBP0wer100!!
DB_NAME=tpedb
DB_PORT=5432
DB_SSL=true

# JWT
JWT_SECRET=[NEW_PRODUCTION_SECRET_STRONG_64_CHAR]
JWT_EXPIRE=7d

# API Keys (to be generated)
TPX_N8N_API_KEY=[PRODUCTION_API_KEY]

# Frontend URLs
FRONTEND_URL=https://tpx.power100.io
ADMIN_DASHBOARD_URL=https://tpx.power100.io/admindashboard

# Email Service (Phase 4B)
SENDGRID_API_KEY=[TO_BE_CONFIGURED]
EMAIL_FROM=noreply@power100.io

# SMS Service (Phase 4B)
TWILIO_ACCOUNT_SID=[TO_BE_CONFIGURED]
TWILIO_AUTH_TOKEN=[TO_BE_CONFIGURED]
TWILIO_PHONE_NUMBER=[TO_BE_CONFIGURED]

# Monitoring
SENTRY_DSN=[TO_BE_CONFIGURED]
LOG_LEVEL=info
```

**Frontend Environment:**
```bash
# Production Frontend (.env.production)
NEXT_PUBLIC_API_URL=https://tpx.power100.io/api
NEXT_PUBLIC_ENVIRONMENT=production
```

#### 1.2 Database Migration Strategy
**Purpose**: Safe database schema updates in production

**Sub-tasks:**
- [ ] Create migration versioning system
- [ ] Document all schema changes from dev to prod
- [ ] Create rollback scripts for each migration
- [ ] Test migrations on staging database first
- [ ] Implement zero-downtime migration approach
- [ ] Backup database before each migration

**Migration Process:**
```javascript
// migrations/001_add_engagement_fields.js
module.exports = {
  up: async (db) => {
    // Forward migration
    await db.query(`
      ALTER TABLE contractor_partner_matches
        ADD COLUMN IF NOT EXISTS engagement_stage VARCHAR(50) DEFAULT 'new',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);
  },

  down: async (db) => {
    // Rollback migration
    await db.query(`
      ALTER TABLE contractor_partner_matches
        DROP COLUMN IF EXISTS engagement_stage,
        DROP COLUMN IF EXISTS status;
    `);
  }
};
```

#### 1.3 Docker Containerization
**Purpose**: Consistent deployment across environments

**Sub-tasks:**
- [ ] Create `Dockerfile` for backend
- [ ] Create `Dockerfile` for frontend
- [ ] Create `docker-compose.yml` for local development
- [ ] Create `docker-compose.production.yml`
- [ ] Configure multi-stage builds for optimization
- [ ] Set up health check endpoints
- [ ] Configure container logging

**Backend Dockerfile:**
```dockerfile
# tpe-backend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tpeuser

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER tpeuser

EXPOSE 5000

CMD ["node", "src/server.js"]
```

**Frontend Dockerfile:**
```dockerfile
# tpe-front-end/Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 1.4 CI/CD Pipeline Implementation
**Purpose**: Automated testing and deployment

**Sub-tasks:**
- [ ] Set up GitHub Actions workflows
- [ ] Configure automated testing on PR
- [ ] Configure automated deployment to staging
- [ ] Configure manual approval for production
- [ ] Implement automatic rollback on failure
- [ ] Configure deployment notifications

**GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linter
        run: npm run lint

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t tpe-backend:${{ github.sha }} ./tpe-backend
      - name: Deploy to AWS
        run: |
          # Deploy to EC2 or ECS
          # Configuration specific to deployment target

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t tpe-frontend:${{ github.sha }} ./tpe-front-end
      - name: Deploy to AWS
        run: |
          # Deploy to EC2 or ECS
```

---

### TASK 2: Security Hardening (4-6 hours)

#### 2.1 Security Audit & Fixes
**Purpose**: Identify and fix security vulnerabilities

**Sub-tasks:**
- [ ] Run `npm audit` and fix all vulnerabilities
- [ ] Implement rate limiting on all endpoints
- [ ] Add helmet.js for security headers
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Configure secure session handling
- [ ] Implement SQL injection prevention (verify parameterized queries)
- [ ] Add XSS protection
- [ ] Configure secure cookie settings

**Security Middleware:**
```javascript
// tpe-backend/src/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit to 5 login attempts
  message: 'Too many login attempts, please try again later'
});

module.exports = {
  helmet,
  limiter,
  authLimiter,
  sanitize: mongoSanitize()
};
```

**Apply in Server:**
```javascript
// server.js
const { helmet, limiter, authLimiter, sanitize } = require('./middleware/security');

// Apply security middleware
app.use(helmet());
app.use(limiter);
app.use(sanitize);

// Apply stricter limits to auth routes
app.use('/api/auth', authLimiter);
app.use('/api/partner-auth', authLimiter);
```

#### 2.2 Secrets Management
**Purpose**: Secure storage and rotation of sensitive credentials

**Sub-tasks:**
- [ ] Move all secrets to AWS Secrets Manager or HashiCorp Vault
- [ ] Implement automatic secret rotation
- [ ] Remove all hardcoded secrets from codebase
- [ ] Configure secret access via IAM roles
- [ ] Document secret rotation procedures
- [ ] Implement emergency secret revocation process

**AWS Secrets Manager Integration:**
```javascript
// tpe-backend/src/config/secrets.js
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager({
  region: 'us-east-1'
});

async function getSecret(secretName) {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: secretName
    }).promise();

    return JSON.parse(data.SecretString);
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}

module.exports = { getSecret };
```

#### 2.3 SSL/TLS Configuration
**Purpose**: Encrypt all communications

**Sub-tasks:**
- [ ] Configure SSL certificates for production domain
- [ ] Enable HTTPS redirect
- [ ] Configure HSTS headers
- [ ] Set up certificate auto-renewal
- [ ] Configure secure WebSocket connections (if used)
- [ ] Test SSL configuration with SSL Labs

---

### TASK 3: Monitoring & Logging (4-5 hours)

#### 3.1 Application Monitoring
**Purpose**: Real-time visibility into application health

**Sub-tasks:**
- [ ] Integrate Sentry for error tracking
- [ ] Set up application performance monitoring (APM)
- [ ] Configure custom metrics and dashboards
- [ ] Set up alerts for critical errors
- [ ] Implement uptime monitoring
- [ ] Configure slow query detection

**Sentry Integration:**
```javascript
// tpe-backend/src/config/sentry.js
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    new ProfilingIntegration(),
  ],
});

module.exports = Sentry;
```

**Apply in Server:**
```javascript
// server.js
const Sentry = require('./config/sentry');

// Sentry request handler must be first middleware
app.use(Sentry.Handlers.requestHandler());

// All routes here

// Sentry error handler must be before other error handlers
app.use(Sentry.Handlers.errorHandler());
```

#### 3.2 Structured Logging
**Purpose**: Centralized, searchable logs

**Sub-tasks:**
- [ ] Implement Winston or Bunyan for logging
- [ ] Configure log levels (error, warn, info, debug)
- [ ] Set up centralized log aggregation (AWS CloudWatch, ELK)
- [ ] Implement request/response logging
- [ ] Add correlation IDs for request tracing
- [ ] Configure log retention policies
- [ ] Set up log-based alerts

**Winston Configuration:**
```javascript
// tpe-backend/src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'tpe-backend',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write errors to file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

module.exports = logger;
```

#### 3.3 Database Monitoring
**Purpose**: Track database performance and health

**Sub-tasks:**
- [ ] Enable AWS RDS Performance Insights
- [ ] Configure slow query logging
- [ ] Set up connection pool monitoring
- [ ] Configure database metrics alerts
- [ ] Monitor disk space usage
- [ ] Track query performance over time

---

### TASK 4: Performance Optimization (3-4 hours)

#### 4.1 Backend Optimization
**Purpose**: Improve API response times

**Sub-tasks:**
- [ ] Implement Redis caching for frequent queries
- [ ] Add database query result caching
- [ ] Optimize database indexes
- [ ] Implement connection pooling
- [ ] Add compression middleware (gzip)
- [ ] Optimize JSON payload sizes
- [ ] Implement pagination on all list endpoints

**Redis Caching:**
```javascript
// tpe-backend/src/config/cache.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Cache wrapper
async function cacheWrapper(key, ttl, fetchFunction) {
  // Try to get from cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from source
  const result = await fetchFunction();

  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(result));

  return result;
}

module.exports = { redis, cacheWrapper };
```

#### 4.2 Frontend Optimization
**Purpose**: Improve page load times and user experience

**Sub-tasks:**
- [ ] Implement code splitting
- [ ] Configure lazy loading for routes
- [ ] Optimize images (WebP, compression)
- [ ] Implement service worker for offline support
- [ ] Configure CDN for static assets
- [ ] Minimize bundle sizes
- [ ] Implement server-side rendering where beneficial

**Next.js Optimization:**
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    domains: ['tpx.power100.io'],
    formats: ['image/webp'],
  },

  // Performance
  compress: true,

  // Production output
  output: 'standalone',

  // Headers for caching
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

#### 4.3 Database Optimization
**Purpose**: Improve query performance

**Sub-tasks:**
- [ ] Analyze slow queries with EXPLAIN
- [ ] Add missing indexes
- [ ] Optimize JOIN operations
- [ ] Implement query result caching
- [ ] Configure connection pooling
- [ ] Implement read replicas for heavy queries

**Index Analysis:**
```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM contractor_partner_matches
WHERE partner_id = 94 AND engagement_stage = 'new';
```

---

### TASK 5: Backup & Disaster Recovery (2-3 hours)

#### 5.1 Automated Backups
**Purpose**: Protect against data loss

**Sub-tasks:**
- [ ] Configure AWS RDS automated backups (daily)
- [ ] Set up backup retention (30 days)
- [ ] Configure point-in-time recovery
- [ ] Test backup restoration process
- [ ] Document backup procedures
- [ ] Set up backup monitoring and alerts

**Backup Configuration (AWS RDS):**
```bash
# Via AWS CLI
aws rds modify-db-instance \
  --db-instance-identifier tpe-database-production \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

#### 5.2 Disaster Recovery Plan
**Purpose**: Minimize downtime in emergencies

**Sub-tasks:**
- [ ] Document recovery time objective (RTO)
- [ ] Document recovery point objective (RPO)
- [ ] Create runbook for common failures
- [ ] Set up failover procedures
- [ ] Test disaster recovery annually
- [ ] Document emergency contact procedures

**Disaster Recovery Runbook:**
```markdown
# Database Failure Recovery

## Scenario: Primary database unavailable

1. Check RDS console for instance health
2. Verify network connectivity
3. If hardware failure: Restore from latest snapshot
4. If data corruption: Point-in-time recovery

## Recovery Steps:
1. Create new RDS instance from snapshot
2. Update DNS or connection string
3. Verify data integrity
4. Monitor for errors
5. Document incident

RTO: 2 hours
RPO: 5 minutes (automated backups)
```

---

### TASK 6: Integration Services (4-5 hours)

#### 6.1 SMS Verification Service (Twilio)
**Purpose**: Production SMS for contractor verification

**Sub-tasks:**
- [ ] Create Twilio account
- [ ] Configure phone number
- [ ] Implement SMS sending service
- [ ] Add SMS delivery tracking
- [ ] Implement SMS rate limiting
- [ ] Configure failover to email if SMS fails

**Twilio Integration:**
```javascript
// tpe-backend/src/services/smsService.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendVerificationSMS(phone, code) {
  try {
    const message = await client.messages.create({
      body: `Your Power100 verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('SMS send failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { sendVerificationSMS };
```

#### 6.2 Email Service (SendGrid/AWS SES)
**Purpose**: Transactional and notification emails

**Sub-tasks:**
- [ ] Set up email service (SendGrid or AWS SES)
- [ ] Configure email templates
- [ ] Implement partner introduction emails
- [ ] Add email tracking (opens, clicks)
- [ ] Configure email deliverability (SPF, DKIM, DMARC)
- [ ] Set up email bounce handling

**SendGrid Integration:**
```javascript
// tpe-backend/src/services/emailService.js
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendPartnerIntroduction(contractorEmail, partnerInfo) {
  const msg = {
    to: contractorEmail,
    from: 'intros@power100.io',
    templateId: 'd-xxxxxxxxxxxxx', // SendGrid template ID
    dynamicTemplateData: {
      partnerName: partnerInfo.company_name,
      partnerEmail: partnerInfo.contact_email,
      partnerWebsite: partnerInfo.website,
      matchScore: partnerInfo.match_score
    }
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPartnerIntroduction };
```

#### 6.3 Partner Subdomain Routing
**Purpose**: Email routing via partner-specific subdomains

**Sub-tasks:**
- [ ] Configure DNS for partner subdomains
- [ ] Implement subdomain email routing
- [ ] Set up email forwarding rules
- [ ] Configure bounce handling
- [ ] Test email delivery to all partners

---

### TASK 7: Testing & Quality Assurance (3-4 hours)

#### 7.1 Automated Testing
**Purpose**: Prevent regressions

**Sub-tasks:**
- [ ] Write unit tests for critical functions
- [ ] Write integration tests for API endpoints
- [ ] Write end-to-end tests for key user flows
- [ ] Configure test coverage reporting
- [ ] Set up continuous testing in CI/CD
- [ ] Implement pre-commit hooks for testing

**Jest Configuration:**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

#### 7.2 Load Testing
**Purpose**: Verify system can handle expected traffic

**Sub-tasks:**
- [ ] Define expected traffic volumes
- [ ] Set up load testing environment
- [ ] Run load tests on critical endpoints
- [ ] Identify performance bottlenecks
- [ ] Optimize as needed
- [ ] Document load test results

**Load Testing with Artillery:**
```yaml
# load-test.yml
config:
  target: "https://tpx.power100.io"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Partner Login and Lead Viewing"
    flow:
      - post:
          url: "/api/partner-auth/login"
          json:
            email: "demo@techflow.com"
            password: "Demo123!"
          capture:
            json: "$.token"
            as: "token"
      - get:
          url: "/api/partner-portal/leads"
          headers:
            Authorization: "Bearer {{ token }}"
```

#### 7.3 Security Testing
**Purpose**: Identify vulnerabilities before attackers do

**Sub-tasks:**
- [ ] Run OWASP ZAP security scan
- [ ] Test SQL injection vulnerabilities
- [ ] Test XSS vulnerabilities
- [ ] Test authentication bypass attempts
- [ ] Test authorization issues
- [ ] Document and fix all findings

---

## DELIVERABLES

### Infrastructure
- ✅ Production environment configuration
- ✅ Docker containerization
- ✅ CI/CD pipeline
- ✅ Database migration system

### Security
- ✅ Security hardening complete
- ✅ Secrets management implemented
- ✅ SSL/TLS configured
- ✅ Security audit passed

### Monitoring
- ✅ Error tracking (Sentry)
- ✅ Application monitoring (APM)
- ✅ Structured logging
- ✅ Database monitoring
- ✅ Alerting configured

### Performance
- ✅ Caching implemented
- ✅ Frontend optimized
- ✅ Database optimized
- ✅ Load testing completed

### Backup & Recovery
- ✅ Automated backups configured
- ✅ Disaster recovery plan documented
- ✅ Recovery procedures tested

### Integration Services
- ✅ SMS service (Twilio)
- ✅ Email service (SendGrid/SES)
- ✅ Partner subdomain routing

### Testing
- ✅ Automated test suite
- ✅ Load testing results
- ✅ Security testing results

---

## SUCCESS CRITERIA

### Must Have
- [ ] Application runs in production without errors
- [ ] All environment variables properly configured
- [ ] SSL/TLS working correctly
- [ ] Database backups running daily
- [ ] Monitoring and alerting active
- [ ] CI/CD pipeline deploying successfully

### Nice to Have
- [ ] 99.9% uptime achieved
- [ ] Page load times under 2 seconds
- [ ] API response times under 200ms
- [ ] Zero critical security vulnerabilities
- [ ] Automated rollback on deployment failure

### Phase 4 Complete When:
- [ ] All "Must Have" criteria met
- [ ] Production deployment successful
- [ ] Monitoring showing healthy metrics
- [ ] Disaster recovery tested
- [ ] Documentation complete

---

**Document Created**: October 25, 2025
**Status**: Ready to Begin
**Estimated Completion**: 2-3 weeks (20-25 hours)
