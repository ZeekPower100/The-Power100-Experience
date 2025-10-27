# PHASE 1 - Partner Portal Real Data Integration
## Pre-Flight Checklist

**Purpose**: Verify all prerequisites before starting Phase 1 development
**Date**: October 24, 2025

---

## DATABASE VERIFICATION

### Table Existence
- [ ] `strategic_partners` table exists
- [ ] `partner_users` table exists
- [ ] `partner_analytics` table exists
- [ ] `partner_leads` table exists
- [ ] `contractor_partner_matches` table exists
- [ ] `feedback_surveys` table exists
- [ ] `feedback_responses` table exists

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('strategic_partners', 'partner_users', 'partner_analytics', 'partner_leads', 'contractor_partner_matches', 'feedback_surveys', 'feedback_responses') ORDER BY tablename;\""
```

---

### Field Name Verification

#### strategic_partners Table
- [ ] `power_confidence_score` field exists (NOT powerconfidence_score)
- [ ] `previous_powerconfidence_score` field exists
- [ ] `score_trend` field exists
- [ ] `industry_rank` field exists
- [ ] `average_satisfaction` field exists
- [ ] `total_contractor_engagements` field exists
- [ ] `is_active` field exists

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('power_confidence_score', 'previous_powerconfidence_score', 'score_trend', 'industry_rank', 'average_satisfaction', 'total_contractor_engagements', 'is_active') ORDER BY column_name;\""
```

#### partner_users Table
- [ ] `partner_id` field exists
- [ ] `email` field exists
- [ ] `password` field exists
- [ ] `is_active` field exists
- [ ] `last_login` field exists

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name IN ('partner_id', 'email', 'password', 'is_active', 'last_login') ORDER BY column_name;\""
```

#### contractor_partner_matches Table
- [ ] `match_score` field exists (NOT just score)
- [ ] `match_reasons` field exists (NOT just reasons)
- [ ] `is_primary_match` field exists (NOT just is_primary)

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'contractor_partner_matches' AND column_name IN ('match_score', 'match_reasons', 'is_primary_match') ORDER BY column_name;\""
```

---

### Data Existence

#### Test Partner Data
- [ ] At least 1 partner exists in `strategic_partners` table
- [ ] At least 1 partner user exists in `partner_users` table
- [ ] Test partner has a `power_confidence_score` value
- [ ] Test partner `is_active = true`

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT id, company_name, power_confidence_score, is_active FROM strategic_partners LIMIT 5;\""
```

#### Partner Authentication Data
- [ ] Partner user has valid `partner_id` linking to `strategic_partners`
- [ ] Partner user has valid `email` and `password` (hashed)
- [ ] Partner user `is_active = true`

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT pu.id, pu.email, pu.partner_id, sp.company_name FROM partner_users pu LEFT JOIN strategic_partners sp ON sp.id = pu.partner_id LIMIT 5;\""
```

#### Optional Data (May be empty)
- [ ] Check if `partner_analytics` has any data
- [ ] Check if `feedback_surveys` has any data
- [ ] Check if `feedback_responses` has any data
- [ ] Check if `contractor_partner_matches` has any data

**Verification Commands:**
```bash
# Check partner_analytics
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM partner_analytics;\""

# Check feedback_surveys
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM feedback_surveys;\""

# Check feedback_responses
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM feedback_responses;\""

# Check contractor_partner_matches
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM contractor_partner_matches;\""
```

---

## AUTHENTICATION SYSTEM VERIFICATION

### Middleware Exists
- [ ] `tpe-backend/src/middleware/partnerAuth.js` file exists
- [ ] `protectPartner` middleware function exported
- [ ] JWT token verification implemented

**Verification Command:**
```bash
cat tpe-backend/src/middleware/partnerAuth.js | grep "protectPartner"
```

### Auth Routes Exist
- [ ] `tpe-backend/src/routes/partnerAuthRoutes.js` file exists
- [ ] Login endpoint exists: `POST /api/partner-auth/login`
- [ ] Registration endpoint exists (if needed)

**Verification Command:**
```bash
cat tpe-backend/src/routes/partnerAuthRoutes.js | grep -E "router\.(post|get)"
```

### Auth Controller Exists
- [ ] `tpe-backend/src/controllers/partnerAuthController.js` file exists
- [ ] `login` function implemented
- [ ] JWT token generation working

**Verification Command:**
```bash
cat tpe-backend/src/controllers/partnerAuthController.js | grep "async.*login"
```

---

## EXISTING PORTAL FILES VERIFICATION

### Backend Files
- [ ] `tpe-backend/src/routes/partnerPortalRoutes.js` exists
- [ ] `tpe-backend/src/controllers/partnerPortalController.js` exists
- [ ] Routes mounted in `server.js`

**Verification Commands:**
```bash
# Check if portal routes file exists
ls tpe-backend/src/routes/partnerPortalRoutes.js

# Check if portal controller exists
ls tpe-backend/src/controllers/partnerPortalController.js

# Check if routes mounted in server.js
grep "partnerPortalRoutes" tpe-backend/src/server.js
```

### Frontend Files
- [ ] `tpe-front-end/src/app/partner/dashboard/page.tsx` exists
- [ ] `tpe-front-end/src/app/partner/login/page.tsx` exists
- [ ] Dashboard UI renders correctly

**Verification Commands:**
```bash
# Check dashboard page exists
ls tpe-front-end/src/app/partner/dashboard/page.tsx

# Check login page exists
ls tpe-front-end/src/app/partner/login/page.tsx
```

---

## ENVIRONMENT CONFIGURATION

### Database Connection
- [ ] `DATABASE_URL` or equivalent env vars configured
- [ ] Local database connection working
- [ ] Production database credentials available (if needed)

