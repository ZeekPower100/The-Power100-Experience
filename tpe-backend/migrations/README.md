# Database Migrations

## CRITICAL: Run these migrations in production!

### Pending Migrations for Production

1. **add_missing_partner_columns.js** - Added on 2025-09-04
   - Adds columns for upload functionality
   - Required for partner demos and references
   - Must be run before using upload features

### How to run migrations in production:

```bash
# SSH into production server
ssh user@production-server

# Navigate to backend directory
cd /path/to/tpe-backend

# Run the migration
node migrations/add_missing_partner_columns.js

# Verify the migration
psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "\d strategic_partners"
```

### Migration History:
- 2025-09-04: add_missing_partner_columns.js - Added client_demos, client_references, etc.