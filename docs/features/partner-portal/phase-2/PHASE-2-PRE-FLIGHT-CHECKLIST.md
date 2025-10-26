# PHASE 2 - Partner Profile Management
## Pre-Flight Checklist

**Purpose**: Verify all prerequisites before starting Phase 2 development
**Date**: October 25, 2025

---

## PHASE 1 COMPLETION VERIFICATION

### Phase 1 Status
- [ ] Phase 1 COMPLETE (Dashboard with real data integration)
- [ ] All Phase 1 endpoints working
- [ ] Demo login functional (demo@techflow.com / Demo123!)
- [ ] Partner dashboard displays real PowerConfidence score

**Verification Command:**
```bash
# Test Phase 1 dashboard endpoint
curl -X POST http://localhost:5000/api/partner-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@techflow.com","password":"Demo123!"}'
# Copy token, then:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/partner-portal/dashboard
```

---

## DATABASE VERIFICATION

### Editable Profile Fields Existence
- [ ] `company_name` field exists in strategic_partners
- [ ] `company_description` field exists
- [ ] `value_proposition` field exists
- [ ] `contact_email` field exists
- [ ] `contact_phone` field exists
- [ ] `website` field exists
- [ ] `logo_url` field exists
- [ ] `services_offered` field exists (ARRAY type)
- [ ] `focus_areas` field exists (TEXT/JSON)
- [ ] `service_areas` field exists (TEXT/JSON)
- [ ] `service_category` field exists
- [ ] `geographic_regions` field exists (TEXT/JSON)
- [ ] `compliance_certifications` field exists

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('company_name', 'company_description', 'value_proposition', 'contact_email', 'contact_phone', 'website', 'logo_url', 'services_offered', 'focus_areas', 'service_areas', 'service_category', 'geographic_regions', 'compliance_certifications') ORDER BY column_name;\""
```

### Field Data Type Verification
- [ ] `services_offered` is ARRAY type (NOT text)
- [ ] `focus_areas` is text type (stores JSON string)
- [ ] `service_areas` is text type (stores JSON string)
- [ ] `geographic_regions` is text type (stores JSON string)

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('services_offered', 'focus_areas', 'service_areas', 'geographic_regions') ORDER BY column_name;\""
```

**Expected Results:**
```
     column_name      | data_type | udt_name
----------------------+-----------+----------
 focus_areas          | text      | text
 geographic_regions   | text      | text
 service_areas        | text      | text
 services_offered     | ARRAY     | _text
```

### Read-Only Fields Verification
- [ ] `power_confidence_score` exists (should NOT be editable)
- [ ] `is_active` exists (should NOT be editable by partners)
- [ ] `status` exists (should NOT be editable by partners)
- [ ] `updated_at` exists (auto-updated timestamp)

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('power_confidence_score', 'is_active', 'status', 'updated_at') ORDER BY column_name;\""
```

---

## FILE UPLOAD PREREQUISITES

### Storage Strategy Decision
- [ ] **Decision made**: File upload strategy chosen
  - Option A: Local file storage (faster development, not scalable)
  - Option B: AWS S3 (production-ready, requires setup)
  - Option C: URL-only (partners provide external URLs, no upload)

**Recommended**: Option A for Phase 2 MVP, migrate to S3 in Phase 3

### Local Storage Setup (if Option A chosen)
- [ ] Create `uploads/partner-logos/` directory in tpe-backend
- [ ] Configure multer for local file storage
- [ ] Add `.gitignore` entry for uploads folder
- [ ] Configure static file serving in Express

**Setup Commands:**
```bash
# Create upload directories
mkdir -p tpe-backend/uploads/partner-logos
mkdir -p tpe-backend/uploads/partner-documents

