# AI Field Naming Conventions for Automatic AI Concierge Integration

## 🚨 CRITICAL: Follow These Naming Patterns for Automatic AI Concierge Access

This document outlines the **MANDATORY** naming conventions for database fields that need to be automatically available to the AI Concierge. Following these patterns ensures your AI-processed data is automatically discovered, retrieved, formatted, and used by the AI Concierge without any manual code changes.

## ✅ Automatic Integration Requirements

For a field to be **automatically** available to the AI Concierge:

1. **Field Name**: Must follow the naming patterns below
2. **Data Type**: Use appropriate PostgreSQL types (TEXT for summaries, JSONB for arrays)
3. **Table Discovery**: Table must have `status` or `is_active` fields for filtering
4. **No Additional Code**: Following these conventions means NO manual updates needed!

## 📋 Required Naming Patterns

### 1. AI-Processed Fields (Automatically Detected)

| Field Pattern | Database Type | Description | Example Values |
|--------------|---------------|-------------|----------------|
| `ai_summary` | TEXT | Long-form AI-generated summaries | "This book provides insights into..." |
| `ai_insights` | JSONB | Array of AI-extracted insights | ["Insight 1", "Insight 2", ...] |
| `ai_tags` | JSONB | Array of AI-generated tags | ["leadership", "growth", ...] |
| `ai_confidence_score` | NUMERIC | AI confidence in analysis (0-100) | 85.5 |
| `ai_quality_score` | NUMERIC | Quality score of AI processing | 92.0 |
| `ai_[anything]` | Appropriate | Any field starting with `ai_` | Varies |

### 2. Special Case Fields (Partners)

| Field Name | Database Type | Description |
|-----------|---------------|-------------|
| `key_differentiators` | JSONB | Partner differentiators (legacy) |
| `ai_generated_differentiators` | JSONB | AI-created differentiators |

### 3. Standard Entity Fields (Automatically Handled)

| Entity Type | Title Field | Author/Owner Field | Focus Areas Field |
|------------|-------------|-------------------|-------------------|
| books | `title` | `author` | `focus_areas_covered` |
| podcasts | `title` | `host` | `focus_areas_covered` |
| events | `name` | - | `focus_areas_covered` |
| strategic_partners | `company_name` | - | `focus_areas_served` |

## 🎯 How It Works

### Automatic Processing Pipeline:

1. **Schema Discovery** (Every 5 minutes in dev, 24 hours in production)
   - Discovers all tables with relevant fields
   - Identifies AI fields by naming pattern

2. **AI Knowledge Service**
   - Retrieves data from discovered tables
   - Includes all `ai_*` prefixed fields

3. **Dynamic Prompt Builder** (`dynamicPromptBuilder.js`)
   - Automatically formats based on field names:
     - `ai_summary` → Shows first 200 characters
     - `ai_insights` → Bullet point list
     - `ai_tags` → Comma-separated list
     - `ai_*_score` → Numeric display

4. **AI Concierge Response**
   - Uses formatted data in responses
   - Cites specific AI insights when asked

## 💡 Examples

### ✅ GOOD - Will Auto-Integrate:
```sql
-- These fields will automatically be available to AI Concierge
ALTER TABLE videos ADD COLUMN ai_summary TEXT;
ALTER TABLE videos ADD COLUMN ai_insights JSONB DEFAULT '[]';
ALTER TABLE videos ADD COLUMN ai_tags JSONB DEFAULT '[]';
ALTER TABLE videos ADD COLUMN ai_relevance_score NUMERIC;
```

### ❌ BAD - Requires Manual Integration:
```sql
-- These won't be automatically detected
ALTER TABLE videos ADD COLUMN summary TEXT;  -- Missing 'ai_' prefix
ALTER TABLE videos ADD COLUMN insights JSONB;  -- Missing 'ai_' prefix
ALTER TABLE videos ADD COLUMN ml_analysis TEXT;  -- Doesn't match pattern
```

## 📝 Adding New AI Fields Checklist

When adding a new AI field to ANY table:

- [ ] **Name starts with `ai_`** (e.g., `ai_summary`, `ai_insights`)
- [ ] **Use JSONB for arrays** (insights, tags, differentiators)
- [ ] **Use TEXT for summaries** (long-form content)
- [ ] **Use NUMERIC for scores** (confidence, quality, relevance)
- [ ] **Add to a table with status filtering** (`status` or `is_active` field)
- [ ] **Wait 5 minutes in dev** for auto-discovery (or force refresh)
- [ ] **Test in AI Concierge** to verify automatic availability

## 🔧 Manual Override (If Needed)

If you MUST use a different naming pattern, update:
1. `dynamicPromptBuilder.js` - Add to `detectAIFields()` method
2. Add specific handling in the field type detection

But this defeats the purpose of automation!

## 🚀 Quick Test

After adding a new AI field:

```bash
# 1. Force schema refresh
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

# 2. Check if field was discovered
curl http://localhost:5000/api/ai-concierge/schema/summary | grep "your_field_name"

# 3. Test with AI Concierge
curl -X POST http://localhost:5000/api/ai-concierge/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What AI insights do you have about [entity]?"}'
```

## 📚 Related Documentation

- `docs/AI-FIRST-STRATEGY.md` - Overall AI strategy
- `tpe-backend/src/services/dynamicPromptBuilder.js` - Auto-formatting logic
- `tpe-backend/src/services/aiKnowledgeService.js` - Data retrieval
- `tpe-backend/src/services/schemaDiscoveryService.js` - Table discovery

## ⚠️ Important Notes

1. **Case Sensitive**: Field names are case-sensitive in PostgreSQL
2. **JSONB vs JSON**: Always use JSONB for better performance
3. **Arrays**: Always initialize JSONB arrays with `DEFAULT '[]'`
4. **Migration**: When renaming fields, follow the pattern for auto-integration

## 🎯 Golden Rule

> **If it starts with `ai_`, it's automatically in the AI Concierge!**

---

*Last Updated: September 20, 2025*
*Document Location: `/docs/AI-FIELD-NAMING-CONVENTIONS.md`*