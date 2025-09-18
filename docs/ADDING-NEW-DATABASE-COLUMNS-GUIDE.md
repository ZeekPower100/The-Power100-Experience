# Complete Guide: Adding New Database Columns to Forms

## 🎯 Overview
This guide documents the complete process for adding a new database column and integrating it into frontend forms. Based on our experience with the `client_count` field, this covers all touchpoints and common pitfalls.

## 📋 Quick Checklist
When adding a new field, you must update ALL of these locations:

### Database Layer (2 locations)
- [ ] Local database table
- [ ] Production database table

### Backend Layer (4-6 locations per entity)
- [ ] Controller - CREATE method (destructuring & INSERT)
- [ ] Controller - UPDATE method (allowedFields array)
- [ ] Public routes - validColumns array
- [ ] Routes validation (if applicable)
- [ ] Model mapping (if using models)
- [ ] API documentation

### Frontend Layer (4-6 locations per form)
- [ ] Form state initialization
- [ ] Form field UI component
- [ ] API data object (submission)
- [ ] Form data loading (for edit mode)
- [ ] Type definitions
- [ ] Validation logic

## 🔄 Step-by-Step Process

### Step 1: Database Schema Update

#### 1.1 Add Column to Local Database
```bash
# Use the quick-db.bat helper
powershell -Command ".\quick-db.bat \"ALTER TABLE your_table ADD COLUMN IF NOT EXISTS field_name VARCHAR(50);\""

# Verify it was added
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'your_table' AND column_name = 'field_name';\""
```

#### 1.2 Add Column to Production Database
```bash
# Use MCP tool for production
mcp__aws-production__exec command="PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c \"ALTER TABLE your_table ADD COLUMN IF NOT EXISTS field_name VARCHAR(50);\""

# Verify in production
mcp__aws-production__exec command="PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'your_table' AND column_name = 'field_name';\""
```

### Step 2: Backend Controller Updates

#### 2.1 Update CREATE Method
Location: `tpe-backend/src/controllers/[entity]Controller.js`

**A. Add to destructuring:**
```javascript
const {
  // ... existing fields
  field_name,  // ADD THIS
  // ... more fields
} = req.body;
```

**B. Add to INSERT statement:**
```javascript
INSERT INTO table_name (
  // ... existing columns
  field_name,  // ADD THIS
  // ... more columns
) VALUES ($1, $2, ..., $N)  // INCREMENT $N count!
```

**C. Add to VALUES array:**
```javascript
const result = await query(`INSERT...`, [
  // ... existing values
  field_name,  // ADD THIS (must match position in INSERT)
  // ... more values
]);
```

#### 2.2 Update UPDATE Method
Location: Same controller file

**Add to allowedFields array:**
```javascript
const allowedFields = [
  // ... existing fields
  'field_name',  // ADD THIS
  // ... more fields
];
```

### Step 3: Public Routes Configuration

Location: `tpe-backend/src/routes/public[Entity]Routes.js`

**Add to validColumns array:**
```javascript
const validColumns = [
  // ... existing columns
  'field_name',  // ADD THIS
  // ... more columns
];
```

### Step 4: Frontend Form Updates

#### 4.1 Add to Form State
Location: `tpe-front-end/src/components/[entity]/[Entity]Form.tsx`

```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  field_name: '',  // ADD THIS with default value
  // ... more fields
});
```

#### 4.2 Add Form Field UI
```tsx
<div>
  <Label htmlFor="field_name">Field Label</Label>
  <Input
    id="field_name"
    type="text"
    value={formData.field_name}
    onChange={(e) => handleInputChange('field_name', e.target.value)}
    placeholder="Enter value"
    className="mt-1"
  />
</div>
```

#### 4.3 Add to API Submission Data
```typescript
const apiData = {
  // ... existing fields
  field_name: formData.field_name,  // ADD THIS
  // ... more fields
};
```

#### 4.4 Add to Form Data Loading (CRITICAL!)
**This is often missed and causes "field not persisting" issues**

```typescript
if (existingEntity) {
  setFormData(prev => ({
    ...prev,
    // ... existing fields
    field_name: existingEntity.field_name || '',  // ADD THIS
    // ... more fields
  }));
}
```

### Step 5: Type Definitions
Location: `tpe-front-end/src/lib/types/[entity].ts`

```typescript
export interface Entity {
  // ... existing fields
  field_name?: string;  // ADD THIS
  // ... more fields
}
```

## 🗺️ Complete Field Mapping for Partners Entity

Here's the complete mapping for the Partners entity as a reference:

### Database Tables
- `partners` - Legacy table (rarely used)
- `strategic_partners` - Main table for partner data

### Backend Files
1. **Controller**: `tpe-backend/src/controllers/partnerController.js`
   - `createPartner()` - Lines 107-211
   - `updatePartner()` - Lines 214-342

2. **Public Routes**: `tpe-backend/src/routes/publicPartnerRoutes.js`
   - `validColumns` array - Lines 131-147
   - Field mapping object - Lines 50-86

3. **Protected Routes**: `tpe-backend/src/routes/partnerRoutes.js`
   - Validation middleware references

### Frontend Files
1. **Onboarding Form**: `tpe-front-end/src/components/partner/PartnerOnboardingForm.tsx`
   - Form state - Lines 120-200
   - API data object - Lines 394-480
   - Form fields - Lines 690-700

