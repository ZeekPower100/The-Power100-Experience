# PHASE 1 - Contractor Authentication System
## Implementation Plan

**Timeline**: Week 1 (12-16 hours)
**Priority**: ⭐ HIGH (Foundation for all other phases)
**Status**: Ready to Begin

---

## OBJECTIVE

Build a complete contractor authentication system that mirrors the existing partner authentication system, enabling contractors to log in with email/password and access their dashboard.

---

## PRE-FLIGHT CHECKLIST

See [`PHASE-1-PRE-FLIGHT-CHECKLIST.md`](./PHASE-1-PRE-FLIGHT-CHECKLIST.md) for complete verification steps.

**Critical Prerequisites:**
- ✅ Database field names verified from `partner_users` table (October 27, 2025)
- ✅ `contractors` table schema verified
- ⚠️ `contractor_users` table does NOT exist - must create
- ⚠️ **Decision needed**: Contractor dashboard features (what to show initially)

---

## DATABASE SCHEMA VERIFICATION

### ✅ VERIFIED: contractors table (October 27, 2025)
```sql
-- DATABASE-CHECKED: contractors table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES:
-- - id (integer, NOT NULL)
-- - first_name (character varying, nullable)
-- - last_name (character varying, nullable)
-- - email (character varying, NOT NULL)
-- - phone (character varying, nullable)
-- - company_name (character varying, nullable)
-- ================================================================
```

### ✅ VERIFIED: partner_users table (Reference Pattern - October 27, 2025)
```sql
-- DATABASE-CHECKED: partner_users table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES (use these as pattern for contractor_users):
-- - id (integer, NOT NULL, serial)
-- - partner_id (integer, nullable, FOREIGN KEY)
-- - email (character varying, NOT NULL, UNIQUE)
-- - password (character varying, NOT NULL)  ⚠️ NOT "password_hash"!
-- - first_name (character varying, nullable)
-- - last_name (character varying, nullable)
-- - role (character varying, nullable)
-- - is_active (boolean, default true)
-- - last_login (timestamp, nullable)  ⚠️ NOT "last_login_at"!
-- - reset_token (character varying, nullable)  ⚠️ NOT "password_reset_token"!
-- - reset_token_expires (timestamp, nullable)  ⚠️ NOT "password_reset_expires"!
-- - created_at (timestamp, default CURRENT_TIMESTAMP)
-- - updated_at (timestamp, default CURRENT_TIMESTAMP)
-- ================================================================
-- VERIFIED CONSTRAINTS:
-- - PRIMARY KEY (id)
-- - UNIQUE (email)
-- - FOREIGN KEY (partner_id) REFERENCES strategic_partners(id) ON DELETE CASCADE
-- ================================================================
```

---

## IMPLEMENTATION TASKS

### TASK 1: Database Migration - Create contractor_users Table (1-2 hours)

#### 1.1 Create Migration File
**File**: `tpe-database/migrations/YYYY-MM-DD-create-contractor-users-table.sql`
**Purpose**: Create contractor_users table matching partner_users pattern

**Migration SQL:**
```sql
-- Migration: Create contractor_users table
-- DATABASE-CHECKED: Matches partner_users schema pattern verified October 27, 2025
-- ================================================================

CREATE TABLE IF NOT EXISTS contractor_users (
  id SERIAL PRIMARY KEY,

  -- Foreign key to contractors table (matches partner_users.partner_id pattern)
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,

  -- Authentication fields (EXACT naming from partner_users)
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- ⚠️ Named "password" NOT "password_hash"

  -- User info fields
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'contractor',

  -- Account status
  is_active BOOLEAN DEFAULT true,

  -- Login tracking (EXACT naming from partner_users)
  last_login TIMESTAMP,  -- ⚠️ Named "last_login" NOT "last_login_at"

  -- Password reset fields (EXACT naming from partner_users)
  reset_token VARCHAR(255),  -- ⚠️ Named "reset_token" NOT "password_reset_token"
  reset_token_expires TIMESTAMP,  -- ⚠️ Named "reset_token_expires" NOT "password_reset_expires"

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on contractor_id for faster lookups
CREATE INDEX idx_contractor_users_contractor_id ON contractor_users(contractor_id);

-- Create index on email for faster login lookups
CREATE INDEX idx_contractor_users_email ON contractor_users(email);

-- Add comment for documentation
COMMENT ON TABLE contractor_users IS 'Authentication credentials for contractors to access their portal';
```

