# Auto-Account Creation System - Complete Overview
## Automated Portal Access for Partners & Contractors After Profile Completion

**Created**: October 27, 2025
**Status**: Planning Phase
**Priority**: High
**Type**: Infrastructure Enhancement (Not a standalone feature)

---

## PROJECT VISION

Automatically create authenticated portal accounts for both partners and contractors when they complete their profiles, eliminating manual account creation and providing immediate access to their respective portals.

**Key Principle**: When a partner or contractor completes their profile (via email-triggered completion flow OR contractor onboarding flow), they should automatically receive:
1. A secure account with generated credentials
2. A welcome email with login instructions
3. Immediate access to their portal dashboard

---

## CURRENT STATE ANALYSIS

### ✅ What Already Exists

#### **Partner Authentication** (100% Complete)
- **Backend**:
  - `partnerAuthController.js` - Handles partner login, registration, password generation
  - `partnerAuthRoutes.js` - `/api/partner-auth/login` endpoint
  - `partnerAuth.js` middleware - JWT protection
  - Function: `createPartnerUser()` - Auto-generates 12-char secure password
- **Frontend**:
  - `/partner/login/page.tsx` - Full login interface with branded design
  - `/partner/dashboard/page.tsx` - Partner portal dashboard
- **Database**:
  - `partner_users` table exists with proper schema
  - `strategic_partners` table with profile data

#### **Contractor Authentication** (0% Complete - Needs to be Built)
- **Backend**: None exists
- **Frontend**: None exists
- **Database**: `contractor_users` table does NOT exist yet

---

## ⚠️ What Needs to Be Built

### **Critical Infrastructure Missing**

1. **Contractor Authentication System** (Phase 1)
   - Backend controllers, routes, middleware
   - Frontend login page and dashboard
   - Database `contractor_users` table

2. **Centralized Account Service** (Phase 2)
   - Shared service for creating accounts (partners AND contractors)
   - Password generation utilities
   - DRY code - avoid duplication

3. **Profile Completion Integration** (Phase 3)
   - Trigger account creation on partner profile completion
   - Trigger account creation on contractor flow completion
   - Trigger account creation on event profile completion

4. **Welcome Email System** (Phase 4)
   - Partner welcome email with credentials
   - Contractor welcome email with credentials
   - Email templates via n8n webhook

---

## PHASED IMPLEMENTATION PLAN

### Phase 1: Contractor Authentication System (Week 1)
**Goal**: Build contractor login/auth to match partner auth system
**Priority**: ⭐ HIGH (Foundation for all other phases)

**Deliverables:**
- `contractor_users` table migration
- `contractorAuthController.js` with login, registration, password generation
- `contractorAuthRoutes.js` with `/api/contractor-auth/login`
- `contractorAuth.js` middleware for JWT protection
- `/contractor/login/page.tsx` - Login interface
- `/contractor/dashboard/page.tsx` - Basic dashboard

