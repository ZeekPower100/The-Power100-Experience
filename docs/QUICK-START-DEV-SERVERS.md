# 🚀 Quick Start: Development Servers

## Standard Startup Process

### 1. **Start Backend** (Always First!)
```bash
cd tpe-backend
node src/server.js
```
**Expected Output:**
```
🚀 Server running on port 5000 in development mode
✅ SQLite database connected
✅ Database schema created
✅ Data already seeded
```

### 2. **Start Frontend**
```bash
cd tpe-front-end
npm run dev
```
**Expected Output:**
```
▲ Next.js 15.4.4 (Turbopack)
- Local:        http://localhost:3000    <- NOTE THIS PORT!
- Environments: .env.local
✓ Ready in 3.3s
```

### 3. **Update CORS if Needed**
If frontend port ≠ 3000, update `tpe-backend/.env`:
```env
FRONTEND_URL=http://localhost:3006  # Match actual frontend port
```
Then restart backend.

---

## 🔧 Required Environment Variables

**`tpe-backend/.env`:**
```env
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
DATABASE_TYPE=sqlite
USE_SQLITE=true
JWT_SECRET=power100-development-secret-key-2024
```

---

## ✅ Health Checks

1. **Backend**: `curl http://localhost:5000/health`
2. **Frontend**: Visit `http://localhost:3000/test`
3. **Login**: admin@power100.io / admin123 at `/admindashboard`

---

## 🚨 If Something Breaks

1. **Kill all processes**: `powershell "Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force"`
2. **Check full troubleshooting guide**: `docs/DEV-SERVER-TROUBLESHOOTING.md`
3. **Nuclear option**: Delete `node_modules`, `npm install --force`

---

## 📱 Quick Access URLs

- **Home**: http://localhost:3000
- **Admin**: http://localhost:3000/admindashboard
- **Search**: http://localhost:3000/admindashboard/search
- **Contractor Flow**: http://localhost:3000/contractorflow
- **API Health**: http://localhost:5000/health