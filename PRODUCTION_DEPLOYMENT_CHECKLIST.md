# 🚀 Production Deployment Checklist

## Pre-Deployment Checks

### 1. ✅ Run All Compatibility Checkers
```bash
# Run in order - ALL must pass before proceeding
node compatibility-check.js
node full-stack-compatibility-check.js
node database-compatibility-check.js
node database-migration-checker.js  # NEW - Critical!
```

### 2. 🗄️ Database Migrations
**CRITICAL: Check for pending migrations BEFORE pushing code**

```bash
# Check what migrations are needed
node database-migration-checker.js

# If migrations are needed, they MUST be run on production IMMEDIATELY after deploy
```

### 3. 🧪 Local Testing
- [ ] Test all new features locally
- [ ] Verify upload functionality works
- [ ] Check authentication flows
- [ ] Test with both admin and contractor accounts

## Deployment Process

### 1. 📝 Create Feature Branch
```bash
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: Description"
```

### 2. 🔍 Pre-Push Validation
```bash
# This runs automatically on push, but check manually first:
node database-migration-checker.js

# If issues found, DO NOT PUSH until resolved
```

### 3. 🚀 Push to Repository
```bash
git push origin your-branch
# Create PR if using branches
# OR direct push to master if authorized
```

### 4. 🗄️ RUN MIGRATIONS IMMEDIATELY
**⚠️ CRITICAL: Within 5 minutes of code deployment**

```bash
# SSH to production server
ssh user@production-server

# Navigate to backend
cd /path/to/tpe-backend

# Run pending migrations
node migrations/[migration-file].js

# Verify migrations worked
psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com \
     -U tpeadmin -d tpedb \
     -c "\d strategic_partners"
```

### 5. ✅ Post-Deployment Verification
- [ ] Check production site loads
- [ ] Test new features in production
- [ ] Monitor error logs
- [ ] Verify database operations work

## Common Issues & Solutions

### Issue: "Column does not exist" errors in production
**Solution:** Migration not run yet
```bash
# Run the migration immediately
node tpe-backend/migrations/add_missing_partner_columns.js
```

### Issue: Upload fails in production
**Solution:** Check AWS credentials or migration status
```bash
# Verify columns exist
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'strategic_partners';"

# Check AWS config (if using S3)
echo $AWS_ACCESS_KEY_ID
```

### Issue: Compatibility checker didn't catch an issue
**Solution:** Update the checker
```bash
# Add new checks to database-migration-checker.js
# Include new patterns in compatibility checkers
```

## Migration History Log

| Date | Migration File | Description | Status |
|------|---------------|-------------|--------|
| 2025-09-04 | add_missing_partner_columns.js | Added upload-related columns | ⚠️ PENDING |

## Critical Reminders

### ⚠️ NEVER SKIP THESE:
1. **Always run `database-migration-checker.js` before deploying**
2. **Migrations must be run within 5 minutes of code deployment**
3. **Test in production immediately after deployment**
4. **Keep this checklist updated with new requirements**

### 📞 Emergency Contacts
- Database Admin: [contact]
- DevOps Lead: [contact]
- Project Manager: [contact]

## Automated Deployment (Future)
Consider implementing:
- CI/CD pipeline with automatic migration checks
- Staging environment for pre-production testing
- Automatic migration running after deployment
- Rollback procedures for failed deployments