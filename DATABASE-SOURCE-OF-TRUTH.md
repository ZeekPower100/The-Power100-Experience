# 🔴 CRITICAL: DATABASE AS SOURCE OF TRUTH - MANDATORY READING

## ⚠️ THIS IS THE MOST IMPORTANT DOCUMENT IN THE CODEBASE

**VIOLATION OF THESE PRINCIPLES WILL CAUSE HOURS OF DEBUGGING AND DATA LOSS**

---

## 🎯 THE GOLDEN RULE

### **THE DATABASE IS THE SINGLE SOURCE OF TRUTH**

Before writing ANY code that:
- Receives data (forms, APIs, imports)
- Retrieves data (displays, exports, reports)
- Processes data (matching, analytics, transformations)

**YOU MUST FIRST CHECK THE DATABASE SCHEMA**

---

## 📋 MANDATORY WORKFLOW - ALWAYS FOLLOW THIS ORDER

### Step 1: CHECK THE DATABASE FIRST
```bash
# ALWAYS start here - check what columns actually exist
cd "C:\Users\broac\CascadeProjects\The-Power100-Experience"
./check_table_schema.bat [table_name]

# Or manually:
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d table_name"
```

### Step 2: BUILD BACKEND TO MATCH DATABASE
1. **Controller** - Must extract ONLY fields that exist in database
2. **Routes** - Must validate against database schema
3. **Middleware** - Must transform data to match database types

### Step 3: BUILD FRONTEND TO MATCH BACKEND
1. **Forms** - Field names must match database columns EXACTLY
2. **API calls** - Send data in the format backend expects
3. **Display components** - Parse data as stored in database

---

## 🚫 NEVER DO THIS (COMMON MISTAKES)

### ❌ WRONG: Building frontend first
```javascript
// DON'T: Create form fields without checking database
const [formData, setFormData] = useState({
  speakers: [],        // ❌ Database might have 'speaker_profiles'
  testimonials: [],    // ❌ Database might have 'past_attendee_testimonials'
  key_topics: []       // ❌ Database might have 'topics'
});
```

### ✅ RIGHT: Check database, then build
```bash
# FIRST: Check actual column names
./check_table_schema.bat events

# THEN: Build form to match
const [formData, setFormData] = useState({
  speaker_profiles: [],           // ✅ Matches database column
  past_attendee_testimonials: [],  // ✅ Matches database column
  agenda_highlights: []           // ✅ Matches database column
});
```

---

## 📊 CURRENT DATABASE SCHEMA (ALWAYS VERIFY)

### Events Table - Critical Array Fields
```sql
-- These are the ACTUAL column names in production
speaker_profiles TEXT              -- JSON array of speakers
agenda_highlights TEXT             -- JSON array of agenda items
past_attendee_testimonials TEXT   -- JSON array of testimonials
-- NOT: speakers, testimonials, highlights
```

### Books Table - Critical Array Fields
```sql
key_takeaways TEXT     -- JSON array of takeaways
testimonials TEXT      -- JSON array of testimonials
-- NOT: takeaways, reviews
```

### Podcasts Table - Critical Array Fields
```sql
topics TEXT            -- JSON array of topics
notable_guests TEXT    -- JSON array of guests
testimonials TEXT      -- JSON array of testimonials
-- NOT: key_topics, guests
```

---

## 🔄 DATA FLOW ARCHITECTURE

```
DATABASE (PostgreSQL)
    ↑ Column names are LAW
    |
BACKEND (Node.js/Express)
    ↑ Controllers extract ONLY database fields
    |
API LAYER
    ↑ Validates against database schema
    |
FRONTEND (Next.js)
    ↑ Forms send EXACT database field names
    |
USER INTERFACE
```

**NEVER SKIP A LAYER - ALWAYS BUILD FROM DATABASE UP**

---

## 🛠️ HELPER SCRIPTS TO PREVENT MISTAKES

### 1. Check Table Schema
```bash
# Create this file: check_table_schema.bat
@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Checking schema for table: %1
echo =====================================
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "\d %1"
```

### 2. Verify Field Exists
```bash
# Create this file: check_field_exists.bat
@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '%1' AND column_name = '%2';"
```

### 3. List All Array Fields
```bash
# Create this file: list_array_fields.bat
@echo off
set PGPASSWORD=TPXP0stgres!!
echo.
echo Array/JSON fields in all tables:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND data_type IN ('text', 'json', 'jsonb') AND column_name LIKE '%_%' ORDER BY table_name, column_name;"
```

---

## 📝 DEVELOPMENT CHECKLIST

Before implementing ANY data feature:

- [ ] 1. Run `check_table_schema.bat [table_name]`
- [ ] 2. Document exact column names in your ticket/PR
- [ ] 3. Update backend controller to match database
- [ ] 4. Update frontend forms to send correct field names
- [ ] 5. Test data saves correctly with verification script
- [ ] 6. Check admin forms display the data properly

---

## 🔍 VERIFICATION PROCESS

### After ANY data-related change:

```bash
# 1. Test data submission
node test_[entity]_submission.js

# 2. Verify in database
./verify_[entity]_data.bat

# 3. Check admin display
# Navigate to admin dashboard and edit the entity
```

---

## 💥 COMMON FIELD MISMATCHES (LEARN FROM HISTORY)

| Frontend (WRONG) | Database (CORRECT) | Table |
|-----------------|-------------------|--------|
| speakers | speaker_profiles | events |
| testimonials | past_attendee_testimonials | events |
| submitter_name | organizer_name | events |
| submitter_email | organizer_email | events |
| key_topics | topics | podcasts |

**THESE MISTAKES COST HOURS - DON'T REPEAT THEM**

---

## 🚨 EMERGENCY DEBUGGING

If data isn't saving/displaying:

1. **Check what frontend sends:**
   ```javascript
   console.log('Sending:', JSON.stringify(formData, null, 2));
   ```

2. **Check what backend receives:**
   ```javascript
   console.log('Received:', JSON.stringify(req.body, null, 2));
   ```

3. **Check database columns:**
   ```bash
   ./check_table_schema.bat [table_name]
   ```

4. **Compare all three - they MUST match**

---

## 📌 PERMANENT RULES

1. **Database schema changes require updating ALL layers**
2. **Never assume field names - ALWAYS verify**
3. **Test with actual database queries, not just API responses**
4. **Document any schema changes immediately**
5. **Run verification scripts after every change**

---

## 🔗 RELATED DOCUMENTATION

- `DATABASE-CONNECTION-PATTERN.md` - How to connect to database
- `docs/database-schema-evolution.md` - How to safely change schema
- `docs/field-addition-guide.md` - How to add new fields properly

---

**REMEMBER: The database doesn't care about your frontend preferences. The database column names are non-negotiable. Build everything to match the database, not the other way around.**

**Last Major Incident:** December 2024 - Array fields not saving due to frontend-backend-database misalignment. Hours wasted: 4+

**This document exists to prevent this from EVER happening again.**