**Verification Command:**
```bash
# Test database connection
powershell -Command ".\quick-db.bat \"SELECT NOW();\""
```

### Backend Environment
- [ ] `JWT_SECRET` configured in .env
- [ ] `PORT` configured (default: 5000)
- [ ] Backend server starts without errors

**Verification Commands:**
```bash
# Check .env file exists
ls tpe-backend/.env

# Check JWT_SECRET exists
grep "JWT_SECRET" tpe-backend/.env
```

### Frontend Environment
- [ ] Frontend API URL configured (pointing to localhost:5000 or production)
- [ ] Frontend builds without errors

---

## DEPENDENCIES INSTALLED

### Backend Dependencies
- [ ] `express` installed
- [ ] `pg` (PostgreSQL driver) installed
- [ ] `jsonwebtoken` installed
- [ ] `bcrypt` or `bcryptjs` installed

**Verification Command:**
```bash
cd tpe-backend && npm list express pg jsonwebtoken bcryptjs
```

### Frontend Dependencies
- [ ] `next` installed
- [ ] `react` installed
- [ ] `@/components/ui` components available
- [ ] `lucide-react` icons installed

**Verification Command:**
```bash
cd tpe-front-end && npm list next react lucide-react
```

---

## TESTING PREREQUISITES

### Test Partner Account
- [ ] Create test partner user with known credentials
- [ ] Test login works with test credentials
- [ ] JWT token generated successfully

**Create Test User (if needed):**
```sql
-- First, ensure a partner exists in strategic_partners
INSERT INTO strategic_partners (company_name, contact_email, power_confidence_score, is_active)
VALUES ('Test Partner Co', 'test@partner.com', 75, true)
RETURNING id;

-- Then create a partner user (use the returned id)
-- Password: 'password123' (hash this using bcrypt)
INSERT INTO partner_users (partner_id, email, password, first_name, last_name, is_active)
VALUES (1, 'test@partner.com', '$2a$10$...', 'Test', 'Partner', true);
```

### Test Data (Optional)
- [ ] Add test quarterly data to `partner_analytics`
- [ ] Add test feedback to `feedback_surveys` and `feedback_responses`
- [ ] Add test contractor matches to `contractor_partner_matches`

**Sample Test Data:**
```sql
-- Add quarterly analytics
INSERT INTO partner_analytics (partner_id, metric_type, metric_value, period_start, period_end)
VALUES
  (1, 'powerconfidence_score', 75, '2024-01-01', '2024-03-31'),
  (1, 'powerconfidence_score', 78, '2024-04-01', '2024-06-30'),
  (1, 'powerconfidence_score', 80, '2024-07-01', '2024-09-30'),
  (1, 'powerconfidence_score', 82, '2024-10-01', '2024-12-31');
```

---

## DEVELOPMENT TOOLS

### Server Management
- [ ] `dev-manager.js` script available
- [ ] Can start both frontend and backend servers
- [ ] Can restart servers without issues

**Verification Commands:**
```bash
# Start both servers
node dev-manager.js start all

# Check server status
node dev-manager.js status
```

### Database Tools
- [ ] `quick-db.bat` script available for quick queries
- [ ] Can execute SELECT queries successfully
- [ ] Can view table schemas

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT version();\""
```

---

## CODE STANDARDS VERIFICATION

### Documentation
- [ ] `DATABASE-SOURCE-OF-TRUTH.md` file exists
- [ ] `DATABASE-CONNECTION-PATTERN.md` file exists
- [ ] `PHASE-1-FIELD-REFERENCE.md` created and verified

**Verification Commands:**
```bash
ls DATABASE-SOURCE-OF-TRUTH.md
ls DATABASE-CONNECTION-PATTERN.md
ls docs/features/partner-portal/phase-1/PHASE-1-FIELD-REFERENCE.md
```

### Helpers and Utilities
- [ ] `safeJsonParse` and `safeJsonStringify` available
- [ ] `getFromStorage` and `setToStorage` available
- [ ] Error handling helpers available

**Verification Command:**
```bash
grep -r "safeJsonParse" tpe-front-end/src/utils/
```

---

## DECISION CHECKPOINTS

### Category Scores Decision
- [ ] **Decision made**: How to implement category scores?
  - Option A: New table `partner_category_scores`
  - Option B: AI/NLP analysis of feedback
  - Option C: Store in `partner_analytics` with metric_type

**Recommended**: Option C for Phase 1 MVP

### Data Population Strategy
- [ ] **Decision made**: How to populate missing data?
  - Backfill historical data?
  - Start fresh from Phase 1 launch?
  - Use default values for missing data?

**Recommended**: Use default values, backfill in Phase 2

---

## FINAL CHECKLIST

### Before Starting Development
- [ ] All database tables verified ✅
- [ ] All field names verified ✅
- [ ] Test partner account created ✅
- [ ] Authentication system working ✅
- [ ] Existing code reviewed ✅
- [ ] Development environment configured ✅
- [ ] Dependencies installed ✅

### Before Writing Code
- [ ] Read `PHASE-1-FIELD-REFERENCE.md` completely
- [ ] Read `PHASE-1-IMPLEMENTATION-PLAN.md` completely
- [ ] Understand existing codebase structure
- [ ] Category scores decision finalized

### Before Testing
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Database connection active
- [ ] Test partner credentials ready

---

## READY TO BEGIN?

**All items above should be checked ✅ before starting Phase 1 development.**

If any items are ❌, resolve them first before proceeding.

---

**Checklist Created**: October 24, 2025
**Last Updated**: October 24, 2025
**Status**: Ready for Review
