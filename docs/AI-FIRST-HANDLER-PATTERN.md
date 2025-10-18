# AI-First Event Handler Pattern
**Last Updated**: October 18, 2025
**Status**: Production Standard

## Overview
All event orchestration handlers must follow this AI-first pattern for natural language processing, comprehensive data capture, and conversational responses.

## Database Schema Reference

### event_pcr_scores (Tracking Table)
**Constraint**: `explicit_score` must be 1-5 (5-point scale)
```sql
- event_id (integer)
- contractor_id (integer)
- pcr_type (varchar) -- 'speaker', 'sponsor', 'peer_match', 'event'
- entity_id (integer)
- entity_name (varchar)
- explicit_score (integer) -- 1-5 scale REQUIRED
- sentiment_score (numeric) -- 0-1 scale
- final_pcr_score (numeric) -- 0-1 scale
- response_received (text)
- sentiment_analysis (jsonb)
- confidence_level (numeric)
- responded_at (timestamp)
```

### event_notes (Contextual Notes)
**Constraint**: `note_type` must be one of valid types
**Fallback**: Always use 'general' if invalid/null
```sql
- event_id (integer)
- contractor_id (integer)
- note_text (text)
- note_type (varchar) -- MUST be valid type, fallback to 'general'
- speaker_id (integer, nullable)
- sponsor_id (integer, nullable)
- session_context (varchar, nullable)
- ai_categorization (varchar)
- ai_tags (jsonb array)
- ai_priority_score (numeric 0-1)
- requires_followup (boolean)
- extracted_entities (jsonb)
- conversation_context (jsonb)
```

**Valid note_types**:
- `'general'` ← DEFAULT FALLBACK
- `'contact'`
- `'insight'`
- `'action_item'`
- `'speaker_note'`
- `'sponsor_note'`
- `'peer_connection'`

### Entity Tables (Aggregated Scores)
```sql
event_speakers.pcr_score (numeric, nullable)
event_sponsors.pcr_score (numeric, nullable)
event_peer_matches.pcr_score (numeric, nullable)
event_attendees.check_in_time (timestamp, nullable)
event_attendees.check_in_method (varchar, nullable)
```

## Standard AI-First Flow

### 1. AI Extraction Phase
```javascript
// Get event context
let eventContext = null;
if (smsData.eventContext?.id) {
  eventContext = await aiKnowledgeService.getCurrentEventContext(
    smsData.eventContext.id,
    smsData.contractor.id
  );
}

// AI extraction prompt
const extractionPrompt = `EXTRACT STRUCTURED DATA from this message:
"${smsData.messageText}"

Context: [specific context]

EXTRACT:
1. [Primary data point]
2. Key insights/notes
3. Sentiment - positive/neutral/negative
4. Entities - People mentioned, action items, follow-up needs

RESPOND ONLY WITH JSON:
{
  "[primary_field]": <value or null>,
  "confidence": <0-1>,
  "sentiment": "<positive|neutral|negative>",
  "key_insights": "<extracted notes or null>",
  "entities": {
    "people_mentioned": [],
    "action_items": [],
    "requires_followup": <boolean>
  },
  "extracted_context": "<natural summary>"
}`;

const aiExtraction = await aiConciergeController.generateAIResponse(
  extractionPrompt,
  smsData.contractor,
  smsData.contractor.id,
  eventContext
);

// Parse AI extraction (safely with fallback)
let extractedData;
try {
  const cleanJson = aiExtraction.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  extractedData = JSON.parse(cleanJson);
} catch (parseError) {
  console.error('[Handler] AI extraction parse error:', parseError);
  // Fallback to basic extraction
  extractedData = {
    [primary_field]: /* basic extraction */,
    confidence: 0.5,
    sentiment: 'positive',
    key_insights: smsData.messageText,
    entities: { people_mentioned: [], action_items: [], requires_followup: false },
    extracted_context: smsData.messageText
  };
}
```

