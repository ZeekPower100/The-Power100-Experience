# 🧪 AI Concierge Testing Guide

## 🚨 CRITICAL: Testing Features for AI Concierge Development

### Overview
The AI Concierge now uses a **dynamic, auto-discovering knowledge base** that automatically detects and includes all database changes. This guide documents essential testing features to ensure smooth development and testing.

---

## 🔄 Schema Auto-Discovery Features

### Cache Settings
- **Development**: 5-minute cache (auto-refreshes frequently)
- **Production**: 24-hour cache (for performance)

### Force Refresh Commands

#### 1. Force Schema Refresh (Immediate Update)
```bash
# Force immediate schema discovery refresh
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
```
**Use this when:**
- You add new database columns
- You modify table structures
- You add AI-processed fields
- Testing needs immediate updates

#### 2. View Current Schema Summary
```bash
# See what tables/columns AI Concierge can access
curl http://localhost:5000/api/ai-concierge/schema/summary | jq
```
**Shows:**
- Total tables discovered
- Entity tables with row counts
- AI-processed columns found
- Sensitive fields excluded
- Table relationships

#### 3. View AI-Relevant Schema Only
```bash
# See only the tables/fields AI actually uses
curl http://localhost:5000/api/ai-concierge/schema/ai-relevant | jq
```
**Filters to:**
- High-relevance tables only
- Non-sensitive fields
- AI-processed fields included

---

## 📊 What Gets Auto-Discovered

### Automatically Included
- ✅ All new database columns
- ✅ New tables added to database
- ✅ AI-processed fields:
  - `key_differentiators`
  - `ai_summary`
  - `ai_insights`
  - `ai_confidence_score`
  - `ai_processing_status`
  - Any column with "ai_" prefix

### Automatically Excluded
- ❌ Sensitive fields (unless AI-processed):
  - Passwords
  - Tokens
  - Secret keys
  - SSNs
  - Credit cards

### Entity Tables Tracked
- `contractors`
- `strategic_partners`
- `books`
- `podcasts`
- `events`
- `demo_bookings`
- `videos`
- `webinars`

---

## 🧪 Testing Workflow

### When Adding New Database Fields

1. **Add your field to the database**
   ```sql
   ALTER TABLE strategic_partners ADD COLUMN new_ai_insight TEXT;
   ```

2. **Force refresh the schema**
   ```bash
   curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
   ```

3. **Verify field was discovered**
   ```bash
   curl http://localhost:5000/api/ai-concierge/schema/summary | grep "new_ai_insight"
   ```

4. **Test AI Concierge access**
   - Send a message to AI Concierge
   - It will automatically have access to the new field!

### When Testing AI Processing

1. **Process data (e.g., partner differentiators)**
   ```bash
   # Trigger partner AI processing via n8n or API
   ```

2. **Force refresh to get latest data**
   ```bash
   curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
   ```

3. **AI Concierge now has immediate access**
   - No restart needed
   - No code changes needed
   - Data available instantly

---

## 🛠️ Development Tips

### Quick Commands for Testing

```bash
# Refresh and check in one command
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh && \
curl http://localhost:5000/api/ai-concierge/schema/summary | jq '.summary.aiProcessedColumns | length'

# See all AI fields available
curl http://localhost:5000/api/ai-concierge/schema/summary | jq '.summary.aiProcessedColumns'

# Check specific table discovery
curl http://localhost:5000/api/ai-concierge/schema/ai-relevant | jq '.schema.strategic_partners.aiFields'
```

### Testing AI Knowledge Base

```bash
# Test that knowledge base is loading
curl http://localhost:5000/api/ai-concierge/test-knowledge | jq
```

### Monitor Cache Status

The cache automatically refreshes every 5 minutes in development, but you can check when it last refreshed:

```bash
curl http://localhost:5000/api/ai-concierge/schema/summary | jq '.summary.discoveredAt'
```

---

## 🔍 Debugging

### If AI Concierge Can't See New Fields

1. **Force refresh first**
   ```bash
   curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
   ```

2. **Check if field was discovered**
   ```bash
   curl http://localhost:5000/api/ai-concierge/schema/summary | jq '.summary.totalColumns'
   ```

3. **Verify field isn't marked as sensitive**
   - Fields with 'password', 'token', 'secret' in name are auto-excluded
   - Unless they're AI-processed fields

4. **Check the logs**
   ```bash
   # Backend logs will show schema discovery process
   tail -f tpe-backend/server.log | grep SchemaDiscovery
   ```

### If Changes Don't Appear

1. **Database connection**: Ensure you're connected to the right database
2. **Cache timing**: Wait 5 minutes or force refresh
3. **Field naming**: Check if field name triggers sensitive filter
4. **Table relevance**: Ensure table has >20 AI relevance score

---

## 📝 Important Notes

### Development vs Production

| Feature | Development | Production |
|---------|------------|------------|
| Cache Duration | 5 minutes | 24 hours |
| Auto-Refresh | Frequent | Daily |
| Force Refresh | Always available | Admin only |
| Performance | Optimized for testing | Optimized for speed |

### What This Means for Testing

1. **No more manual updates** when adding database fields
2. **Instant testing** with force refresh
3. **AI sees everything** (except sensitive data)
4. **Partner differentiators** automatically included
5. **Cross-entity insights** always current

---

## 🚀 Quick Reference

```bash
# The ONE command you need most:
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

# Run this after:
- Adding database columns
- Processing AI data
- Updating partner differentiators
- Any schema changes
```

---

## 🔗 Related Documentation

- `AI-FIRST-STRATEGY.md` - Overall AI strategy
- `DATABASE-SOURCE-OF-TRUTH.md` - Database patterns
- `N8N-WORKFLOW-DOCUMENTATION.md` - AI processing triggers

---

*Last Updated: December 2024*
*Critical for: AI Concierge Testing & Development*