#### 1.2 Run Migration
**Commands:**
```bash
# Development database:
powershell -Command ".\quick-db.bat \"$(cat tpe-database/migrations/YYYY-MM-DD-create-contractor-users-table.sql)\""

# Production database (use MCP tool):
# Run same SQL using mcp__aws-production__exec
```

#### 1.3 Verify Migration
**Verification Commands:**
```bash
# Check table was created:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractor_users' ORDER BY ordinal_position;\""

# Check constraints:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_users'::regclass;\""

# Check indexes:
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'contractor_users';\""
```

---

### TASK 2: Backend Authentication Controller (3-4 hours)

#### 2.1 Create contractorAuthController.js
**File**: `tpe-backend/src/controllers/contractorAuthController.js`
**Purpose**: Handle contractor login, registration, password generation

**Implementation Pattern** (Copy from `partnerAuthController.js` and adapt):

```javascript
// DATABASE-CHECKED: contractor_users, contractors tables verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_users.password (NOT password_hash)
// - contractor_users.last_login (NOT last_login_at)
// - contractor_users.reset_token (NOT password_reset_token)
// - contractor_users.reset_token_expires (NOT password_reset_expires)
// - contractors.id, email, first_name, last_name, company_name
// ================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Generate JWT token for contractors
const signContractorToken = (contractorId, contractorUserId) => {
  return jwt.sign(
    {
      id: contractorUserId,
      contractorId: contractorId,
      type: 'contractor' // Distinguish from admin/partner tokens
    },
    process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Generate secure password (same pattern as partner auth)
const generateSecurePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char

  // Fill remaining length
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Create contractor user account (called by system when contractor completes profile)
const createContractorUser = async (contractorId, contractorEmail) => {
  try {
    // Check if contractor user already exists
    const existingUser = await query(
      'SELECT id FROM contractor_users WHERE contractor_id = $1',
      [contractorId]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Contractor user account already exists');
    }

    // Generate secure password
    const plainPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // Get contractor info for first_name, last_name
    const contractorResult = await query(
      'SELECT first_name, last_name FROM contractors WHERE id = $1',
      [contractorId]
    );

    const contractor = contractorResult.rows[0];

    // Create contractor user
    // DATABASE-CHECKED: Using exact field names from partner_users pattern
    const result = await query(`
      INSERT INTO contractor_users (
        contractor_id,
        email,
        password,
        first_name,
        last_name,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `, [
      contractorId,
      contractorEmail,
      passwordHash,
      contractor?.first_name || null,
      contractor?.last_name || null
    ]);

    console.log(`🔐 Created contractor user account for contractor ${contractorId}`);

    return {
      contractorId,
      email: contractorEmail,
      password: plainPassword, // Return plain password for email sending
      userId: result.rows[0].id
    };

  } catch (error) {
    console.error('Failed to create contractor user:', error);
    throw error;
  }
};

// Contractor login
const contractorLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    console.log('🔐 Contractor login attempt for:', email);

    // Find contractor user by email
    // DATABASE-CHECKED: Using exact field names
    const userResult = await query(
      `SELECT
        cu.id,
        cu.contractor_id,
        cu.email,
        cu.password,
        cu.first_name,
        cu.last_name,
        cu.is_active,
        c.company_name
      FROM contractor_users cu
      LEFT JOIN contractors c ON c.id = cu.contractor_id
      WHERE cu.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('Invalid credentials', 401));
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Update last_login timestamp
    // DATABASE-CHECKED: Using exact field name "last_login"
    await query(
      'UPDATE contractor_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = signContractorToken(user.contractor_id, user.id);

    console.log(`✅ Contractor login successful for: ${email}`);

    res.json({
      success: true,
      token,
      contractor: {
        id: user.contractor_id,
        userId: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name
      }
    });

  } catch (error) {
    console.error('Contractor login error:', error);
    return next(new AppError('Login failed. Please try again.', 500));
  }
};

