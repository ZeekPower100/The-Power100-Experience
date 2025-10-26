# PHASE 2 - Partner Profile Management
## Database Field Reference (Verified: October 25, 2025)

**PURPOSE**: Enable partners to edit their own profile information with real database updates

---

## DATABASE TABLES USED (Phase 2 - Profile Management)

### 1. strategic_partners (Editable Profile Fields)
**Purpose**: Partner profile data that partners can self-manage

---

## EDITABLE FIELDS

### Basic Company Information
- `company_name` - varchar, NULL
  - **Required**: YES (cannot be null in practice)
  - **Max Length**: 255 characters
  - **Validation**: Must be unique, no special characters except spaces, hyphens, ampersands

- `company_description` - text, NULL
  - **Required**: Recommended
  - **Max Length**: Unlimited (recommend 500-1000 characters for UI)
  - **Validation**: Plain text or rich text editor

- `value_proposition` - text, NULL
  - **Required**: Recommended
  - **Max Length**: Unlimited (recommend 200-300 characters for UI)
  - **Validation**: Plain text, focus on unique selling points

### Contact Information
- `contact_email` - varchar, NULL
  - **Required**: YES (used for notifications and communication)
  - **Max Length**: 255 characters
  - **Validation**: Valid email format, must be verified

- `contact_phone` - varchar, NULL
  - **Required**: Recommended
  - **Max Length**: 20 characters
  - **Validation**: Phone number format (US or international)

