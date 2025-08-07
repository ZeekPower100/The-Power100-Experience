# Development Best Practices & Troubleshooting Guide
## The Power100 Experience

### 🎯 **Purpose**
This document outlines critical development practices learned from resolving authentication server issues and frontend dependency conflicts. Following these guidelines will prevent similar problems and maintain development velocity.

---

## 🗄️ **Database Management Standards**

### **Rule 1: Consistent Database Connection Pattern**
**Always use the same database connection method within related functionality modules.**

#### ✅ **CORRECT Approach**
```javascript
// Standard connection pattern for all partner authentication
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const db = await open({
  filename: './power100.db',
  driver: sqlite3.Database
});

const user = await db.get('SELECT * FROM partner_users WHERE email = ?', [email]);
await db.close();
```

#### ❌ **AVOID: Mixed Connection Methods**
```javascript
// DON'T mix query wrapper with direct connections
const result = await query('SELECT...'); // Query wrapper
const db = new sqlite3.Database('./power100.db'); // Direct connection
```

### **Rule 2: Database Connection Utilities**
**Create centralized database utilities to ensure consistency across the application.**

#### **Required File: `/src/utils/database.js`**
```javascript
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class DatabaseConnection {
  static async getConnection() {
    return await open({
      filename: './power100.db',
      driver: sqlite3.Database
    });
  }
  
  static async executeQuery(query, params = []) {
    const db = await this.getConnection();
    try {
      const result = await db.get(query, params);
      return result;
    } finally {
      await db.close();
    }
  }
}

module.exports = DatabaseConnection;
```

### **Rule 3: Database Error Handling**
**Always use direct boolean checks and proper connection cleanup.**

#### ✅ **CORRECT Error Handling**
```javascript
const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
if (!user) {
  await db.close();
  return next(new AppError('User not found', 404));
}
```

#### ❌ **AVOID: Inconsistent Result Checking**
```javascript
if (result.rows.length === 0) { // Assumes specific result format
```

---

## 🔐 **Authentication Development Standards**

### **Rule 4: Authentication Flow Testing Protocol**
**Before implementing auth changes, always test the complete flow in this order:**

1. **Backend API Test** (using curl/Postman)
2. **Middleware Verification** (with debug logging)
3. **Frontend Integration Test**
4. **End-to-End Browser Test**

#### **Authentication Testing Checklist**
- [ ] Login endpoint returns JWT token
- [ ] Protected endpoints reject requests without token
- [ ] Middleware sets `req.user` or `req.partnerUser` correctly
- [ ] Frontend stores and sends token properly
- [ ] Logout clears token and redirects appropriately

### **Rule 5: Token Management Standards**
**Follow consistent token handling patterns across frontend and backend.**

