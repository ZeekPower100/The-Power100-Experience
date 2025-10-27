# Environment Files - How They Work in TPE

## Overview

TPE uses Node.js `dotenv` library for environment variable management. Understanding the file hierarchy is critical for development and deployment.

## File Hierarchy (dotenv behavior)

dotenv loads environment files in this order, with **LATER files overriding earlier ones**:

```
1. .env                    (base - rarely used in TPE)
2. .env.production         (production defaults)
3. .env.local              (local overrides - HIGHEST PRIORITY)
```

## Important Rules

### Rule 1: .env.local ALWAYS Wins
If `.env.local` exists, it overrides EVERYTHING, including `.env.production`.

```
Example:
.env.production has:  JWT_SECRET=prod-secret-123
.env.local has:       JWT_SECRET=dev-secret-456

Result: JWT_SECRET = "dev-secret-456"  ← .env.local wins!
```

### Rule 2: Docker Containers DON'T Use .env.local
Docker images are built WITHOUT `.env.local` (excluded via `.dockerignore`).

```
Local Development:   Uses .env.local (overrides .env.production)
Docker Container:    Uses .env.production ONLY
Production Deploy:   Uses .env.production ONLY
```

### Rule 3: .gitignore Protects Secrets
Both `.env.production` and `.env.local` are in `.gitignore` to prevent committing secrets.

## Current TPE Setup

### What We Have:
- ✅ `.env.local` - **Currently active** in local development
  - Contains complete working configuration
  - Has local PostgreSQL connection
  - Has all real API keys and secrets
  - **This is what your dev environment uses RIGHT NOW**

- ⚠️ `.env.production` - Incomplete (placeholder values)
  - Missing host in DATABASE_URL
  - Has placeholder JWT_SECRET
  - Incomplete FRONTEND_URL
  - **NOT actually used locally** (overridden by .env.local)

- ✅ `.env.production.example` - Template for production
  - Documents all required variables
  - No real secrets
  - Safe to commit to git

## Why It Works Locally

Your local development works perfectly because:
1. `.env.local` exists with complete configuration
2. `.env.local` overrides the incomplete `.env.production`
3. `database.postgresql.js` falls back to individual DB_* variables when DATABASE_URL is incomplete

## For Docker & Production Deployment

### Docker Setup:
`.dockerignore` excludes `.env.local`, so Docker containers will use `.env.production` ONLY.

**Before deploying:**
```bash
# 1. Copy template to production file
cp .env.production.example .env.production

# 2. Edit with real production values
nano .env.production

# 3. Verify values are correct
grep -v "^#" .env.production | grep -v "^$"

# 4. Test Docker build
docker-compose -f docker-compose.production.yml build
```

## File Contents Comparison

### .env.local (Current Active - Local Development)
```bash
NODE_ENV=development
DB_HOST=localhost
DB_NAME=tpedb
DB_USER=postgres
DB_PASSWORD=TPXP0stgres!!
JWT_SECRET=dev-secret-change-in-production-to-something-very-secure
# ... complete configuration
```

### .env.production (Needs Update Before Production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://tpeadmin:dBP0wer100!!@:5432/tpe_production  # ❌ Missing host
JWT_SECRET=your-production-secret-here  # ❌ Placeholder
FRONTEND_URL=http://  # ❌ Incomplete
```

### What .env.production SHOULD Have:
```bash
NODE_ENV=production
DB_HOST=tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com
DB_NAME=tpedb
DB_USER=tpeadmin
DB_PASSWORD=dBP0wer100!!  # Real production password
JWT_SECRET=[64-character-unique-production-secret]  # MUST be different from dev
FRONTEND_URL=https://tpx.power100.io
# ... all other production values
```

## Testing Environment Loading

### Check which file is being used:
```javascript
// Add to server.js temporarily
console.log('Environment:', process.env.NODE_ENV);
console.log('DB Host:', process.env.DB_HOST);
console.log('JWT Secret (first 10 chars):', process.env.JWT_SECRET?.substring(0, 10));
```

### Verify dotenv loading:
```bash
# Local development (should use .env.local)
node -e "require('dotenv').config({path:'.env.local'}); console.log('DB_HOST:', process.env.DB_HOST)"

# Production simulation (should use .env.production)
node -e "require('dotenv').config({path:'.env.production'}); console.log('DB_HOST:', process.env.DB_HOST)"
```

## Best Practices

### For Local Development:
1. ✅ Keep .env.local with complete working config
2. ✅ Never commit .env.local to git
3. ✅ Update .env.local when adding new variables
4. ✅ Document new variables in .env.production.example

### For Production Deployment:
1. ✅ Create .env.production from .env.production.example
2. ✅ Use unique values (different from .env.local)
3. ✅ Use strong production secrets (JWT_SECRET 64+ characters)
4. ✅ Test .env.production values BEFORE building Docker image
5. ✅ Never commit .env.production to git

### For Team Collaboration:
1. ✅ Commit .env.production.example with all variable names
2. ✅ Document what each variable does
3. ✅ Team members create their own .env.local
4. ✅ Share .env.local values securely (not via git)

## Common Mistakes

### Mistake 1: Thinking .env.production is active locally
❌ **Wrong:** "I updated .env.production but nothing changed"
✅ **Right:** Update .env.local (it overrides .env.production)

### Mistake 2: Committing .env.local to git
❌ **Wrong:** `git add .env.local`
✅ **Right:** .env.local is in .gitignore (never commit)

### Mistake 3: Using same secrets in dev and production
❌ **Wrong:** Same JWT_SECRET in both files
✅ **Right:** Different secrets for dev and production

### Mistake 4: Forgetting Docker doesn't use .env.local
❌ **Wrong:** "It works locally so Docker will work"
✅ **Right:** Test with .env.production before Docker build

## Debugging Environment Issues

### Issue: "Database connection fails in Docker"
**Cause:** .env.production has wrong database credentials
**Fix:** Update .env.production with correct AWS RDS values

### Issue: "JWT tokens invalid after deployment"
**Cause:** Different JWT_SECRET between dev and production
**Fix:** Expected behavior - tokens are environment-specific

### Issue: "Environment variable is undefined"
**Cause 1:** Variable not in .env.local (local dev)
**Cause 2:** Variable not in .env.production (Docker/production)
**Fix:** Add variable to appropriate file

## Quick Reference

| Environment | File Used | Docker | Git |
|------------|-----------|--------|-----|
| Local Dev | .env.local | ❌ | ❌ |
| Docker Dev | .env.production | ✅ | ❌ |
| Docker Prod | .env.production | ✅ | ❌ |
| Template | .env.production.example | N/A | ✅ |

## Summary

- **Local development:** .env.local overrides everything
- **Docker/Production:** Only .env.production (no .env.local)
- **Template:** .env.production.example (safe to commit)
- **Never commit:** .env.local or .env.production (secrets!)
- **Always update:** .env.production.example (documentation)

---

**Created:** Phase 4 Implementation
**Purpose:** Clarify environment file behavior
**Audience:** Developers and DevOps