- `website` - varchar, NULL
  - **Required**: Recommended
  - **Max Length**: 255 characters
  - **Validation**: Valid URL format (https://... or http://...)

### Branding
- `logo_url` - varchar, NULL
  - **Required**: Highly recommended
  - **Max Length**: 255 characters
  - **Validation**: Valid image URL or file upload path
  - **File Upload**: Accepts .png, .jpg, .jpeg, .svg (max 2MB)
  - **Recommended Dimensions**: 400x400px (square logo)

### Service Information (JSON/Array Fields)
- `services_offered` - ARRAY, NULL
  - **Type**: PostgreSQL ARRAY of text values
  - **Example**: `['Web Development', 'Mobile Apps', 'Cloud Services']`
  - **UI**: Multi-select dropdown or tags
  - **Max Items**: 10-15 services

- `focus_areas` - text, NULL (JSON array as text)
  - **Type**: JSON string array
  - **Example**: `["Digital Transformation", "Process Optimization"]`
  - **UI**: Multi-select from predefined list
  - **Max Items**: 5 focus areas

- `service_areas` - text, NULL (JSON array as text)
  - **Type**: JSON string array
  - **Example**: `["Technology", "Marketing", "Operations"]`
  - **UI**: Multi-select from predefined list

- `service_areas_other` - text, NULL
  - **Type**: Plain text
  - **Purpose**: Custom service areas not in predefined list

- `service_category` - text, NULL
  - **Type**: Single selection
  - **Options**: Technology, Marketing, Operations, Finance, HR, Legal, etc.
  - **UI**: Dropdown select

### Geographic Reach
- `geographic_regions` - text, NULL (JSON array as text)
  - **Type**: JSON string array
  - **Example**: `["North America", "Europe", "Remote/Virtual"]`
  - **UI**: Multi-select from predefined regions
  - **Options**: North America, South America, Europe, Asia, Africa, Australia, Remote/Virtual

### Credentials
- `compliance_certifications` - text, NULL
  - **Type**: Plain text or JSON array
  - **Example**: `"ISO 9001, SOC 2, PCI DSS"`
  - **UI**: Tags or comma-separated text field
  - **Max Length**: 500 characters

### Document Management
- `document_upload_id` - integer, NULL
  - **Purpose**: Link to document uploads table (if implemented)
  - **Note**: May need to create `partner_documents` table for multiple uploads
  - **Phase 2 Scope**: Simple file upload with URL storage

---

## READ-ONLY FIELDS (Cannot Be Edited by Partners)

### PowerConfidence Metrics (Admin-Controlled)
- `power_confidence_score` - integer, NULL
- `previous_powerconfidence_score` - integer, NULL
- `score_trend` - varchar, NULL
- `industry_rank` - integer, NULL
- `category_rank` - integer, NULL

### Performance Metrics (Auto-Calculated)
- `average_satisfaction` - numeric, NULL
- `total_feedback_responses` - integer, NULL
- `avg_contractor_satisfaction` - numeric, NULL
- `total_contractor_engagements` - integer, NULL
- `completed_bookings` - integer, NULL
- `total_bookings` - integer, NULL
- `total_matches` - integer, NULL

### Administrative Fields
- `is_active` - boolean, NULL (Admin controls activation status)
- `status` - varchar, NULL (Admin approval workflow)
- `created_at` - timestamp, NULL (System timestamp)
- `updated_at` - timestamp, NULL (Auto-updated on save)

---

## PHASE 2 API ENDPOINTS (To Build)

### Profile Management
- `GET /api/partner-portal/profile` - Get current partner profile data
  - Returns: All editable fields + read-only display fields

- `PUT /api/partner-portal/profile` - Update partner profile
  - Accepts: JSON body with editable fields only
  - Validation: Field-level validation + business rules
  - Returns: Updated profile data

- `GET /api/partner-portal/profile/preview` - Preview changes before saving
  - Returns: Profile data as it would appear after update

### File Upload
- `POST /api/partner-portal/profile/upload-logo` - Upload partner logo
  - Accepts: multipart/form-data with image file
  - Validation: File type, size, dimensions
  - Returns: Uploaded file URL

- `POST /api/partner-portal/profile/upload-document` - Upload certification documents
  - Accepts: multipart/form-data with PDF/image files
  - Returns: Document ID and URL

### Field Options
- `GET /api/partner-portal/options/focus-areas` - Get predefined focus area options
- `GET /api/partner-portal/options/service-areas` - Get predefined service area options
- `GET /api/partner-portal/options/geographic-regions` - Get geographic region options

---

## VALIDATION RULES

### Required Field Validation
```javascript
{
  company_name: 'required|min:3|max:255',
  contact_email: 'required|email|max:255',
  contact_phone: 'optional|phone',
  website: 'optional|url|max:255',
  company_description: 'optional|max:1000',
  value_proposition: 'optional|max:300'
}
```

### JSON Field Validation
```javascript
// focus_areas - Must be valid JSON array
const focusAreas = safeJsonParse(req.body.focus_areas);
if (!Array.isArray(focusAreas) || focusAreas.length > 5) {
  return res.status(400).json({ error: 'Invalid focus areas' });
}

// services_offered - PostgreSQL array
if (!Array.isArray(req.body.services_offered)) {
  return res.status(400).json({ error: 'Invalid services offered' });
}
```

### File Upload Validation
```javascript
// Logo upload
{
  allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
  maxSize: 2 * 1024 * 1024, // 2MB
  recommendedDimensions: { width: 400, height: 400 }
}

// Document upload
{
  allowedTypes: ['application/pdf', 'image/png', 'image/jpeg'],
  maxSize: 5 * 1024 * 1024, // 5MB
  maxDocuments: 10 per partner
}
```

---

## COMMON QUERY PATTERNS

### Get Partner Profile for Editing
```sql
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
  avg_contractor_satisfaction,

  -- Timestamps
  updated_at
FROM strategic_partners
WHERE id = $1 AND is_active = true;
```

### Update Partner Profile
```sql
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
RETURNING *;
```

### Upload Logo URL Update
```sql
UPDATE strategic_partners
SET
  logo_url = $2,
  updated_at = NOW()
WHERE id = $1 AND is_active = true
RETURNING logo_url;
```

---

## FIELD NAMING STANDARDS (Database is Source of Truth)

**Always use these EXACT field names:**
- ✅ `company_name` (NOT companyName, company)
- ✅ `company_description` (NOT description, about)
- ✅ `contact_email` (NOT email, partner_email)
- ✅ `contact_phone` (NOT phone, phone_number)
- ✅ `logo_url` (NOT logo, image_url)
- ✅ `services_offered` (ARRAY, NOT services, service_list)
- ✅ `focus_areas` (JSON text, NOT focus, areas)
- ✅ `geographic_regions` (JSON text, NOT regions, locations)

**Common Mistakes to Avoid:**
- ❌ Using camelCase (database uses snake_case)
- ❌ Assuming text fields are JSON (some are, some aren't - verify!)
- ❌ Forgetting to parse JSON fields before sending to database
- ❌ Not validating array lengths before insert

---

## JSON vs ARRAY FIELDS - CRITICAL DISTINCTION

### PostgreSQL ARRAY Fields (No Parsing Needed)
- `services_offered` - ARRAY type
  - **Backend**: Use directly as JavaScript array
  - **Database**: PostgreSQL handles serialization
  - **Example**: `['Web Dev', 'Mobile Apps']` → stored natively as ARRAY

### JSON String Fields (Parsing Required)
- `focus_areas` - TEXT field storing JSON
- `service_areas` - TEXT field storing JSON
- `geographic_regions` - TEXT field storing JSON
  - **Backend**: Must use `safeJsonParse()` to read, `safeJsonStringify()` to write
  - **Database**: Stored as plain text, not JSONB
  - **Example**: `'["Tech", "Marketing"]'` → string that looks like JSON

**CRITICAL**: Know which fields are ARRAY vs JSON text to avoid parsing errors!

---

## PHASE 2 IMPLEMENTATION CHECKLIST

### Before Writing Any Code
- [ ] Verify all editable fields exist in strategic_partners table ✅
- [ ] Confirm field data types (varchar, text, ARRAY, JSON) ✅
- [ ] Check if document_upload_id links to existing table
- [ ] Decide on file upload strategy (S3, local storage, URL only)
- [ ] Define predefined options lists (focus areas, service areas, regions)

### When Building Endpoints
- [ ] Always add `DATABASE-CHECKED: strategic_partners` comment
- [ ] Validate editable fields vs read-only fields
- [ ] Handle JSON fields with safeJsonParse/safeJsonStringify
- [ ] Return updated_at timestamp after updates
- [ ] Add proper error messages for validation failures

### When Building Frontend
- [ ] Create edit form with all editable fields
- [ ] Implement file upload for logos
- [ ] Add preview mode before saving
- [ ] Show validation errors inline
- [ ] Disable read-only fields (display only)
- [ ] Add unsaved changes warning

---

## SECURITY CONSIDERATIONS

### Authorization
- Partners can ONLY edit their own profile (check `req.partnerUser.partnerId`)
- Cannot modify PowerConfidence score or performance metrics
- Cannot change `is_active` or `status` fields
- Cannot see other partners' profiles

### Input Validation
- Sanitize all text inputs (XSS prevention)
- Validate email format before updating contact_email
- Validate URL format before updating website or logo_url
- Check file types and sizes on uploads
- Limit array field lengths (max 5 focus areas, 15 services, etc.)

### Data Integrity
- Use transactions for multi-field updates
- Validate unique constraints (e.g., company_name uniqueness if required)
- Log all profile changes for audit trail
- Keep backup of previous values before update

---

## NOTES

1. **Read-Write Separation**: Phase 2 introduces UPDATE operations (Phase 1 was read-only)
2. **File Uploads**: May need to integrate AWS S3 or similar for logo/document storage
3. **JSON Handling**: Critical to distinguish ARRAY fields from JSON text fields
4. **Preview Feature**: Consider implementing "draft changes" table for preview before save
5. **Validation**: Use express-validator or Joi for consistent validation across endpoints
6. **Audit Trail**: Consider logging profile changes to `partner_profile_history` table

---

**Document Created**: October 25, 2025
**Database Verified**: October 25, 2025
**Status**: Ready for Phase 2 Implementation
