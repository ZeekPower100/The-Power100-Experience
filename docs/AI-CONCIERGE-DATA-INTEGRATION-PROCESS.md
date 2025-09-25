# AI Concierge Data Integration Process

## Overview
This document explains how we make data accessible to the AI Concierge and ensure it can effectively retrieve and present information to users. The AI Concierge uses a multi-layered approach to automatically discover, process, and format data from our database.

## The Three-Layer Architecture

### Layer 1: Automatic Schema Discovery (`schemaDiscovery.js`)
The foundation of our AI Concierge's knowledge comes from automatic schema discovery that:
- **Scans all database tables** every 24 hours (5 minutes in dev mode)
- **Identifies AI-relevant fields** automatically based on naming patterns
- **Detects relationships** between tables through foreign keys
- **Flags sensitive data** to exclude from AI access

**Key Pattern**: Any field starting with `ai_` is automatically discovered and included.

### Layer 2: Knowledge Service (`aiKnowledgeService.js`)
This service orchestrates data retrieval and manages caching:
- **Fetches data dynamically** based on discovered schema
- **Maintains a 1-hour cache** for performance
- **Handles complex queries** with SQL JOINs for related data
- **Provides specialized methods** for specific data needs

### Layer 3: Dynamic Prompt Builder (`dynamicPromptBuilder.js`)
Formats raw data into AI-readable context:
- **Automatically processes AI fields** based on their types
- **Formats different data types** appropriately (summaries, arrays, scores)
- **Adds contextual information** (dates, locations, relationships)
- **Creates structured output** for OpenAI consumption

## Step-by-Step Process: Making Event Data AI-Accessible

### Example: Adding Event Speakers and Sponsors to AI Knowledge

#### Step 1: Database Tables Exist
```sql
-- Events table with basic info
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  date TIMESTAMP,
  ai_summary TEXT  -- AI field automatically discovered
);

-- Related tables for details
CREATE TABLE event_speakers (
  event_id INTEGER REFERENCES events(id),
  name VARCHAR(255),
  title VARCHAR(255)
);

CREATE TABLE event_sponsors (
  event_id INTEGER REFERENCES events(id),
  sponsor_name VARCHAR(255),
  sponsor_tier VARCHAR(50)
);
```

#### Step 2: Create Specialized Query Method
In `aiKnowledgeService.js`, we add a method that joins related data:

```javascript
async getEventsWithDetails() {
  const eventsQuery = `
    SELECT
      e.*,
      -- Join speakers as JSON array
      (SELECT json_agg(json_build_object(
        'name', es.name,
        'title', es.title
      ))
      FROM event_speakers es
      WHERE es.event_id = e.id
      ) as speakers,
      -- Join sponsors as JSON array
      (SELECT json_agg(json_build_object(
        'sponsor_name', esp.sponsor_name,
        'sponsor_tier', esp.sponsor_tier
      ))
      FROM event_sponsors esp
      WHERE esp.event_id = e.id
      ) as sponsor_details
    FROM events e
    WHERE e.is_active = true
  `;

  return await query(eventsQuery);
}
```

#### Step 3: Integrate into Knowledge Base
Add the specialized data to the comprehensive knowledge method:

```javascript
async getComprehensiveKnowledge() {
  // ... existing code ...

  // Add events with full details
  const eventsWithDetails = await this.getEventsWithDetails();
  if (eventsWithDetails.length > 0) {
    knowledge.eventsWithDetails = {
      data: eventsWithDetails,
      count: eventsWithDetails.length,
      hasAIFields: true,
      includedRelations: ['speakers', 'sponsors', 'attendees']
    };
  }

  return knowledge;
}
```

#### Step 4: Format for AI Consumption
In `dynamicPromptBuilder.js`, handle the new data structures:

