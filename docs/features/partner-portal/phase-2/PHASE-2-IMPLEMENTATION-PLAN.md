# PHASE 2 - Partner Profile Management
## Implementation Plan

**Timeline**: Week 3-4 (12-16 hours)
**Priority**: High
**Status**: Ready to Begin

---

## OBJECTIVE

Enable partners to edit and manage their own profile information, upload logos and documents, and preview changes before saving - all without admin intervention.

---

## PRE-FLIGHT CHECKLIST

See `PHASE-2-PRE-FLIGHT-CHECKLIST.md` for complete verification steps.

**Critical Prerequisites:**
- ✅ Phase 1 Complete (Dashboard with real data integration)
- ✅ Database schema verified (see PHASE-2-FIELD-REFERENCE.md)
- ✅ Editable vs read-only fields identified
- ⚠️ **Decision needed**: File upload strategy (AWS S3, local storage, or URL only?)
- ⚠️ **Decision needed**: Document management table needed?

---

## IMPLEMENTATION TASKS

### TASK 1: Backend Profile API Endpoints (6-8 hours)

#### 1.1 Create getPartnerProfile() Function
**File**: `tpe-backend/src/controllers/partnerPortalController.js`
**Purpose**: Fetch complete partner profile for editing

**Sub-tasks:**
- [ ] Add function to get all editable fields from `strategic_partners`
- [ ] Include read-only fields for display (PowerConfidence score, metrics)
- [ ] Parse JSON fields (`focus_areas`, `service_areas`, `geographic_regions`)
- [ ] Return services_offered as array (PostgreSQL ARRAY type)
- [ ] Add `DATABASE-CHECKED: strategic_partners` header

**Query Pattern:**
```javascript
async function getPartnerProfile(req, res) {
  // DATABASE-CHECKED: strategic_partners

  const partnerId = req.partnerUser.partnerId;

  try {
    const profileQuery = `
      SELECT
        id,
        company_name,
        company_description,
        value_proposition,
        contact_email,
        contact_phone,
        website,
        logo_url,
        services_offered,
        focus_areas,
        service_areas,
        service_areas_other,
        service_category,
        geographic_regions,
        compliance_certifications,

        -- Read-only display fields
        power_confidence_score,
        score_trend,
        industry_rank,
        average_satisfaction,
        total_contractor_engagements,

        updated_at
      FROM strategic_partners
      WHERE id = $1 AND is_active = true
    `;

    const result = await query(profileQuery, [partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner profile not found'
      });
    }

    const profile = result.rows[0];

    // Parse JSON text fields
    profile.focus_areas = safeJsonParse(profile.focus_areas) || [];
    profile.service_areas = safeJsonParse(profile.service_areas) || [];
    profile.geographic_regions = safeJsonParse(profile.geographic_regions) || [];

    // services_offered is already an array (PostgreSQL ARRAY type)

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
}
```

#### 1.2 Create updatePartnerProfile() Function
**Purpose**: Update partner profile with validation

**Sub-tasks:**
- [ ] Add express-validator validation rules
- [ ] Validate required fields (company_name, contact_email)
- [ ] Validate optional fields (website URL, phone format)
- [ ] Stringify JSON fields before database update
- [ ] Handle services_offered array correctly (PostgreSQL ARRAY)
- [ ] Update `updated_at` timestamp automatically
- [ ] Return updated profile data
- [ ] Add proper error handling for validation failures

**Validation Pattern:**
```javascript
const validateProfileUpdate = [
  body('company_name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Company name must be 3-255 characters'),

  body('contact_email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be valid email')
    .normalizeEmail(),

  body('contact_phone')
    .optional({ checkFalsy: true })
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),

  body('website')
    .optional({ checkFalsy: true })
    .isURL().withMessage('Must be valid URL'),

  body('services_offered')
    .optional()
    .isArray().withMessage('Services must be array')
    .custom((arr) => arr.length <= 15).withMessage('Maximum 15 services allowed'),

  body('focus_areas')
    .optional()
    .custom((val) => {
      const arr = Array.isArray(val) ? val : safeJsonParse(val);
      return Array.isArray(arr) && arr.length <= 5;
    }).withMessage('Maximum 5 focus areas allowed')
];
```

