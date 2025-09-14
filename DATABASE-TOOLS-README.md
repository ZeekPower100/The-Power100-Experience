# Database Tools & Scripts

## 🚨 CRITICAL: Always Use These Tools Before Development

These tools ensure you ALWAYS build from the database schema up, preventing field mismatches.

## Available Tools

### 1. `check_table_schema.bat [table_name]`
**Purpose:** View complete schema for any table
```bash
./check_table_schema.bat events
```
Shows:
- All column names (exact spelling)
- Data types
- Nullable fields
- Default values

### 2. `check_field_exists.bat [table] [field]`
**Purpose:** Verify if a specific field exists
```bash
./check_field_exists.bat events speaker_profiles
```
Use this to quickly verify field names before using them.

### 3. `list_array_fields.bat`
**Purpose:** List all fields that store arrays/JSON
```bash
./list_array_fields.bat
```
Shows which fields need JSON.stringify() before saving.

### 4. `generate_field_mapping.bat [table]`
**Purpose:** Generate complete field mapping for development
```bash
./generate_field_mapping.bat events
```
Generates:
- Frontend form state template
- Backend controller field extraction
- List of fields needing JSON.stringify()

### 5. Connection & Data Verification Scripts
- `check_admin.bat` - Check admin users
- `verify_array_data.bat` - Verify array data storage
- `test_array_fields.bat` - Test array fields
- `check_all_columns.bat` - Check for missing columns
- `add_remaining_columns.bat` - Add missing columns

## Workflow Example

### Adding a New Feature with Data Fields:

```bash
# 1. First, check what exists in the database
./check_table_schema.bat events

# 2. Generate field mapping template
./generate_field_mapping.bat events

# 3. Copy the generated code to your files
# - Use the frontend state in your React component
# - Use the backend extraction in your controller

# 4. Verify specific fields if unsure
./check_field_exists.bat events organizer_name

# 5. After implementing, test data saves correctly
node test_event_submission.js
./verify_array_data.bat
```

## Common Mistakes These Tools Prevent

❌ **Without tools:**
```javascript
// Frontend sends wrong field name
const data = { speakers: [...] }  // Wrong!

// Backend expects different name
const { speaker_profiles } = req.body  // Mismatch!
```

✅ **With tools:**
```bash
# First check database
./check_table_schema.bat events
# See: speaker_profiles TEXT

# Generate correct mapping
./generate_field_mapping.bat events
# Copy exact field names
```

## Golden Rules

1. **Never guess field names** - Always verify
2. **Database schema is the source of truth** - Everything else adapts to it
3. **Use these tools BEFORE coding** - Not after problems arise
4. **Test data flow end-to-end** - Frontend → Backend → Database → Admin View

## Quick Reference

| Task | Tool to Use |
|------|------------|
| Starting new feature | `generate_field_mapping.bat [table]` |
| Checking if field exists | `check_field_exists.bat [table] [field]` |
| Viewing all columns | `check_table_schema.bat [table]` |
| Finding array fields | `list_array_fields.bat` |
| Testing data saves | `test_[entity]_submission.js` |
| Verifying in database | `verify_array_data.bat` |

## Remember

**The database doesn't adapt to your code. Your code adapts to the database.**

Use these tools religiously and you'll never have field mismatch issues again.