# Add to .gitignore
echo "uploads/" >> tpe-backend/.gitignore
```

### AWS S3 Setup (if Option B chosen)
- [ ] AWS S3 bucket created
- [ ] AWS credentials configured in .env
- [ ] `aws-sdk` or `@aws-sdk/client-s3` package installed
- [ ] IAM permissions configured (upload, read, delete)
- [ ] Bucket CORS policy configured

**Environment Variables:**
```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=tpe-partner-uploads
```

### File Upload Validation Requirements
- [ ] Define allowed file types for logos (PNG, JPG, SVG)
- [ ] Define max file size for logos (2MB recommended)
- [ ] Define allowed file types for documents (PDF, PNG, JPG)
- [ ] Define max file size for documents (5MB recommended)

---

## DEPENDENCIES & PACKAGES

### Backend Dependencies
- [ ] `multer` package installed for file uploads
- [ ] `express-validator` package installed for validation
- [ ] `sharp` package installed (optional, for image processing)

**Installation Command:**
```bash
cd tpe-backend
npm install multer express-validator
# Optional: npm install sharp
```

### Check Existing Packages
```bash
cd tpe-backend && npm list multer express-validator
```

---

## FIELD OPTIONS FINALIZATION

### Focus Areas Options
- [ ] Finalized list of focus areas for dropdown
- [ ] Confirmed with stakeholders

**Proposed List:**
- Growth Acceleration
- Cash Flow Management
- Team Development
- Process Optimization
- Digital Transformation
- Market Expansion
- Strategic Planning
- Leadership Development

### Service Areas Options
- [ ] Finalized list of service areas for dropdown

**Proposed List:**
- Technology
- Marketing
- Operations
- Finance
- Human Resources
- Sales
- Customer Service
- Legal

### Geographic Regions Options
- [ ] Finalized list of geographic regions

**Proposed List:**
- North America
- South America
- Europe
- Asia
- Africa
- Australia
- Remote/Virtual

### Service Categories Options
- [ ] Finalized list of service categories

**Proposed List:**
- Technology Solutions
- Business Consulting
- Marketing & Growth
- Financial Services
- Operational Excellence
- Human Capital
- Legal & Compliance

---

## VALIDATION RULES FINALIZATION

### Required Fields Decision
- [ ] **Decision made**: Which fields are required vs optional?

**Proposed Required Fields:**
- `company_name` (required)
- `contact_email` (required)

**Proposed Optional Fields:**
- All other fields optional

### Field Length Limits
- [ ] `company_name`: 3-255 characters
- [ ] `company_description`: 0-1000 characters
- [ ] `value_proposition`: 0-300 characters
- [ ] `contact_phone`: Valid phone format
- [ ] `website`: Valid URL format
- [ ] `services_offered`: Max 15 items
- [ ] `focus_areas`: Max 5 items
- [ ] `geographic_regions`: Max 10 items

---

## EXISTING CODE VERIFICATION

### Backend Files
- [ ] `tpe-backend/src/routes/partnerPortalRoutes.js` exists
- [ ] `tpe-backend/src/controllers/partnerPortalController.js` exists
- [ ] `tpe-backend/src/middleware/partnerAuth.js` exists (JWT protection working)
- [ ] `tpe-backend/src/config/database.js` database connection working

**Verification Commands:**
```bash
# Check if files exist
ls tpe-backend/src/routes/partnerPortalRoutes.js
ls tpe-backend/src/controllers/partnerPortalController.js
ls tpe-backend/src/middleware/partnerAuth.js
```

### Frontend Files
- [ ] `tpe-front-end/src/app/partner/dashboard/page.tsx` exists (Phase 1)
- [ ] `tpe-front-end/src/utils/jsonHelpers.ts` exists (safeJsonParse, safeJsonStringify)
- [ ] Partner authentication working

**Verification Commands:**
```bash
# Check if files exist
ls tpe-front-end/src/app/partner/dashboard/page.tsx
ls tpe-front-end/src/utils/jsonHelpers.ts
```

---

## DEVELOPMENT ENVIRONMENT

### Backend Server
- [ ] Backend server starts without errors
- [ ] Port 5000 is available
- [ ] Database connection working

**Verification Command:**
```bash
node dev-manager.js status
```

### Frontend Server
- [ ] Frontend server starts without errors
- [ ] Port 3002 is available
- [ ] Can navigate to partner dashboard

**Verification:**
Navigate to http://localhost:3002/partner/dashboard

### Database Connection
- [ ] PostgreSQL database accessible
- [ ] quick-db.bat script working
- [ ] Can query strategic_partners table

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM strategic_partners;\""
```

---

## DECISION CHECKPOINTS

### File Upload Strategy
- [ ] **Decision made**: How to handle file uploads?
  - Option A: Local storage (faster MVP)
  - Option B: AWS S3 (production-ready)
  - Option C: URL-only (no uploads)