```javascript
addImportantFields(item, entityName, context) {
  if (entityName === 'eventsWithDetails') {
    // Format speakers
    if (item.speakers && item.speakers.length > 0) {
      context += '\n   **Speakers:**';
      item.speakers.forEach(speaker => {
        context += `\n   • ${speaker.name} - ${speaker.title}`;
      });
    }

    // Format sponsors
    if (item.sponsor_details && item.sponsor_details.length > 0) {
      context += '\n   **Sponsors:**';
      item.sponsor_details.forEach(sponsor => {
        context += `\n   • ${sponsor.sponsor_name} (${sponsor.sponsor_tier})`;
      });
    }

    // Format attendees
    if (item.registered_attendees > 0) {
      context += `\n   Registered: ${item.registered_attendees} attendees`;
    }
  }
  return context;
}
```

#### Step 5: Clear Cache & Test
```bash
# Force schema refresh
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

# Or restart backend to clear all caches
node dev-manager.js restart backend

# Test with specific question
curl -X POST http://localhost:5000/api/ai-concierge/message \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{"message":"Tell me about speakers at Power100 Winter Summit"}'
```

## Key Patterns for Success

### 1. Use SQL JOINs for Related Data
Instead of querying each table separately, use SQL JOINs or subqueries to fetch related data in one query. This ensures the AI sees complete context.

### 2. Return JSON Aggregates for Arrays
PostgreSQL's `json_agg()` and `json_build_object()` functions are perfect for creating structured data:
```sql
(SELECT json_agg(json_build_object(
  'field1', table.field1,
  'field2', table.field2
))
FROM related_table
WHERE related_table.foreign_key = main_table.id)
```

### 3. Follow AI Field Naming Conventions
- `ai_summary` - Automatically recognized as summary text
- `ai_insights` - Treated as an array of insights
- `ai_tags` - Formatted as comma-separated tags
- `ai_confidence_score` - Displayed as numeric score

### 4. Add Contextual Metadata
Always include counts, dates, and status information:
- Total counts (registered vs checked-in)
- Temporal data (dates, times)
- Status indicators (active, pending, complete)

### 5. Cache Management Strategy
- **Development**: 5-minute cache for rapid testing
- **Production**: 24-hour cache for performance
- **Force Refresh**: `/api/ai-concierge/schema/refresh` endpoint
- **Full Reset**: Restart backend to clear all caches

## Testing Checklist

When adding new data to AI Concierge:

1. ✅ **Verify Database Schema**
   ```bash
   .\check_table_schema.bat your_table_name
   ```

2. ✅ **Add Query Method** (if needed for complex relationships)
   - Create specialized method in `aiKnowledgeService.js`
   - Use SQL JOINs for related data

3. ✅ **Update Prompt Builder** (if special formatting needed)
   - Add formatting logic to `dynamicPromptBuilder.js`
   - Handle arrays, objects, and special fields

4. ✅ **Clear Caches**
   ```bash
   # Option 1: Force schema refresh
   curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

   # Option 2: Restart backend
   node dev-manager.js restart backend
   ```

5. ✅ **Test with Specific Questions**
   - Ask about the specific data you added
   - Verify formatting and completeness
   - Check for any missing relationships

## Common Issues & Solutions

### Issue: AI Can't See New Table
**Solution**: Check if table has AI fields (`ai_*` prefix) or add to schema discovery

### Issue: Related Data Not Showing
**Solution**: Create JOIN query in `aiKnowledgeService.js` instead of relying on separate table queries

### Issue: Data Appears Stale
**Solution**: Clear cache by restarting backend or forcing schema refresh

### Issue: Formatting Issues in Response
**Solution**: Update `dynamicPromptBuilder.js` to handle the specific data structure

## Performance Considerations

1. **Limit Result Sets**: Use `LIMIT 50` for large tables
2. **Index Foreign Keys**: Ensure JOIN columns are indexed
3. **Cache Strategically**: Balance freshness vs performance
4. **Aggregate in Database**: Use PostgreSQL's JSON functions rather than processing in JavaScript

## Security Notes

- Sensitive fields are automatically excluded (passwords, tokens)
- Personal information requires explicit AI field marking
- Financial data excluded unless prefixed with `ai_`
- Admin-only data remains isolated from contractor queries

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data
2. **Personalized Context**: Contractor-specific data filtering
3. **Semantic Search**: Vector embeddings for better matching
4. **Multi-modal Support**: Image and document analysis
5. **Predictive Caching**: Pre-fetch likely queries