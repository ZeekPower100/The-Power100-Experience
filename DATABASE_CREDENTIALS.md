# 🔐 DATABASE CREDENTIALS - CRITICAL REFERENCE

## ⚠️ IMPORTANT: NEVER COMMIT ACTUAL PASSWORDS TO GIT
This file contains the correct database credentials for reference.

---

## 🏠 LOCAL DEVELOPMENT Database
- **Host**: localhost
- **Port**: 5432
- **Database**: tpedb
- **User**: postgres
- **Password**: `TPXP0stgres!!`
- **SSL**: No
- **Connection String**: 
  ```
  postgresql://postgres:TPXP0stgres!!@localhost:5432/tpedb
  ```

---

## 🚀 PRODUCTION Database (AWS RDS)
- **Host**: tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com
- **Port**: 5432
- **Database**: tpedb
- **User**: tpeadmin
- **Password**: `dBP0wer100!!`
- **SSL**: Required (rejectUnauthorized: false)
- **Connection String**: 
  ```
  postgresql://tpeadmin:dBP0wer100!!@tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com:5432/tpedb?sslmode=require
  ```

---

## 📝 Notes
1. **PRODUCTION PASSWORD**: `dBP0wer100!!` - This is the ONLY correct production password
2. **LOCAL DEV PASSWORD**: `TPXP0stgres!!` - Different from production for security
3. **Never use local password in production or vice versa**
4. **SSL is REQUIRED for AWS RDS production database**
5. **These credentials are stored in:**
   - CLAUDE.md (project documentation)
   - DATABASE_CREDENTIALS.md (this file)
   - tpe-backend/.env.production (on production server)
   - AWS Systems Manager Parameter Store (recommended for future)

---

## 🔧 Troubleshooting
If you see SSL certificate errors with production database:
- Use `ssl: { rejectUnauthorized: false, require: true }` in Node.js
- Use `sslmode=require` in connection strings

## 🚨 Security Best Practices
1. Never hardcode passwords in source code
2. Use environment variables (.env files)
3. Different passwords for dev and production
4. Rotate passwords periodically
5. Use AWS Secrets Manager or Parameter Store in production