**Recommended**: Option A for Phase 2 MVP

### Document Management
- [ ] **Decision made**: Do we need a separate documents table?
  - Option A: Store document URLs in `document_upload_id` field
  - Option B: Create `partner_documents` table with multiple uploads
  - Option C: Phase 3 feature (defer for now)

**Recommended**: Option C (defer to Phase 3)

### Validation Strategy
- [ ] **Decision made**: Where to validate data?
  - Frontend only (fast feedback, not secure)
  - Backend only (secure, slower feedback)
  - Both frontend and backend (recommended)

**Recommended**: Both frontend and backend validation

### Preview Feature
- [ ] **Decision made**: Implement preview before save?
  - Option A: Full preview modal (more work, better UX)
  - Option B: Simple confirmation dialog (faster MVP)
  - Option C: No preview (fastest, defer to Phase 3)

**Recommended**: Option B for Phase 2 MVP

---

## TEST DATA

### Demo Partner Data Check
- [ ] Demo partner (ID 94) has profile data
- [ ] company_name is set
- [ ] contact_email is set
- [ ] Some fields have NULL values (for testing optional fields)

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT id, company_name, contact_email, website, logo_url, focus_areas FROM strategic_partners WHERE id = 94;\""
```

### Create Additional Test Data (Optional)
- [ ] Add sample services_offered array
- [ ] Add sample focus_areas JSON
- [ ] Add sample geographic_regions JSON

**Sample Data Commands:**
```bash
# Add test data to demo partner
powershell -Command ".\quick-db.bat \"UPDATE strategic_partners SET services_offered = '{Web Development, Mobile Apps, Cloud Services}', focus_areas = '[\"Growth Acceleration\", \"Digital Transformation\"]', geographic_regions = '[\"North America\", \"Remote/Virtual\"]' WHERE id = 94;\""
```

---

## SECURITY CONSIDERATIONS

### Authorization Checks
- [ ] Partners can ONLY edit their own profile (verify partnerId from JWT)
- [ ] Partners CANNOT edit PowerConfidence score
- [ ] Partners CANNOT edit is_active or status fields
- [ ] Partners CANNOT see other partners' profiles

### Input Sanitization
- [ ] XSS prevention for text inputs
- [ ] SQL injection prevention (using parameterized queries)
- [ ] File upload validation (type, size)
- [ ] URL validation for website field

---

## DOCUMENTATION

### Phase 2 Documents Created
- [ ] `PHASE-2-FIELD-REFERENCE.md` exists and reviewed
- [ ] `PHASE-2-IMPLEMENTATION-PLAN.md` exists and reviewed
- [ ] `PHASE-2-PRE-FLIGHT-CHECKLIST.md` (this document)

**Verification Commands:**
```bash
ls docs/features/partner-portal/phase-2/PHASE-2-FIELD-REFERENCE.md
ls docs/features/partner-portal/phase-2/PHASE-2-IMPLEMENTATION-PLAN.md
ls docs/features/partner-portal/phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md
```

### Reference Documents
- [ ] Read `DATABASE-SOURCE-OF-TRUTH.md`
- [ ] Read `STORAGE-AND-JSON-GUIDELINES.md`
- [ ] Read `PHASE-1-COMPLETE.md` for context

---

## FINAL CHECKLIST

### Before Starting Development
- [ ] All database fields verified ✅
- [ ] File upload strategy decided ✅
- [ ] Field options finalized ✅
- [ ] Validation rules defined ✅
- [ ] Dependencies installed ✅
- [ ] Test data created ✅
- [ ] Phase 1 complete and working ✅

### Before Writing Code
- [ ] Read `PHASE-2-FIELD-REFERENCE.md` completely
- [ ] Read `PHASE-2-IMPLEMENTATION-PLAN.md` completely
- [ ] Understand ARRAY vs JSON text fields
- [ ] Know which fields are editable vs read-only
- [ ] File upload strategy confirmed

### Before Testing
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Database connection active
- [ ] Demo partner credentials ready
- [ ] Test files prepared (logo images, documents)

---

## READY TO BEGIN?

**All items above should be checked ✅ before starting Phase 2 development.**

If any items are ❌, resolve them first before proceeding.

---

**Checklist Created**: October 25, 2025
**Last Updated**: October 25, 2025
**Status**: Ready for Review
