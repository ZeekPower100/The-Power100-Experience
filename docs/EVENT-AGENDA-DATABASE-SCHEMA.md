# Event Agenda Database Schema Reference

## 🎯 Purpose
This document provides exact database column names for the event agenda tables to ensure perfect alignment between database, backend controllers, and frontend forms. **ALWAYS use these exact names to avoid mismatch errors.**

---

## 📋 Table: `event_agenda_items`

**Purpose**: Stores all event schedule items (sessions, breaks, networking, etc.)

### Column Names (Use EXACTLY as shown):

| Column Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `id` | INTEGER | Yes (Auto) | Primary key | 1, 2, 3 |
| `event_id` | INTEGER | Yes | References events.id | 35 |
| `start_time` | TIMESTAMP | **Yes** | When item starts | '2025-10-01 09:00:00' |
| `end_time` | TIMESTAMP | No | When item ends | '2025-10-01 10:00:00' |
| `item_type` | VARCHAR(50) | **Yes** | Type of agenda item | 'session', 'break', 'networking', 'lunch', 'keynote', 'panel', 'registration', 'closing' |
| `title` | VARCHAR(255) | **Yes** | Name of the item | 'Sales Mastery Workshop' |
| `synopsis` | TEXT | No | Full description/abstract | 'Learn proven techniques...' |
| `key_takeaways` | JSONB | No | Array of learning points | ["Learn X", "Master Y"] |
| `speaker_id` | INTEGER | No | References event_speakers.id | 5 |
| `sponsor_id` | INTEGER | No | References event_sponsors.id | 2 |
| `description` | TEXT | No | Brief logistics notes | 'Bring laptop for hands-on' |
| `location` | VARCHAR(100) | No | Where it happens | 'Main Stage', 'Room A' |
| `track` | VARCHAR(50) | No | For parallel sessions | 'Track A', 'Track B' |
| `capacity` | INTEGER | No | Max attendees | 100 |
| `focus_areas` | JSONB | No | Topics covered | ["Sales", "Marketing"] |
| `target_audience` | JSONB | No | Who should attend | ["beginners", "advanced"] |
| `skill_level` | VARCHAR(50) | No | Required expertise | 'beginner', 'intermediate', 'advanced' |
| `is_mandatory` | BOOLEAN | No | Required attendance | true, false |
| `requires_registration` | BOOLEAN | No | Pre-registration needed | true, false |
| `status` | VARCHAR(50) | No | Current status | 'scheduled', 'confirmed', 'tentative', 'cancelled' |
| `speaker_confirmed` | BOOLEAN | No | Speaker confirmed | true, false |
| `ai_summary` | TEXT | No | AI-generated summary | 'This session covers...' |
| `ai_keywords` | JSONB | No | AI-extracted topics | ["leadership", "growth"] |
| `created_at` | TIMESTAMP | Yes (Auto) | When created | Auto-generated |
| `updated_at` | TIMESTAMP | Yes (Auto) | Last updated | Auto-generated |

---

## 📋 Table: `event_session_speakers`

**Purpose**: Links multiple speakers to a single agenda item (for panels, co-speakers)

### Column Names (Use EXACTLY as shown):

| Column Name | Data Type | Required | Description | Example Values |
|------------|-----------|----------|-------------|----------------|
| `id` | INTEGER | Yes (Auto) | Primary key | 1, 2, 3 |
| `agenda_item_id` | INTEGER | Yes | References event_agenda_items.id | 10 |
| `speaker_id` | INTEGER | Yes | References event_speakers.id | 5 |
| `role` | VARCHAR(50) | No | Speaker's role | 'main', 'co-speaker', 'moderator', 'panelist' |
| `speaking_order` | INTEGER | No | Order of appearance | 1, 2, 3 |
| `created_at` | TIMESTAMP | Yes (Auto) | When created | Auto-generated |

---

## 💻 Backend Usage Examples

### Creating an agenda item (Node.js):
```javascript
const result = await query(`
  INSERT INTO event_agenda_items (
    event_id,
    start_time,
    end_time,
    item_type,
    title,
    synopsis,
    speaker_id,
    location,
    focus_areas
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *
`, [
  event_id,          // NOT eventId
  start_time,        // NOT startTime
  end_time,          // NOT endTime
  item_type,         // NOT itemType or type
  title,
  synopsis,
  speaker_id,        // NOT speakerId
  location,
  JSON.stringify(focus_areas)  // Array needs stringification
]);
```

### Fetching agenda with speakers:
```javascript
const agenda = await query(`
  SELECT
    ai.*,
    es.name as speaker_name,
    es.title as speaker_title
  FROM event_agenda_items ai
  LEFT JOIN event_speakers es ON ai.speaker_id = es.id
  WHERE ai.event_id = $1
  ORDER BY ai.start_time
`, [event_id]);
```

---

## ⚛️ Frontend Form Field Names

### Form input names should match exactly:
```jsx
<Input name="start_time" />     // NOT startTime
<Input name="item_type" />      // NOT itemType
<Input name="speaker_id" />     // NOT speakerId
<Input name="focus_areas" />    // NOT focusAreas
```

### State variable naming:
```javascript
const [agenda_item, setAgendaItem] = useState({
  start_time: '',      // Match DB
  end_time: '',        // Match DB
  item_type: '',       // Match DB
  title: '',
  synopsis: '',
  speaker_id: null,    // Match DB
  focus_areas: []      // Match DB
});
```

---

## 🎯 AI Orchestrator Usage

The AI uses these fields to schedule messages:

1. **`start_time`** - Calculates when to send alerts (15 min before)
2. **`item_type`** - Determines message type:
   - `'session'/'keynote'` → Speaker alerts
   - `'break'` → Good time for sponsor messages
   - `'networking'` → Peer introduction time
   - `'lunch'` → Avoid non-urgent messages
3. **`synopsis`** - Matches content to contractor interests
4. **`focus_areas`** - Aligns with contractor focus areas

---

## ⚠️ Common Mistakes to Avoid

❌ **WRONG**:
```javascript
eventId, startTime, itemType, speakerId, focusAreas
```

✅ **CORRECT**:
```javascript
event_id, start_time, item_type, speaker_id, focus_areas
```

❌ **WRONG** (camelCase):
```javascript
const agendaItem = {
  eventId: 35,
  startTime: '09:00'
}
```

✅ **CORRECT** (snake_case):
```javascript
const agenda_item = {
  event_id: 35,
  start_time: '09:00'
}
```

---

## 📝 Notes

- All timestamps should be in ISO format: `'2025-10-01T09:00:00'`
- JSONB fields need `JSON.stringify()` when inserting from JavaScript
- Use `safeJsonParse()` when reading JSONB fields
- The `speaker_id` can be NULL if speaker is TBD
- Multiple speakers use the `event_session_speakers` bridge table
- Status defaults to `'scheduled'` if not specified

---

*Always refer to this document when building forms, controllers, or API endpoints for event agenda functionality.*