**Implementation Doc**: [`phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`](./phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
**Pre-Flight Checklist**: [`phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`](./phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md)

**Success Criteria:**
- [ ] Contractors can log in with email/password
- [ ] JWT authentication working
- [ ] Dashboard displays basic info
- [ ] Matches partner auth pattern exactly

---

### Phase 2: Centralized Account Creation Service (Week 2)
**Goal**: Build shared service for auto-creating accounts + generating passwords
**Priority**: HIGH

**Deliverables:**
- `accountCreationService.js` - Centralized account logic
- Functions:
  - `createPartnerAccount(partnerId, email)`
  - `createContractorAccount(contractorId, email)`
  - `generateSecurePassword()` - Shared utility
  - `hashPassword()` - Shared utility
  - `logAccountCreation()` - Audit trail
- Error handling and validation
- Account existence checks (prevent duplicates)

**Implementation Doc**: [`phase-2/PHASE-2-IMPLEMENTATION-PLAN.md`](./phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)
**Pre-Flight Checklist**: [`phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md`](./phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md)

**Success Criteria:**
- [ ] Service creates partner accounts successfully
- [ ] Service creates contractor accounts successfully
- [ ] Passwords are secure (12+ chars, mixed case, numbers, symbols)
- [ ] Duplicate accounts prevented
- [ ] All account creation logged

---

### Phase 3: Profile Completion Integration (Week 3)
**Goal**: Trigger account creation when profiles are completed
**Priority**: HIGH

**Integration Points:**

1. **Partner Profile Completion**
   - File: `/partner-portal/profile/page.tsx`
   - Trigger: On successful form submission
   - Action: Call `createPartnerAccount()`

2. **Contractor Flow Completion**
   - File: `/contractorflow/page.tsx`
   - Trigger: On step 5 completion
   - Action: Call `createContractorAccount()`

3. **Event Profile Completion** (Contractors)
   - File: `/events/[eventId]/page.tsx` or similar
   - Trigger: When contractor completes event profile
   - Action: Call `createContractorAccount()`

**Implementation Doc**: [`phase-3/PHASE-3-IMPLEMENTATION-PLAN.md`](./phase-3/PHASE-3-IMPLEMENTATION-PLAN.md)
**Pre-Flight Checklist**: [`phase-3/PHASE-3-PRE-FLIGHT-CHECKLIST.md`](./phase-3/PHASE-3-PRE-FLIGHT-CHECKLIST.md)

**Success Criteria:**
- [ ] Partner completes profile → account created
- [ ] Contractor completes flow → account created
- [ ] Event profile completion → account created
- [ ] Duplicate accounts prevented (check if exists first)
- [ ] Errors handled gracefully (don't block profile completion)

---

### Phase 4: Welcome Emails & Testing (Week 4)
**Goal**: Send credentials via email, full end-to-end testing
**Priority**: MEDIUM

**Deliverables:**

1. **Email Templates**
   - Partner welcome email (with credentials + portal link)
   - Contractor welcome email (with credentials + dashboard link)
   - Password reset instructions

2. **Email Sending via n8n**
   - Webhook endpoint: `${N8N_WEBHOOK_BASE}/webhook/account-welcome${N8N_ENV}`
   - Payload includes: email, name, password, portalUrl
   - GHL integration for email delivery

3. **Email Service Integration**
   - `accountCreationService.js` triggers email after account creation
   - Error handling if email fails (log but don't block account creation)
   - Email templates stored in `emailTemplates.js`

4. **Full Flow Testing**
   - Test partner profile completion → account + email
   - Test contractor flow completion → account + email
   - Test event profile completion → account + email
   - Test duplicate prevention
   - Test error scenarios

**Implementation Doc**: [`phase-4/PHASE-4-IMPLEMENTATION-PLAN.md`](./phase-4/PHASE-4-IMPLEMENTATION-PLAN.md)
**Pre-Flight Checklist**: [`phase-4/PHASE-4-PRE-FLIGHT-CHECKLIST.md`](./phase-4/PHASE-4-PRE-FLIGHT-CHECKLIST.md)

**Success Criteria:**
- [ ] Welcome emails sent successfully
- [ ] Email includes correct login credentials
- [ ] Portal links work correctly
- [ ] All flows tested end-to-end
- [ ] Production-ready error handling

---

## DATABASE SCHEMA OVERVIEW

### Existing Tables

#### partner_users (Already Exists)
```sql
CREATE TABLE partner_users (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'partner',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### New Tables to Create

#### contractor_users (Phase 1 - To Be Created)
```sql
CREATE TABLE contractor_users (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'contractor',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### account_creation_audit (Phase 2 - Optional)
```sql
CREATE TABLE account_creation_audit (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(20) NOT NULL, -- 'partner' or 'contractor'
  user_id INTEGER NOT NULL, -- partner_id or contractor_id
  email VARCHAR(255) NOT NULL,
  created_by VARCHAR(50) DEFAULT 'system', -- 'system', 'admin', etc.
  trigger_source VARCHAR(100), -- 'profile_completion', 'manual', etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## TECHNICAL STACK

### Backend
- **Language**: Node.js with Express.js
- **Database**: PostgreSQL (AWS RDS for production)
- **Authentication**: JWT tokens (same as admin/partner auth)
- **Password Hashing**: bcryptjs (12 rounds)
- **Email Delivery**: n8n webhook → GHL

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Animations**: Framer Motion

### File Locations

#### Backend (tpe-backend/src/)
```
controllers/
├── partnerAuthController.js          ✅ EXISTS
├── contractorAuthController.js       ❌ CREATE (Phase 1)
└── (accountCreationService in services/)

routes/
├── partnerAuthRoutes.js              ✅ EXISTS
└── contractorAuthRoutes.js           ❌ CREATE (Phase 1)

middleware/
├── partnerAuth.js                    ✅ EXISTS
└── contractorAuth.js                 ❌ CREATE (Phase 1)

services/
├── emailService.js                   ✅ EXISTS (probably)
└── accountCreationService.js         ❌ CREATE (Phase 2)
```

#### Frontend (tpe-front-end/src/app/)
```
partner/
├── login/page.tsx                    ✅ EXISTS
└── dashboard/page.tsx                ✅ EXISTS

contractor/
├── login/page.tsx                    ❌ CREATE (Phase 1)
└── dashboard/page.tsx                ❌ CREATE (Phase 1)
```

---

## DEVELOPMENT STANDARDS

### Database-First Approach (CRITICAL)
1. **ALWAYS** verify database schema before coding
2. **ALWAYS** use exact field names from database
3. **ALWAYS** add `DATABASE-CHECKED: [table]` comment headers
4. **NEVER** guess field names

### Authentication Pattern (Must Match Existing)
- Copy partner auth pattern exactly for contractor auth
- Use JWT with same secret and expiration
- Use bcrypt with 12 rounds for password hashing
- Generate 12-character secure passwords (uppercase, lowercase, number, symbol)

### Code Standards
- TypeScript strict mode
- Proper error handling (try/catch blocks)
- Loading states for all async operations
- Responsive design (mobile-first)
- Safe JSON helpers (`safeJsonParse`, `safeJsonStringify`)
- Storage helpers (`getFromStorage`, `setToStorage`)

### Phase Workflow
For each phase:
1. Create phase directory: `docs/features/auto-account-creation/phase-X/`
2. Create implementation plan: `PHASE-X-IMPLEMENTATION-PLAN.md`
3. Create pre-flight checklist: `PHASE-X-PRE-FLIGHT-CHECKLIST.md`
4. Verify database schema before coding
5. Build backend first (controllers → routes → testing)
6. Build frontend second (components → pages → testing)
7. Document completion: Update this overview with ✅ checkmarks

---

## SUCCESS METRICS

### Phase 1 Success
- Contractors can log in successfully
- JWT authentication working correctly
- Dashboard loads with contractor data
- Zero authentication errors in logs

### Phase 2 Success
- Accounts created automatically (no manual intervention)
- Passwords are secure and unique
- Duplicate accounts prevented
- All account creation logged for audit

### Phase 3 Success
- Partner profile completion → instant account
- Contractor flow completion → instant account
- Event profile completion → instant account
- Error handling prevents profile completion from failing

### Phase 4 Success
- Welcome emails delivered successfully
- Credentials displayed correctly in email
- Portal links work on first click
- 100% email delivery rate (no bounces due to code errors)

---

## SECURITY CONSIDERATIONS

### Password Security
- **Generation**: 12+ characters with mixed case, numbers, symbols
- **Hashing**: bcrypt with 12 rounds (same as admin system)
- **Storage**: NEVER store plain-text passwords
- **Transmission**: Only send passwords via email ONCE (on account creation)

### JWT Tokens
- **Expiration**: 7 days (same as partner auth)
- **Secret**: Use `process.env.JWT_SECRET`
- **Payload**: Include `id`, `type` (partner/contractor), and relevant foreign key

### Email Security
- **Rate Limiting**: Prevent spam/abuse of welcome emails
- **Validation**: Verify email format before sending
- **Logging**: Log all email attempts (success or failure)
- **Error Handling**: If email fails, don't block account creation

---

## RISK MITIGATION

### Duplicate Account Prevention
**Risk**: Creating multiple accounts for same user
**Mitigation**: Check if account exists before creating (`SELECT WHERE email = $1`)

### Email Delivery Failures
**Risk**: Account created but email never sent
**Mitigation**: Log email failures, provide "Resend Welcome Email" button in admin dashboard

### Password Reset Flow
**Risk**: Users forget auto-generated passwords
**Mitigation**: Build password reset flow (future phase, not critical for MVP)

### Profile Completion Blocking
**Risk**: Account creation fails → profile completion blocked
**Mitigation**: Use try/catch, log error, but still complete profile

---

## NEXT STEPS

1. ✅ **Create Phase 1 Directory Structure** (DONE)
2. ✅ **Build Phase 1 Implementation Plan** (NEXT)
3. ✅ **Create Phase 1 Pre-Flight Checklist** (NEXT)
4. [ ] **Verify Phase 1 Database Schema**
5. [ ] **Begin Phase 1 Development**

---

## REFERENCE DOCUMENTS

### Project-Wide Standards
- `CLAUDE.md` - Project-wide development standards
- `DATABASE-SOURCE-OF-TRUTH.md` - Database-first principles
- `DATABASE-CONNECTION-PATTERN.md` - Query patterns
- `docs/STORAGE-AND-JSON-GUIDELINES.md` - Safe JSON handling

### Similar Feature Documentation
- `docs/features/partner-portal/` - Example of organized feature docs
- `docs/features/ai-concierge/` - Example of phased implementation

### Related Systems
- `docs/PARTNER-BOOKING-SYSTEM-GHL-IMPLEMENTATION.md` - Email automation via n8n
- `tpe-backend/src/controllers/partnerAuthController.js` - Reference for auth pattern

---

**Document Version**: 1.0
**Last Updated**: October 27, 2025
**Next Review**: After Phase 1 Completion
**Status**: Ready to Begin Phase 1