2. **Admin Form**: `tpe-front-end/src/components/admin/PartnerForm.tsx`
   - Form state - Lines 131-220
   - Form initialization - Lines 348-450
   - API data object - Lines 636-700
   - Form fields - Lines 800-815

3. **API Service**: `tpe-front-end/src/lib/api.ts`
   - Partner API methods

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Field Saves but Doesn't Display
**Cause**: Missing from form initialization when loading existing data
**Solution**: Add field to the form's data loading logic (Step 4.4)

### Pitfall 2: Field Not Saving to Database
**Common Causes**:
- Not in controller's destructuring
- Not in INSERT statement
- Not in VALUES array
- Not in validColumns (for public routes)
- Parameter count mismatch in SQL

### Pitfall 3: Field Shows in One Form but Not Another
**Cause**: Forms may use different field names or mappings
**Solution**: Check field mapping in publicPartnerRoutes.js

### Pitfall 4: Updates Don't Work but Creates Do
**Cause**: Missing from allowedFields in UPDATE method
**Solution**: Add to allowedFields array in controller

### Pitfall 5: Frontend Has Value but Backend Doesn't Receive It
**Cause**: Not included in apiData object
**Solution**: Add field to apiData construction

## 🔍 Troubleshooting Commands

### Check Database Schema
```bash
# Local
powershell -Command ".\check_table_schema.bat table_name"

# Production
mcp__aws-production__exec command="PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c \"\\d table_name\""
```

### Check Recent Data
```bash
# See if field is being saved
powershell -Command ".\quick-db.bat \"SELECT id, field_name, created_at FROM table_name ORDER BY created_at DESC LIMIT 5;\""
```

### Test Manual Update
```bash
# Verify field works at database level
powershell -Command ".\quick-db.bat \"UPDATE table_name SET field_name = 'test_value' WHERE id = 1 RETURNING id, field_name;\""
```

## 📝 Server Restart Requirements

After backend changes, ALWAYS restart servers:
```bash
# Stop all servers
node dev-manager.js stop all

# Start all servers
node dev-manager.js start all
```

## 🎯 Entity-Specific Mapping Reference

### Partners/Strategic Partners
- **Tables**: `partners`, `strategic_partners`
- **Controller**: `partnerController.js`
- **Routes**: `partnerRoutes.js`, `publicPartnerRoutes.js`
- **Forms**: `PartnerOnboardingForm.tsx`, `PartnerForm.tsx`

### Contractors
- **Table**: `contractors`
- **Controller**: `contractorController.js`
- **Routes**: `contractorRoutes.js`
- **Forms**: `ContractorFlow.tsx`

### Books
- **Table**: `books`
- **Controller**: `bookController.js`
- **Routes**: `bookRoutes.js`
- **Forms**: `BookOnboardingForm.tsx`, `BookForm.tsx`

### Podcasts
- **Table**: `podcasts`
- **Controller**: `podcastController.js`
- **Routes**: `podcastRoutes.js`
- **Forms**: `PodcastOnboardingForm.tsx`, `PodcastForm.tsx`

### Events
- **Table**: `events`
- **Controller**: `eventController.js`
- **Routes**: `eventRoutes.js`
- **Forms**: `EventOnboardingForm.tsx`, `EventForm.tsx`

## 💡 Pro Tips

1. **Use Field Validators**: Run `database-field-validator.js` after adding fields
2. **Test Both Paths**: Test both CREATE (new record) and UPDATE (existing record)
3. **Check JSON Fields**: Array/object fields need `safeJsonStringify()` in backend
4. **Verify Both Environments**: Always update both local AND production databases
5. **Document Field Purpose**: Add comments explaining what the field is for
6. **Consider Field Type**: Choose appropriate database type (VARCHAR, TEXT, INTEGER, etc.)
7. **Default Values**: Set sensible defaults in database and frontend
8. **Validation**: Add both frontend and backend validation as needed

## 🔄 Quick Reference: Add Field to Partners

```bash
# 1. Database
powershell -Command ".\quick-db.bat \"ALTER TABLE strategic_partners ADD COLUMN new_field VARCHAR(50);\""
mcp__aws-production__exec command="PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c \"ALTER TABLE strategic_partners ADD COLUMN new_field VARCHAR(50);\""

# 2. Backend
# Edit: partnerController.js
# - Add to destructuring (line ~129)
# - Add to INSERT (line ~171)
# - Add to VALUES (line ~193)
# - Add to allowedFields (line ~230)

# Edit: publicPartnerRoutes.js
# - Add to validColumns (line ~134)

# 3. Frontend
# Edit: PartnerOnboardingForm.tsx
# - Add to state (line ~150)
# - Add to apiData (line ~418)
# - Add UI field (line ~690)

# Edit: PartnerForm.tsx
# - Add to state (line ~136)
# - Add to initialization (line ~357)
# - Add to apiData (line ~672)
# - Add UI field (line ~810)

# 4. Restart
node dev-manager.js stop all && node dev-manager.js start all

# 5. Test
# Create new partner with field
# Edit existing partner field
# Verify in database
```

## 📚 Related Documentation
- `DATABASE-SOURCE-OF-TRUTH.md` - Database as source of truth principles
- `STORAGE-AND-JSON-GUIDELINES.md` - Handling JSON fields
- `SERVER_TROUBLESHOOTING.md` - Server connectivity issues
- `database-field-validator.js` - Field alignment validation tool

---
*Last Updated: Based on client_count field implementation*
*Tested With: Partners/Strategic Partners entity*