**Update Query Pattern:**
```javascript
async function updatePartnerProfile(req, res) {
  // DATABASE-CHECKED: strategic_partners

  const partnerId = req.partnerUser.partnerId;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    company_name,
    company_description,
    value_proposition,
    contact_email,
    contact_phone,
    website,
    logo_url,
    services_offered,
    focus_areas,
    service_areas,
    service_category,
    geographic_regions,
    compliance_certifications
  } = req.body;

  try {
    const updateQuery = `
      UPDATE strategic_partners
      SET
        company_name = $2,
        company_description = $3,
        value_proposition = $4,
        contact_email = $5,
        contact_phone = $6,
        website = $7,
        logo_url = $8,
        services_offered = $9,
        focus_areas = $10,
        service_areas = $11,
        service_category = $12,
        geographic_regions = $13,
        compliance_certifications = $14,
        updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await query(updateQuery, [
      partnerId,
      company_name,
      company_description || null,
      value_proposition || null,
      contact_email,
      contact_phone || null,
      website || null,
      logo_url || null,
      services_offered || [],  // PostgreSQL ARRAY
      safeJsonStringify(focus_areas || []),  // JSON text field
      safeJsonStringify(service_areas || []),  // JSON text field
      service_category || null,
      safeJsonStringify(geographic_regions || []),  // JSON text field
      compliance_certifications || null
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found or update failed'
      });
    }

    const updatedProfile = result.rows[0];

    // Parse JSON fields for response
    updatedProfile.focus_areas = safeJsonParse(updatedProfile.focus_areas) || [];
    updatedProfile.service_areas = safeJsonParse(updatedProfile.service_areas) || [];
    updatedProfile.geographic_regions = safeJsonParse(updatedProfile.geographic_regions) || [];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('[Partner Portal] Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
}
```

#### 1.3 Create File Upload Endpoints
**Purpose**: Handle logo and document uploads

**Sub-tasks:**
- [ ] Install `multer` for file upload handling (`npm install multer`)
- [ ] Configure multer storage (local or S3)
- [ ] Add file validation (type, size, dimensions for logos)
- [ ] Create `uploadLogo()` function
- [ ] Create `uploadDocument()` function (optional)
- [ ] Update logo_url in database after successful upload

**File Upload Pattern:**
```javascript
const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/partner-logos/');  // Or use S3
  },
  filename: (req, file, cb) => {
    const partnerId = req.partnerUser.partnerId;
    const ext = path.extname(file.originalname);
    cb(null, `partner-${partnerId}-logo-${Date.now()}${ext}`);
  }
});

const uploadLogoMiddleware = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024  // 2MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and SVG allowed.'));
    }
  }
});

async function uploadLogo(req, res) {
  // DATABASE-CHECKED: strategic_partners

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const partnerId = req.partnerUser.partnerId;
    const logoUrl = `/uploads/partner-logos/${req.file.filename}`;  // Or S3 URL

    // Update logo_url in database
    const updateQuery = `
      UPDATE strategic_partners
      SET logo_url = $2, updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING logo_url
    `;

    const result = await query(updateQuery, [partnerId, logoUrl]);

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logo_url: result.rows[0].logo_url
    });

  } catch (error) {
    console.error('[Partner Portal] Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    });
  }
}
```

#### 1.4 Create Field Options Endpoints
**Purpose**: Provide predefined options for dropdowns

**Sub-tasks:**
- [ ] Create `getFieldOptions()` function
- [ ] Define focus areas list
- [ ] Define service areas list
- [ ] Define geographic regions list
- [ ] Return as JSON for frontend dropdowns

**Options Pattern:**
```javascript
function getFieldOptions(req, res) {
  const options = {
    focus_areas: [
      'Growth Acceleration',
      'Cash Flow Management',
      'Team Development',
      'Process Optimization',
      'Digital Transformation',
      'Market Expansion',
      'Strategic Planning',
      'Leadership Development'
    ],
    service_areas: [
      'Technology',
      'Marketing',
      'Operations',
      'Finance',
      'Human Resources',
      'Sales',
      'Customer Service',
      'Legal'
    ],
    service_categories: [
      'Technology Solutions',
      'Business Consulting',
      'Marketing & Growth',
      'Financial Services',
      'Operational Excellence',
      'Human Capital',
      'Legal & Compliance'
    ],
    geographic_regions: [
      'North America',
      'South America',
      'Europe',
      'Asia',
      'Africa',
      'Australia',
      'Remote/Virtual'
    ]
  };

  res.json({
    success: true,
    options
  });
}
```

#### 1.5 Update partnerPortalRoutes.js
**File**: `tpe-backend/src/routes/partnerPortalRoutes.js`

**Sub-tasks:**
- [ ] Add route: `GET /api/partner-portal/profile`
- [ ] Add route: `PUT /api/partner-portal/profile`
- [ ] Add route: `POST /api/partner-portal/profile/upload-logo` (with multer middleware)
- [ ] Add route: `GET /api/partner-portal/options`
- [ ] Ensure all routes use `protectPartner` middleware

**Routes to Add:**
```javascript
const { uploadLogoMiddleware } = require('../middleware/fileUpload');