### 2. Save to event_pcr_scores (UPSERT)
```javascript
if (extractedData[primary_field]) {
  // Convert to 1-5 scale if needed
  const explicitScore5Point = /* conversion logic */;

  // Calculate sentiment score
  const sentimentScore = extractedData.sentiment === 'positive' ? 1.0 :
                        extractedData.sentiment === 'negative' ? 0.0 : 0.5;

  // Calculate final PCR score
  const finalPcrScore = (normalizedValue * 0.7) + (sentimentScore * 0.3);

  // UPSERT to event_pcr_scores
  await query(`
    INSERT INTO event_pcr_scores (
      event_id, contractor_id, pcr_type, entity_id, entity_name,
      explicit_score, sentiment_score, final_pcr_score,
      response_received, sentiment_analysis, confidence_level,
      responded_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (event_id, contractor_id, pcr_type, entity_id)
    DO UPDATE SET
      explicit_score = EXCLUDED.explicit_score,
      sentiment_score = EXCLUDED.sentiment_score,
      final_pcr_score = EXCLUDED.final_pcr_score,
      response_received = EXCLUDED.response_received,
      sentiment_analysis = EXCLUDED.sentiment_analysis,
      confidence_level = EXCLUDED.confidence_level,
      responded_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `, [
    eventId, contractorId, pcrType, entityId, entityName,
    explicitScore5Point, sentimentScore, finalPcrScore,
    smsData.messageText,
    JSON.stringify({ /* sentiment analysis */ }),
    extractedData.confidence
  ]);
}
```

### 3. Update Entity PCR Score (Aggregated Average)
```javascript
// Update entity table with AVERAGE of all PCR scores
await query(`
  UPDATE [entity_table]
  SET pcr_score = (
    SELECT AVG(final_pcr_score)
    FROM event_pcr_scores
    WHERE pcr_type = $1 AND entity_id = $2
  ),
  updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
`, [pcrType, entityId]);
```

### 4. Save Contextual Notes to event_notes
```javascript
if (extractedData.key_insights || extractedData.entities.people_mentioned.length > 0) {
  await eventNoteService.captureEventNote({
    event_id: smsData.eventContext?.id,
    contractor_id: smsData.contractor.id,
    note_text: extractedData.key_insights || smsData.messageText,
    note_type: 'speaker_note', // or appropriate type with 'general' fallback
    speaker_id: speakerId, // or sponsor_id, etc.
    session_context: contextInfo,
    ai_categorization: extractedData.sentiment,
    ai_tags: [
      'feedback_type',
      ...extractedData.entities.people_mentioned,
      ...extractedData.entities.action_items
    ],
    ai_priority_score: extractedData.entities.requires_followup ? 0.8 : 0.5,
    requires_followup: extractedData.entities.requires_followup,
    extracted_entities: {
      entity_id: entityId,
      entity_name: entityName,
      ...extractedData.entities
    },
    conversation_context: {
      message_text: smsData.messageText,
      extracted_context: extractedData.extracted_context,
      ai_confidence: extractedData.confidence
    }
  });
}
```

### 5. Generate AI Response
```javascript
const responsePrompt = `I just [action taken]:
"${smsData.messageText}"

[Context details]

Generate a natural, conversational response that:
1. Acknowledges their [primary action]
2. References their specific comments naturally
3. Shows you understood the context
4. Is warm and appreciative
5. Fits in ~320 characters

Be genuine and conversational, not robotic.`;

const aiResponse = await aiConciergeController.generateAIResponse(
  responsePrompt,
  smsData.contractor,
  smsData.contractor.id,
  eventContext
);

const smsResult = processMessageForSMS(aiResponse, {
  allowMultiSMS: false,
  maxMessages: 1,
  context: { messageType: 'confirmation', entityId }
});
```

## Scale Conversion Reference

### 10-Point to 5-Point Conversion
```javascript
// For user-friendly 1-10 input, convert to database 1-5 requirement
const explicitScore5Point = Math.ceil(rating10Point / 2);

// Examples:
// 10/10 or 9/10 → 5
// 8/10 or 7/10 → 4
// 6/10 or 5/10 → 3
// 4/10 or 3/10 → 2
// 2/10 or 1/10 → 1
```

### PCR Score Calculation
```javascript
// Normalize explicit rating to 0-1 scale
const normalizedRating = explicitScore5Point / 5;

// Sentiment score: positive=1.0, neutral=0.5, negative=0.0
const sentimentScore = sentiment === 'positive' ? 1.0 :
                      sentiment === 'negative' ? 0.0 : 0.5;

// Final PCR score (70% explicit, 30% sentiment)
const finalPcrScore = (normalizedRating * 0.7) + (sentimentScore * 0.3);
```

## Error Handling

### Database Constraint Violations
1. **Invalid note_type**: Automatically falls back to 'general' (implemented in eventNoteService)
2. **Invalid explicit_score**: Must be 1-5, conversion required for 1-10 inputs
3. **Duplicate PCR scores**: Use UPSERT with ON CONFLICT clause

### AI Extraction Failures
Always provide fallback to basic extraction:
```javascript
catch (parseError) {
  // Fallback extraction using regex/basic parsing
  extractedData = {
    primary_field: /* basic extraction */,
    confidence: 0.5,
    sentiment: 'positive',
    key_insights: smsData.messageText,
    entities: { people_mentioned: [], action_items: [], requires_followup: false },
    extracted_context: smsData.messageText
  };
}
```

## Handler-Specific Implementations

### Speaker Feedback
- **PCR Type**: `'speaker'`
- **Note Type**: `'speaker_note'`
- **Entity ID**: `speaker_id`
- **Scale**: 1-10 input → 1-5 database
- **Reference**: `speakerHandlers.js` (lines 407-512)

### PCR Responses
- **PCR Type**: `'speaker'`, `'sponsor'`, `'peer_match'`, or `'event'` based on request type
- **Note Type**: Determined by PCR type
- **Entity ID**: From personalization_data
- **Scale**: 1-5 native
- **Reference**: `pcrHandlers.js` (to be updated)

### Attendance Confirmation
- **PCR Type**: N/A (updates check_in_time instead)
- **Note Type**: `'general'` or `'action_item'`
- **Entity ID**: N/A
- **Scale**: N/A
- **Reference**: `attendanceHandlers.js` (to be updated)

### Peer Match Responses
- **PCR Type**: `'peer_match'`
- **Note Type**: `'peer_connection'`
- **Entity ID**: `peer_match_id`
- **Scale**: 1-5 for final PCR, boolean for acceptance
- **Reference**: `peerMatchingHandlers.js` (to be updated)

## Testing Checklist

For each AI-first handler:
- [ ] AI extraction works with natural language
- [ ] Saved to event_pcr_scores with correct pcr_type
- [ ] Entity pcr_score updated with aggregated average
- [ ] Contextual notes saved to event_notes
- [ ] Conversational AI response generated
- [ ] Response sent successfully via SMS
- [ ] No database constraint violations
- [ ] Fallback extraction works if AI fails

## Benefits of This Pattern

1. **Natural Language**: Contractors can respond conversationally, not just with numbers
2. **Context Capture**: Important insights saved to event_notes for follow-up
3. **Audit Trail**: Complete history in event_pcr_scores
4. **Aggregated Scores**: Entity tables show overall performance
5. **Conversational UX**: AI responses feel personal, not robotic
6. **Sentiment Analysis**: Captures emotional context beyond just numbers
7. **Follow-up Flagging**: AI identifies when action is needed
8. **Searchable**: Tags and entities make notes discoverable
