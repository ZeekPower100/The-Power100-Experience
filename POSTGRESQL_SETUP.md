# PostgreSQL Local Setup Guide

## Installation Steps

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15 or 16 (recommended)
   - Run the installer

2. **During Installation**
   - Set password for postgres user: `dBP0wer100!!`
   - Default port: 5432
   - Install pgAdmin 4 (GUI tool) - recommended

3. **After Installation**

   Open Command Prompt as Administrator:
   ```bash
   # Create the database
   createdb -U postgres tpedb
   
   # Import the backup (if you have the full file)
   psql -U postgres tpedb < tpe_production_backup.sql
   ```

4. **Verify Connection**
   ```bash
   psql -U postgres -d tpedb -c "SELECT COUNT(*) FROM contractors;"
   ```

## Backend Configuration (Already Done)

Your `.env.development` file has been updated to use PostgreSQL:
```env
USE_SQLITE=false
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=tpedb
DB_USER=tpeadmin
DB_PASSWORD=dBP0wer100!!
```

## Current Status

✅ Production backup created on EC2  
✅ Backend configured for PostgreSQL  
⏳ Waiting for PostgreSQL installation  
⏳ Database import pending  

## Quick Test After Setup

```bash
# Start backend
cd tpe-backend
npm run dev

# In another terminal, start frontend
cd tpe-front-end
npm run dev
```

Visit http://localhost:3002 to test the application.

## Troubleshooting

If you encounter connection issues:
1. Ensure PostgreSQL service is running
2. Check Windows Firewall isn't blocking port 5432
3. Verify the password matches what you set during installation
4. Try connecting with pgAdmin first to verify credentials

## Production Data

The full backup from production contains:
- 20 contractors
- 4 strategic partners
- 3 events
- 3 podcasts  
- 3 manufacturers
- Complete matching history
- All demo bookings

Full backup location on EC2: `/home/ubuntu/tpe_production_backup_20250826.sql`