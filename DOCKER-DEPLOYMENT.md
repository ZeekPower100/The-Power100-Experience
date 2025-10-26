# Docker Deployment Guide for TPE

This guide explains how to build and deploy The Power100 Experience using Docker containers.

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- Access to AWS RDS production database
- All environment variables configured

## Quick Start

### Local Development Testing with Docker

```bash
# Build and start all services (frontend, backend, postgres)
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432

### Production Deployment

```bash
# 1. Set environment variables (see .env.production.example)
cp .env.production.example .env.production
# Edit .env.production with real credentials

# 2. Build production images
docker-compose -f docker-compose.production.yml build

# 3. Start production services
docker-compose -f docker-compose.production.yml up -d

# 4. Verify health checks
docker-compose -f docker-compose.production.yml ps

# 5. View logs
docker-compose -f docker-compose.production.yml logs -f
```

## Docker Files Overview

### Backend Dockerfile (`tpe-backend/Dockerfile`)
- **Multi-stage build** for smaller image size
- **Non-root user** (tpeuser) for security
- **Health check** using `/api/health` endpoint
- **Production dependencies only**
- **Logs directory** with proper permissions

### Frontend Dockerfile (`tpe-front-end/Dockerfile`)
- **Multi-stage build** with Next.js standalone output
- **Non-root user** (nextjs) for security
- **Health check** on homepage
- **Optimized static asset serving**

### docker-compose.yml (Development)
- Includes local PostgreSQL container
- Hot-reload volumes for development
- Development environment variables
- Local network for inter-service communication

### docker-compose.production.yml (Production)
- Connects to AWS RDS (no local database)
- Restart policy: `unless-stopped`
- Log rotation configured
- Production environment variables from `.env.production`

## Building Docker Images

### Build Backend Only
```bash
cd tpe-backend
docker build -t tpe-backend:latest .
```

### Build Frontend Only
```bash
cd tpe-front-end
docker build -t tpe-frontend:latest .
```

### Build Both with Docker Compose
```bash
# Development
docker-compose build

# Production
docker-compose -f docker-compose.production.yml build
```

## Environment Variables

### Required for Production

Create `.env.production` from `.env.production.example`:

```bash
cp .env.production.example .env.production
```

**Critical Variables to Set:**
- `DB_PASSWORD` - AWS RDS database password
- `JWT_SECRET` - Production JWT secret (64+ characters)
- `TPX_N8N_API_KEY` - n8n API key for automation
- `GHL_PRIVATE_INTEGRATION_TOKEN` - GoHighLevel integration token
- `GHL_LOCATION_ID` - GoHighLevel location ID
- `N8N_WEBHOOK_URL` - n8n webhook endpoint URL

**Communication Architecture:**
- **Email & SMS:** TPE → n8n → GoHighLevel (GHL handles actual sending)
- **NO direct Twilio/SendGrid integration** - All communications via GHL
- Configure templates and settings in GHL dashboard

**Optional Variables:**
- `SENTRY_DSN` - Error tracking (future enhancement)

## Health Checks

Both containers have health checks configured:

### Backend Health Check
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","timestamp":"...","environment":"production"}
```

### Frontend Health Check
```bash
curl http://localhost:3000
# Should return: 200 OK with HTML content
```

### Docker Health Status
```bash
# Check container health
docker ps

# HEALTHY = Container is running and passing health checks
# UNHEALTHY = Container is running but failing health checks
```

## Container Management

### View Running Containers
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes database data)
docker-compose down -v
```

### Execute Commands in Containers
```bash
# Backend shell
docker-compose exec backend sh

# Run database migrations
docker-compose exec backend node src/scripts/migrate.js

# Frontend shell
docker-compose exec frontend sh
```

## Production Deployment Workflow

### Step 1: Prepare Environment
```bash
# On production server
cd /path/to/tpe
git pull origin master

# Set environment variables
cp .env.production.example .env.production
nano .env.production  # Edit with real values
```

### Step 2: Build Images
```bash
# Build production images
docker-compose -f docker-compose.production.yml build --no-cache
```

### Step 3: Deploy with Zero Downtime
```bash
# Start new containers
docker-compose -f docker-compose.production.yml up -d

# Wait for health checks to pass
docker-compose -f docker-compose.production.yml ps

# Verify application is working
curl http://localhost:5000/api/health
curl http://localhost:3000

# Old containers automatically replaced
```

### Step 4: Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Check logs for errors
docker-compose -f docker-compose.production.yml logs --tail=50

# Test critical endpoints
curl http://localhost:5000/api/health
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/partner-portal/leads/stats
```

### Step 5: Monitor
```bash
# Watch logs in real-time
docker-compose -f docker-compose.production.yml logs -f

# Check resource usage
docker stats
```

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# Stop current containers
docker-compose -f docker-compose.production.yml down

# Pull previous version from git
git checkout <previous-commit-hash>

# Rebuild and start
docker-compose -f docker-compose.production.yml up -d --build
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Port already in use
```

### Database Connection Errors
```bash
# Test database connection from host
PGPASSWORD='dBP0wer100!!' psql \
  -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com \
  -U tpeadmin -d tpedb -c "SELECT version();"

# Test from inside backend container
docker-compose exec backend sh
node -e "const {query} = require('./src/config/database'); query('SELECT NOW()').then(r => console.log(r.rows))"
```

### Health Check Failing
```bash
# Check container logs
docker-compose logs backend

# Execute health check manually inside container
docker-compose exec backend node -e "require('http').get('http://localhost:5000/api/health', r => console.log(r.statusCode))"
```

### Permission Issues
```bash
# Check log directory permissions on host
ls -la /var/log/tpe/backend

# Should be writable by container user (UID 1001)
sudo chown -R 1001:1001 /var/log/tpe/backend
```

## Security Best Practices

1. **Never commit `.env.production`** - Add to `.gitignore`
2. **Use unique JWT_SECRET** - Different from development
3. **Rotate secrets regularly** - Database passwords, API keys
4. **Run as non-root** - Containers use unprivileged users
5. **Enable health checks** - Automatic restart on failure
6. **Use SSL in production** - Configure reverse proxy (nginx)
7. **Monitor logs** - Set up log aggregation (CloudWatch, ELK)
8. **Limit resources** - Add CPU/memory limits in docker-compose

## Resource Limits (Optional)

Add to `docker-compose.production.yml`:

```yaml
services:
  backend:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Next Steps

After Docker deployment is working:

1. **Set up reverse proxy** (nginx) for SSL/TLS
2. **Configure monitoring** (Sentry, CloudWatch)
3. **Set up log aggregation** (ELK, CloudWatch Logs)
4. **Implement CI/CD** (GitHub Actions, GitLab CI)
5. **Configure backups** (Database snapshots)
6. **Set up staging environment** (Test before production)

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- Phase 4 Pre-Flight Checklist: `docs/features/partner-portal/phase-4/PHASE-4-PRE-FLIGHT-CHECKLIST.md`

## Support

For issues or questions:
1. Check container logs: `docker-compose logs`
2. Verify health checks: `docker-compose ps`
3. Review this guide's troubleshooting section
4. Check Phase 4 documentation in `docs/features/partner-portal/phase-4/`