// Profile management
router.get('/profile', asyncHandler(getPartnerProfile));
router.put('/profile', validateProfileUpdate, asyncHandler(updatePartnerProfile));

// File upload
router.post('/profile/upload-logo', uploadLogoMiddleware.single('logo'), asyncHandler(uploadLogo));

// Field options
router.get('/options', asyncHandler(getFieldOptions));
```

---

### TASK 2: Frontend Profile Edit Form (6-8 hours)

#### 2.1 Create Profile Edit Page
**File**: `tpe-front-end/src/app/partner/profile/page.tsx`
**Purpose**: Full-page profile edit interface

**Sub-tasks:**
- [ ] Create new page at `/partner/profile`
- [ ] Fetch current profile data on mount
- [ ] Create edit form with all editable fields
- [ ] Add validation for required fields
- [ ] Implement multi-select for arrays (focus areas, services, regions)
- [ ] Add file upload component for logo
- [ ] Show read-only fields (PowerConfidence score) for context
- [ ] Add "Save Changes" and "Cancel" buttons
- [ ] Show success/error messages
- [ ] Add unsaved changes warning

**Form Structure:**
```tsx
interface ProfileFormData {
  company_name: string;
  company_description: string;
  value_proposition: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  logo_url: string;
  services_offered: string[];
  focus_areas: string[];
  service_areas: string[];
  service_category: string;
  geographic_regions: string[];
  compliance_certifications: string;
}

export default function PartnerProfilePage() {
  const [profile, setProfile] = useState<ProfileFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchFieldOptions();
  }, []);

  const fetchProfile = async () => {
    // Fetch from /api/partner-portal/profile
  };

  const fetchFieldOptions = async () => {
    // Fetch from /api/partner-portal/options
  };

  const handleSave = async () => {
    // PUT to /api/partner-portal/profile
  };

  const handleLogoUpload = async (file: File) => {
    // POST to /api/partner-portal/profile/upload-logo
  };

  return (
    // Form UI
  );
}
```

#### 2.2 Create Profile Edit Form Component
**File**: `tpe-front-end/src/components/partner/ProfileEditForm.tsx`
**Purpose**: Reusable form component

**Sub-tasks:**
- [ ] Create form with sections (Company Info, Contact, Services, Geographic Reach)
- [ ] Implement controlled inputs for text fields
- [ ] Create multi-select component for arrays
- [ ] Add file upload dropzone for logo
- [ ] Validate fields on blur
- [ ] Show inline validation errors
- [ ] Add character counters for text fields
- [ ] Implement unsaved changes detection

#### 2.3 Create Logo Upload Component
**File**: `tpe-front-end/src/components/partner/LogoUpload.tsx`
**Purpose**: Drag-and-drop logo upload

**Sub-tasks:**
- [ ] Create dropzone for logo upload
- [ ] Show current logo preview
- [ ] Validate file type and size client-side
- [ ] Show upload progress
- [ ] Handle upload errors
- [ ] Update logo_url after successful upload

#### 2.4 Add Profile Link to Dashboard
**File**: `tpe-front-end/src/app/partner/dashboard/page.tsx`

**Sub-tasks:**
- [ ] Add "Edit Profile" button in dashboard header
- [ ] Link to `/partner/profile`

---

### TASK 3: Preview & Validation (2-3 hours)

#### 3.1 Add Preview Mode
**Purpose**: Let partners preview changes before saving

**Sub-tasks:**
- [ ] Add "Preview Changes" button
- [ ] Show modal/side-by-side comparison
- [ ] Display current values vs new values
- [ ] Highlight changed fields
- [ ] Confirm save from preview

#### 3.2 Client-Side Validation
**Purpose**: Validate before API call

**Sub-tasks:**
- [ ] Validate required fields
- [ ] Validate email format
- [ ] Validate URL format
- [ ] Validate phone format
- [ ] Check array field lengths
- [ ] Show validation errors inline

---

### TASK 4: Testing & Documentation (1-2 hours)

#### 4.1 Backend API Testing
**Sub-tasks:**
- [ ] Test GET /api/partner-portal/profile
- [ ] Test PUT /api/partner-portal/profile with valid data
- [ ] Test PUT with invalid data (validation errors)
- [ ] Test logo upload endpoint
- [ ] Test field options endpoint
- [ ] Verify JSON field parsing (focus_areas, service_areas)
- [ ] Verify ARRAY field handling (services_offered)

**Test Commands:**
```bash
# Get profile
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/partner-portal/profile

