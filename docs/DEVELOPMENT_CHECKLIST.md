# 📋 Development Checklist - Power100 Experience

## 🚀 **Pre-Development Setup**
- [ ] Backend running on port 5000: `npm run dev:sqlite`
- [ ] Frontend running on port 3002: `npm run dev`
- [ ] Database file exists: `./power100.db`
- [ ] Environment variables loaded
- [ ] Git branch created: `feature/description`

## 🔐 **Authentication Development**
- [ ] Database connection uses standard pattern (see `development-best-practices.md`)
- [ ] API endpoints tested with curl before frontend integration
- [ ] Middleware debug logging added during development
- [ ] Token validation follows consistent format
- [ ] Error handling uses direct boolean checks (`if (!user)`)
- [ ] Database connections properly closed (`await db.close()`)

## 📦 **Dependency Management**
- [ ] Next.js version compatibility verified
- [ ] Build process tested after changes: `npm run build`
- [ ] No Turbopack in development if issues occur
- [ ] Clean install performed if mysterious errors: `npm run fresh`

## 🧪 **Testing Protocol**
1. [ ] **Backend API** tested independently
2. [ ] **Database queries** verified with direct SQL
3. [ ] **Middleware execution** confirmed with logging
4. [ ] **Frontend integration** tested in isolation  
5. [ ] **End-to-end flow** tested in browser

## ⚠️ **Red Flag Checklist**
- [ ] No `result.rows is undefined` errors
- [ ] No mixed database connection methods
- [ ] No "Module not found" for standard packages
- [ ] No authentication state inconsistencies
- [ ] No connection timeout errors

## 📝 **Pre-Commit Requirements**
- [ ] All console.log debug statements removed or flagged
- [ ] Database connections use consistent pattern
- [ ] Error handling follows project standards
- [ ] Authentication flows fully tested
- [ ] No dependency conflicts remain
- [ ] Documentation updated if new patterns introduced

## 🚨 **Emergency Recovery**
If something breaks, follow this order:
1. [ ] **Check server logs** for specific errors
2. [ ] **Test API endpoints** directly with curl
3. [ ] **Verify database connectivity** with direct queries
4. [ ] **Clean frontend install** if dependency issues
5. [ ] **Consult `development-best-practices.md`** for specific issue patterns

---

**Keep this checklist open during development sessions to maintain consistency and prevent regression.**