// Get current contractor user (protected route)
const getCurrentContractor = async (req, res, next) => {
  try {
    const userId = req.contractorUser.id; // Set by contractorAuth middleware

    // DATABASE-CHECKED: Using exact field names
    const userResult = await query(
      `SELECT
        cu.id,
        cu.contractor_id,
        cu.email,
        cu.first_name,
        cu.last_name,
        cu.last_login,
        c.company_name,
        c.phone
      FROM contractor_users cu
      LEFT JOIN contractors c ON c.id = cu.contractor_id
      WHERE cu.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      success: true,
      contractor: userResult.rows[0]
    });

  } catch (error) {
    console.error('Error fetching current contractor:', error);
    return next(new AppError('Failed to fetch user data', 500));
  }
};

module.exports = {
  contractorLogin,
  getCurrentContractor,
  createContractorUser,
  generateSecurePassword
};
```

**Sub-tasks:**
- [ ] Copy `partnerAuthController.js` as template
- [ ] Rename all "partner" references to "contractor"
- [ ] Update table names: `partner_users` → `contractor_users`
- [ ] Update field names to match verified schema
- [ ] Ensure exact field naming: `password`, `last_login`, `reset_token`
- [ ] Add `DATABASE-CHECKED` comment header
- [ ] Test all functions with curl

---

### TASK 3: Backend Authentication Routes (1-2 hours)

#### 3.1 Create contractorAuthRoutes.js
**File**: `tpe-backend/src/routes/contractorAuthRoutes.js`
**Purpose**: Define contractor auth endpoints

**Implementation:**
```javascript
const express = require('express');
const router = express.Router();
const { contractorLogin, getCurrentContractor } = require('../controllers/contractorAuthController');
const { protectContractor } = require('../middleware/contractorAuth'); // Will create in Task 4
const { asyncHandler } = require('../middleware/errorHandler');

// Public routes
router.post('/login', asyncHandler(contractorLogin));

// Protected routes (require contractor auth)
router.get('/me', protectContractor, asyncHandler(getCurrentContractor));

module.exports = router;
```

#### 3.2 Register Routes in server.js
**File**: `tpe-backend/src/server.js`

**Add these lines:**
```javascript
// Contractor authentication routes
const contractorAuthRoutes = require('./routes/contractorAuthRoutes');
app.use('/api/contractor-auth', contractorAuthRoutes);
```

**Sub-tasks:**
- [ ] Create `contractorAuthRoutes.js`
- [ ] Add routes to `server.js`
- [ ] Verify routes are registered: `GET /api/contractor-auth/me`, `POST /api/contractor-auth/login`

---

### TASK 4: Backend Authentication Middleware (2-3 hours)

#### 4.1 Create contractorAuth.js
**File**: `tpe-backend/src/middleware/contractorAuth.js`
**Purpose**: JWT verification middleware for contractor routes

**Implementation Pattern** (Copy from `partnerAuth.js` and adapt):

```javascript
// DATABASE-CHECKED: contractor_users table verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_users.id, contractor_id, email, is_active
// ================================================================

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

// Protect contractor routes - verify JWT token
const protectContractor = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token type
    if (decoded.type !== 'contractor') {
      return next(new AppError('Invalid token type', 401));
    }

    // Get contractor user from database
    // DATABASE-CHECKED: Using exact field names
    const userResult = await query(
      `SELECT
        id,
        contractor_id,
        email,
        first_name,
        last_name,
        is_active
      FROM contractor_users
      WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User no longer exists', 401));
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    // Attach user to request
    req.contractorUser = user;
    req.contractorId = user.contractor_id;

    next();

  } catch (error) {
    console.error('Contractor auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }

    return next(new AppError('Not authorized to access this route', 401));
  }
};

module.exports = {
  protectContractor
};
```

**Sub-tasks:**
- [ ] Copy `partnerAuth.js` as template
- [ ] Rename all "partner" references to "contractor"
- [ ] Update table name: `partner_users` → `contractor_users`
- [ ] Update token type check: `type !== 'contractor'`
- [ ] Add to request: `req.contractorUser` and `req.contractorId`
- [ ] Add `DATABASE-CHECKED` comment header
- [ ] Test with valid/invalid tokens

---

### TASK 5: Frontend Login Page (3-4 hours)

#### 5.1 Create Contractor Login Page
**File**: `tpe-front-end/src/app/contractor/login/page.tsx`
**Purpose**: Contractor login interface

**Implementation Pattern** (Copy from `/partner/login/page.tsx` and adapt):

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, LogIn, Users, Target, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, setToStorage } from '@/utils/jsonHelpers';

export default function ContractorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('api/contractor-auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeJsonStringify({ email, password }),
      });

      const data = await handleApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      // Store contractor token and info
      setToStorage('contractorToken', data.token);
      setToStorage('contractorInfo', data.contractor);

      // Redirect to contractor dashboard
      router.push('/contractor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Login Form */}
            <Card className="shadow-xl">
              <CardHeader className="space-y-1 pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-8 h-8 text-red-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Contractor Portal</h1>
                </div>
                <CardTitle className="text-xl">Welcome Back</CardTitle>
                <CardDescription>
                  Sign in to access your personalized dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      placeholder="contractor@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent pr-10"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </span>
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    <Link href="/contractor/forgot-password" className="text-red-600 hover:text-red-700">
                      Forgot your password?
                    </Link>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Need help?</span>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    Contact support at{' '}
                    <a href="mailto:support@power100.io" className="text-red-600 hover:text-red-700">
                      support@power100.io
                    </a>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right Side - Benefits */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Your Business Growth Hub
                </h2>
                <p className="text-gray-600 mb-6">
                  Access your personalized recommendations, strategic partner connections, and growth resources all in one place.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-4"
              >
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Target className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Partner Matches</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          View strategic partners matched to your business goals and growth areas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Award className="w-6 h-6 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Personalized Resources</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Access curated books, podcasts, and content tailored to your focus areas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Users className="w-6 h-6 text-red-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Event Planning</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Get personalized event agendas and networking recommendations
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <p className="text-sm text-gray-600">
                  <strong>New to Power100?</strong> You should have received your login credentials via email after completing your profile. Can't find them? Contact support.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Back to main site link */}
        <div className="text-center mt-8">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Power100 Experience
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Sub-tasks:**
- [ ] Copy `/partner/login/page.tsx` as template
- [ ] Update API endpoint: `/api/contractor-auth/login`
- [ ] Update storage keys: `contractorToken`, `contractorInfo`
- [ ] Update redirect: `/contractor/dashboard`
- [ ] Update branding (title, description, benefits)
- [ ] Test login flow end-to-end

---

### TASK 6: Frontend Dashboard Page (2-3 hours)

#### 6.1 Create Basic Contractor Dashboard
**File**: `tpe-front-end/src/app/contractor/dashboard/page.tsx`
**Purpose**: Basic contractor portal landing page

**Implementation** (Simple MVP version - can expand later):

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, Calendar, BookOpen, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { getFromStorage, setToStorage, handleApiResponse } from '@/utils/jsonHelpers';

export default function ContractorDashboardPage() {
  const router = useRouter();
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getFromStorage('contractorToken');
    if (!token) {
      router.push('/contractor/login');
      return;
    }

    fetchContractorData();
  }, []);

  const fetchContractorData = async () => {
    try {
      const token = getFromStorage('contractorToken');

      const response = await fetch(getApiUrl('api/contractor-auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await handleApiResponse(response);

      if (!response.ok) {
        throw new Error('Session expired');
      }

      setContractor(data.contractor);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch contractor data:', error);
      // Clear invalid token and redirect to login
      setToStorage('contractorToken', null);
      setToStorage('contractorInfo', null);
      router.push('/contractor/login');
    }
  };

  const handleLogout = () => {
    setToStorage('contractorToken', null);
    setToStorage('contractorInfo', null);
    router.push('/contractor/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-power100-black">
              Welcome back, {contractor?.first_name || 'there'}!
            </h1>
            <p className="text-power100-grey text-sm">
              {contractor?.company_name || 'Your Business'}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Partner Matches Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Partner Matches</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-power100-grey">
                  View strategic partners matched to your business goals
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Focus Areas Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Focus Areas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-power100-grey">
                  Manage your business focus areas and goals
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Events Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">My Events</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-power100-grey">
                  View upcoming events and personalized agendas
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Resources Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <BookOpen className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg">Resources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-power100-grey">
                  Access books, podcasts, and curated content
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-power100-grey mb-4">
              Welcome to your Power100 contractor portal! Here's what you can do:
            </p>
            <ul className="space-y-2 text-sm text-power100-grey">
              <li className="flex items-start gap-2">
                <span className="text-power100-green">✓</span>
                View strategic partners matched to your business goals
              </li>
              <li className="flex items-start gap-2">
                <span className="text-power100-green">✓</span>
                Access personalized event agendas and networking recommendations
              </li>
              <li className="flex items-start gap-2">
                <span className="text-power100-green">✓</span>
                Explore curated resources tailored to your focus areas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-power100-green">✓</span>
                Connect with industry experts and peers
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Sub-tasks:**
- [ ] Create basic dashboard layout
- [ ] Fetch contractor data from `/api/contractor-auth/me`
- [ ] Display welcome message with contractor name
- [ ] Show placeholder cards for future features
- [ ] Implement logout functionality
- [ ] Add loading state
- [ ] Handle authentication errors (redirect to login)
- [ ] Test authenticated access

---

### TASK 7: Testing & Documentation (2-3 hours)

#### 7.1 Backend API Testing
**Test Commands:**

```bash
# 1. Test contractor login
curl -X POST http://localhost:5000/api/contractor-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@test.com",
    "password": "Test123!"
  }'

# Expected: { "success": true, "token": "...", "contractor": {...} }

# 2. Test get current contractor (use token from login)
curl http://localhost:5000/api/contractor-auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: { "success": true, "contractor": {...} }

# 3. Test with invalid token
curl http://localhost:5000/api/contractor-auth/me \
  -H "Authorization: Bearer invalid_token"

# Expected: { "success": false, "message": "Invalid token" } (401)

# 4. Test with missing token
curl http://localhost:5000/api/contractor-auth/me

# Expected: { "success": false, "message": "Not authorized..." } (401)
```

#### 7.2 Frontend Integration Testing
**Test Scenarios:**
- [ ] Navigate to `/contractor/login`
- [ ] Enter valid credentials → redirects to `/contractor/dashboard`
- [ ] Dashboard shows contractor name and info
- [ ] Logout button clears token and redirects to login
- [ ] Navigate to `/contractor/dashboard` without token → redirects to login
- [ ] Enter invalid credentials → shows error message
- [ ] Password visibility toggle works

#### 7.3 Database Verification
**Verify Commands:**
```bash
# Check contractor_users table exists with correct schema
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' ORDER BY ordinal_position;\""

# Check foreign key constraint exists
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_users'::regclass;\""

# Check account was created (after running createContractorUser)
powershell -Command ".\quick-db.bat \"SELECT id, contractor_id, email, is_active, created_at FROM contractor_users;\""
```

---

## DELIVERABLES

### Backend ✅
- `contractor_users` table migration
- `contractorAuthController.js` with login, registration, password generation
- `contractorAuthRoutes.js` with `/login` and `/me` endpoints
- `contractorAuth.js` middleware for JWT protection

### Frontend ✅
- `/contractor/login/page.tsx` - Login interface
- `/contractor/dashboard/page.tsx` - Basic dashboard

### Testing ✅
- All API endpoints tested with curl
- Frontend login/logout flow tested
- Database schema verified
- JWT authentication working

### Documentation ✅
- Phase 1 complete checklist
- API endpoint documentation
- Database schema documentation

---

## SUCCESS CRITERIA

### Must Have ✅
- [ ] `contractor_users` table created successfully
- [ ] Contractors can log in with email/password
- [ ] JWT authentication working correctly
- [ ] Dashboard loads with contractor data
- [ ] Logout clears session and redirects to login
- [ ] Protected routes redirect to login if not authenticated

### Nice to Have
- [ ] Password reset flow (future phase)
- [ ] Remember me functionality
- [ ] Session expiration warnings
- [ ] Multi-device session management

### Phase 1 Complete When:
- [ ] All "Must Have" criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for Phase 2 integration

---

## NEXT STEPS (Phase 2)

After Phase 1 is complete:
1. Build centralized `accountCreationService.js`
2. Add `createContractorAccount()` function
3. Test automatic account creation
4. Proceed to Phase 3 (profile completion integration)

---

**Document Created**: October 27, 2025
**Status**: Ready to Begin
**Estimated Completion**: 1 week (12-16 hours)