#### **Frontend Token Standards**
```javascript
// Always check token existence before API calls
const token = localStorage.getItem('partnerToken');
if (!token) {
  router.push('/partner-portal');
  return;
}

// Consistent header format
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

#### **Backend Token Validation**
```javascript
// Standard middleware token extraction
let token;
if (req.headers.authorization?.startsWith('Bearer')) {
  token = req.headers.authorization.split(' ')[1];
} else if (req.cookies?.partnerToken) {
  token = req.cookies.partnerToken;
}
```

---

## 📦 **Frontend Dependency Management**

### **Rule 6: Next.js Version Compatibility**
**Maintain compatibility matrix and test build process after any dependency changes.**

#### **Compatibility Requirements**
- **Next.js 15.x** → Use standard webpack (avoid Turbopack in development)
- **PostCSS 8.x** → Ensure `nanoid` and `picocolors` are properly installed
- **Node.js 18+** → Required for Next.js 15 compatibility

#### **Dependency Update Protocol**
1. **Check compatibility** before updating major versions
2. **Test build process** after any dependency changes
3. **Clean install** if mysterious errors occur: `rm -rf node_modules package-lock.json && npm install`

### **Rule 7: Development Server Configuration**
**Standardize development server startup and port management.**

#### **Package.json Scripts Standards**
```json
{
  "scripts": {
    "dev": "next dev --port 3002",
    "dev:backend": "node start-sqlite.js",
    "dev:turbo": "next dev --port 3002 --turbopack",
    "clean": "rm -rf node_modules package-lock.json .next",
    "fresh": "npm run clean && npm install"
  }
}
```

---

## 🔧 **Development Workflow Standards**

### **Rule 8: Problem Isolation Protocol**
**When encountering issues, isolate problems using this hierarchy:**

1. **Backend API** → Test endpoints directly with curl
2. **Database Layer** → Verify data exists with direct SQL queries
3. **Middleware** → Add debug logging to verify execution
4. **Frontend** → Test in browser dev tools console
5. **Integration** → Test complete user flow

### **Rule 9: Debug Logging Standards**
**Use consistent debug logging patterns for troubleshooting.**

#### **Backend Debug Logging**
```javascript
console.log('🔐 Auth attempt:', { email, timestamp: new Date().toISOString() });
console.log('🔍 Database result:', user ? 'Found' : 'Not found');
console.log('✅ Token generated:', !!token);
```

#### **Frontend Debug Logging**
```javascript
console.log('🌐 API Request:', { endpoint, method, hasToken: !!token });
console.log('📦 Response:', { success: data.success, hasData: !!data });
console.log('🏪 Storage:', { hasToken: !!localStorage.getItem('token') });
```

### **Rule 10: Git Workflow for Complex Features**
**Use feature branches with specific naming for complex implementations.**

#### **Branch Naming Convention**
- `feature/auth-system-fixes` (major feature work)
- `fix/database-connection-consistency` (bug fixes)
- `docs/authentication-troubleshooting` (documentation)

#### **Commit Message Standards**
```
feat: standardize database connections for partner auth
fix: resolve PostCSS dependency conflicts in Next.js
docs: add authentication troubleshooting guide
```

---

## 📋 **Pre-Development Checklist**

### **Before Starting New Authentication Features**
- [ ] Database connection method chosen and documented
- [ ] Authentication flow diagram created
- [ ] Test cases written for happy path and error cases
- [ ] Frontend token management strategy defined
- [ ] Backend middleware protection implemented

### **Before Dependency Updates**
- [ ] Current versions documented
- [ ] Compatibility research completed
- [ ] Local backup branch created
- [ ] Build process tested after changes

### **Before Code Integration**
- [ ] Backend endpoints tested with curl/Postman
- [ ] Database queries tested independently
- [ ] Frontend integration tested in isolation
- [ ] Complete user flow tested end-to-end

---

## 🚨 **Red Flag Indicators**

### **Database Issues**
- `result.rows is undefined` errors
- Inconsistent query result formats
- Connection timeout errors
- "User not found" with valid credentials

### **Authentication Issues**
- Login succeeds but protected routes fail
- Token exists but middleware rejects it
- Successful API calls but frontend shows errors
- Inconsistent authentication state

### **Frontend Issues**
- Build process fails after dependency updates
- `Module not found` errors for standard packages
- Server refuses connection on expected ports
- CSS/styling suddenly breaks

---

## 🔄 **Recovery Procedures**

### **Database Connection Issues**
1. **Verify database file exists** and has correct permissions
2. **Check all imports** use the same connection method
3. **Add debug logging** to trace connection flow
4. **Test queries independently** in database tool

### **Frontend Dependency Issues**
1. **Clean install**: `rm -rf node_modules package-lock.json && npm install`
2. **Remove Turbopack**: Use standard Next.js webpack
3. **Check Next.js compatibility** with current Node.js version
4. **Verify package.json scripts** match expected behavior

### **Authentication Flow Breakdown**
1. **Test backend endpoints** directly with curl
2. **Verify database has required data** with direct queries
3. **Check middleware execution** with console.log debugging
4. **Validate frontend token handling** in browser dev tools

---

## 🎯 **Success Metrics**

### **Development Velocity Indicators**
- Authentication issues resolved in < 30 minutes
- Dependency conflicts resolved in < 15 minutes  
- New features implemented without breaking existing auth
- Zero authentication regressions between releases

### **Code Quality Standards**
- All database queries use consistent connection method
- All API endpoints have proper error handling
- All authentication flows have corresponding tests
- All major features documented in this guide

---

*This document should be updated whenever new development patterns are established or issues are resolved. Treat it as a living document that evolves with the project.*