# Update profile
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Updated Name","contact_email":"new@email.com"}' \
  http://localhost:5000/api/partner-portal/profile

# Upload logo
curl -X POST -H "Authorization: Bearer TOKEN" \
  -F "logo=@/path/to/logo.png" \
  http://localhost:5000/api/partner-portal/profile/upload-logo
```

#### 4.2 Frontend Integration Testing
**Sub-tasks:**
- [ ] Login to partner portal
- [ ] Navigate to Edit Profile page
- [ ] Verify all fields load correctly
- [ ] Update various fields and save
- [ ] Upload logo and verify display
- [ ] Test validation errors
- [ ] Test unsaved changes warning
- [ ] Verify updates persist after page refresh

#### 4.3 Edge Case Testing
**Sub-tasks:**
- [ ] Profile with NULL values in optional fields
- [ ] Empty arrays for services/focus areas
- [ ] Invalid JSON in database (should not crash)
- [ ] File upload errors (wrong type, too large)
- [ ] Network errors during save
- [ ] Token expiration during edit

---

## DELIVERABLES

### Backend
- ✅ Profile retrieval endpoint (GET /profile)
- ✅ Profile update endpoint (PUT /profile)
- ✅ Logo upload endpoint (POST /profile/upload-logo)
- ✅ Field options endpoint (GET /options)
- ✅ Input validation with express-validator
- ✅ File upload with multer
- ✅ JSON field handling

### Frontend
- ✅ Profile edit page (/partner/profile)
- ✅ Profile edit form component
- ✅ Logo upload component
- ✅ Multi-select components for arrays
- ✅ Client-side validation
- ✅ Preview changes feature
- ✅ Unsaved changes warning

### Documentation
- ✅ PHASE-2-COMPLETE.md - Completion summary
- ✅ API endpoint documentation
- ✅ Test results and validation

---

## DEPENDENCIES

### Required for Phase 2
- [x] Phase 1 Complete (Dashboard with real data)
- [x] PostgreSQL database with strategic_partners table
- [x] JWT authentication working
- [ ] File upload storage (local or S3)
- [ ] multer package installed

### Blockers
- [ ] **Decision**: File upload strategy (local vs S3)?
- [ ] **Decision**: Document management table needed?
- [ ] **Data**: Predefined options lists finalized?

---

## SUCCESS CRITERIA

### Must Have
- [ ] Partners can edit their profile information
- [ ] Changes save to database successfully
- [ ] Logo upload works
- [ ] Validation prevents invalid data
- [ ] Profile updates reflect immediately
- [ ] No errors with JSON/ARRAY field handling

### Nice to Have
- [ ] Preview changes before saving
- [ ] Document upload functionality
- [ ] Profile completion percentage
- [ ] Change history/audit log

### Phase 2 Complete When:
- [ ] All "Must Have" criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed and merged
- [ ] Deployed to staging environment

---

## RISKS & MITIGATION

### Risk 1: File Upload Complexity
**Impact**: High (logo upload is critical feature)
**Mitigation**: Start with simple local storage, migrate to S3 in Phase 3 if needed

### Risk 2: JSON vs ARRAY Field Confusion
**Impact**: Medium (could cause data corruption)
**Mitigation**: Clear documentation in PHASE-2-FIELD-REFERENCE.md, use helper functions

### Risk 3: Validation Logic Duplication
**Impact**: Low (maintenance overhead)
**Mitigation**: Share validation rules between frontend and backend

---

## NEXT STEPS AFTER PHASE 2

Once Phase 2 is complete, move to:
- **Phase 3**: Lead Management (contractor pipeline tracking)
- **Advanced Features**: Change history, profile completion score, admin approval workflow

---

**Document Created**: October 25, 2025
**Status**: Ready to Begin
**Estimated Completion**: 2 weeks (12-16 hours)
