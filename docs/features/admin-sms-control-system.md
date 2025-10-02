# 📱 Admin SMS Control System

**Complete architecture for CEO/Admin event control via SMS and web interface**

*Created: October 2, 2025*
*Status: Phase 1 Planning*
*Implementation Approach: Hybrid (Nested + Standalone)*

---

## 📋 Overview

The Admin SMS Control System enables CEOs and authorized admins to control event orchestration via SMS text messages from their phone, in addition to web-based controls. This provides real-time event management capabilities during live events when admins are mobile.

**Core Capabilities:**
- Delay all pending messages for an event (CEO Override)
- Send custom messages to all attendees or specific groups
- Check event status (attendees, message queue, timing)
- Manual check-ins via SMS
- Cancel/modify scheduled messages

---

## 🏗️ Architecture: Hybrid Approach

### Why Hybrid?

1. **Nested UI** (Current): Best for detailed event management, natural workflow
2. **Standalone UI** (New): Best for quick controls across multiple events
3. **SMS Interface** (New): Best for mobile admins during live events

All three interfaces use the **same unified backend API**, ensuring consistency.

```
┌─────────────────────────────────────────────┐
│  Frontend Interfaces                         │
├─────────────────────────────────────────────┤
│  1. Nested in Event Details                 │
│     /admindashboard/events/[id]/check-in    │
│     → Orchestrator tab                       │
│                                              │
│  2. Standalone Control Center (NEW)         │
│     /admindashboard/event-control-center    │
│     → Quick access to all events            │
│                                              │
│  3. SMS Commands from Admin Phone (NEW)     │
│     Text to Power100 admin number           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Unified Backend API                        │
│  /api/admin-controls/                       │
├─────────────────────────────────────────────┤
│  • delay-override (existing)                │
│  • custom-message (new)                     │
│  • event-status (new)                       │
│  • manual-checkin (new)                     │
│  • cancel-messages (new)                    │
│  • sms-command (new - routes SMS commands)  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  n8n Workflow: Admin SMS Command Router     │
│  Receives texts from admin phones           │
│  Parses commands → Calls backend API        │
│  Returns confirmation via SMS reply         │
└─────────────────────────────────────────────┘
```

---

## 🗃️ Database Schema Changes

### Events Table - Add SMS Event Code

**New Column**: `sms_event_code` VARCHAR(20) UNIQUE

```sql
-- Add SMS event code for text-based admin controls
ALTER TABLE events ADD COLUMN sms_event_code VARCHAR(20) UNIQUE;

-- Auto-generate codes for existing events
UPDATE events
SET sms_event_code = UPPER(
  REGEXP_REPLACE(
    SUBSTRING(name FROM 1 FOR 3) ||
    TO_CHAR(COALESCE(start_date, date), 'YYYY'),
    '[^A-Z0-9]', '', 'g'
  )
)
WHERE sms_event_code IS NULL;

-- Add index for fast lookups
CREATE INDEX idx_events_sms_code ON events(sms_event_code);
```

**Examples:**
- "Operation Lead Surge 2025" → `OLS2025`
- "The Power100 Experience Winter" → `TPE2025`
- "Contractor Summit March 2026" → `CON2026`

### Admin Users Table - Add SMS Access Flag

**New Column**: `sms_admin_access` BOOLEAN DEFAULT false

```sql
-- Add flag for SMS admin access
ALTER TABLE admin_users ADD COLUMN sms_admin_access BOOLEAN DEFAULT false;

-- Add admin phone number for SMS authentication
ALTER TABLE admin_users ADD COLUMN admin_phone VARCHAR(20);

-- Enable SMS access for CEO
UPDATE admin_users SET sms_admin_access = true WHERE email = 'greg@power100.io';
```

### Admin SMS Commands Log Table (NEW)

```sql
CREATE TABLE admin_sms_commands (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_users(id),
  admin_phone VARCHAR(20) NOT NULL,
  event_id INTEGER REFERENCES events(id),
  event_code VARCHAR(20),
  command_type VARCHAR(50) NOT NULL, -- 'delay', 'message', 'status', 'checkin', 'cancel'
  command_text TEXT NOT NULL,
  parsed_command JSONB,
  executed BOOLEAN DEFAULT false,
  success BOOLEAN,
  response_message TEXT,
  error_message TEXT,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_sms_commands_admin ON admin_sms_commands(admin_id);
CREATE INDEX idx_admin_sms_commands_event ON admin_sms_commands(event_id);
CREATE INDEX idx_admin_sms_commands_created ON admin_sms_commands(created_at DESC);
```

---

## 📱 SMS Command Structure

### Command Format

All SMS commands follow this pattern:
```
COMMAND [PARAMS] [EVENT_CODE] [: MESSAGE]
```

### Supported Commands

#### 1. DELAY - Delay all pending messages

**Syntax:**
```sms
DELAY [minutes] [event_code]
```

**Examples:**
```sms
DELAY 30 OLS2025
→ Delays all messages for OLS2025 by 30 minutes

DELAY 15 TPE2025
→ Delays all messages for TPE2025 by 15 minutes
```

**Backend Action:**
- Calls existing `applyDelayOverride` endpoint
- Updates all pending messages
- Logs override with reason: "SMS command from [admin_name]"

**SMS Reply:**
```sms
✅ OLS2025: All messages delayed by 30 min
📊 45 messages updated
⏰ Next message now at 3:15 PM
```

---

#### 2. MSG - Send custom message

**Syntax:**
```sms
MSG [ALL|CHECKEDIN|PENDING] [event_code]: [message text]
```

**Examples:**
```sms
MSG ALL OLS2025: We're running 20 minutes behind schedule. Opening keynote at 9:30am.
→ Sends to all registered attendees

MSG CHECKEDIN OLS2025: Lunch is ready in the main hall!
→ Sends only to checked-in attendees

MSG PENDING TPE2025: Event starts in 1 hour. See you soon!
→ Sends only to not-yet-checked-in attendees
```

**Backend Action:**
- Calls new `customAdminMessage` endpoint
- Creates message records in `event_messages` table
- Triggers n8n workflow to send via GHL
- message_type: 'admin_custom'
- message_category: 'announcement'

**SMS Reply:**
```sms
✅ OLS2025: Message sent
👥 142 attendees notified
📱 SMS delivery in progress
```

---

#### 3. STATUS - Get event status

**Syntax:**
```sms
STATUS [event_code]
```

**Examples:**
```sms
STATUS OLS2025
→ Returns current event status and metrics
```

**Backend Action:**
- Queries event_attendees, event_messages tables
- Aggregates real-time stats
- Returns formatted summary

**SMS Reply:**
```sms
📊 OLS2025 STATUS
👥 142/157 checked in (90%)
📨 15 pending messages
⏰ Next: Speaker alert in 8 min
🕐 Last delay: 30 min (2:15 PM)
```

---

#### 4. CHECKIN - Manual check-in

**Syntax:**
```sms
CHECKIN [contractor_name] [event_code]
```

**Examples:**
```sms
CHECKIN John Smith OLS2025
→ Manually checks in contractor

CHECKIN Sarah Johnson TPE2025
→ Manually checks in contractor
```

**Backend Action:**
- Searches for contractor by name
- Creates check-in record
- Triggers welcome SMS workflow
- check_in_method: 'sms_admin'

**SMS Reply:**
```sms
✅ John Smith checked in
📱 Welcome SMS sent
🎯 3 peer matches found
```

---

#### 5. CANCEL - Cancel scheduled messages

**Syntax:**
```sms
CANCEL [message_type] [event_code]
```

**Examples:**
```sms
CANCEL SPEAKER OLS2025
→ Cancels all pending speaker alerts

CANCEL SPONSOR OLS2025
→ Cancels all pending sponsor recommendations

CANCEL ALL OLS2025
→ Cancels all pending messages (use with caution!)
```

**Backend Action:**
- Updates message status to 'cancelled'
- Logs cancellation reason
- Does NOT delete records (audit trail)

**SMS Reply:**
```sms
✅ OLS2025: Speaker alerts cancelled
📊 12 messages cancelled
⚠️ Peer matching still active
```

---

#### 6. HELP - Get command list

**Syntax:**
```sms
HELP
```

**SMS Reply:**
```sms
📱 ADMIN COMMANDS:

DELAY [min] [code]
MSG [ALL|CHECKEDIN] [code]: [text]
STATUS [code]
CHECKIN [name] [code]
CANCEL [type] [code]

Event Codes:
• OLS2025 - Op Lead Surge
• TPE2025 - Power100 Exp

Reply HELP [command] for details
```

---

## 🔌 Backend API Endpoints

### Existing Endpoint (Needs Update)

**POST /api/event-messaging/delay-override**
- ✅ Already exists
- ❌ Current issue: Frontend calls `/api/event-scheduler/delay`
- 🔧 Fix frontend to use correct endpoint

**Request:**
```json
{
  "event_id": 5,
  "delay_minutes": 30,
  "reason": "Event running late - SMS command from Greg"
}
```

**Response:**
```json
{
  "success": true,
  "messages_delayed": 45,
  "delay_applied": 30
}
```

---

### New Endpoints Needed

#### 1. POST /api/admin-controls/custom-message

**Purpose:** Send custom admin message to attendees

**Request:**
```json
{
  "event_id": 5,
  "target_audience": "all", // "all" | "checkedin" | "pending"
  "message_content": "We're running 20 minutes behind schedule. Opening keynote at 9:30am.",
  "admin_id": 1,
  "triggered_by": "sms" // "sms" | "web"
}
```

**Response:**
```json
{
  "success": true,
  "messages_created": 142,
  "sms_triggered": true,
  "message_ids": [345, 346, 347, ...]
}
```

---

#### 2. GET /api/admin-controls/event-status/:eventId

**Purpose:** Get real-time event status

**Response:**
```json
{
  "success": true,
  "event_code": "OLS2025",
  "event_name": "Operation Lead Surge 2025",
  "stats": {
    "total_attendees": 157,
    "checked_in": 142,
    "pending_checkin": 15,
    "checked_in_percentage": 90
  },
  "messages": {
    "pending": 15,
    "sent": 284,
    "failed": 2,
    "next_message": {
      "type": "speaker_alert",
      "scheduled_time": "2025-10-15T15:15:00Z",
      "minutes_until": 8
    }
  },
  "last_delay": {
    "minutes": 30,
    "applied_at": "2025-10-15T14:15:00Z",
    "applied_by": "Greg Smith"
  }
}
```

---

#### 3. POST /api/admin-controls/sms-command

**Purpose:** Execute parsed SMS command from n8n

**Request:**
```json
{
  "admin_phone": "+15551234567",
  "event_code": "OLS2025",
  "command_type": "delay",
  "command_text": "DELAY 30 OLS2025",
  "parsed_params": {
    "delay_minutes": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "executed": true,
  "sms_reply": "✅ OLS2025: All messages delayed by 30 min\n📊 45 messages updated\n⏰ Next message now at 3:15 PM"
}
```

---

#### 4. POST /api/admin-controls/manual-checkin

**Purpose:** Manually check in attendee via SMS command

**Request:**
```json
{
  "event_id": 5,
  "contractor_name": "John Smith",
  "admin_id": 1,
  "check_in_method": "sms_admin"
}
```

**Response:**
```json
{
  "success": true,
  "contractor_id": 42,
  "contractor_name": "John Smith",
  "company_name": "ABC Contractors",
  "check_in_time": "2025-10-15T14:30:00Z",
  "welcome_sms_sent": true,
  "peer_matches_found": 3
}
```

---

#### 5. POST /api/admin-controls/cancel-messages

**Purpose:** Cancel pending messages by type

**Request:**
```json
{
  "event_id": 5,
  "message_type": "speaker_alert", // or "all"
  "reason": "SMS command from admin",
  "admin_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "messages_cancelled": 12,
  "message_types_affected": ["speaker_alert"]
}
```

---

## 🔄 n8n Workflow: Admin SMS Command Router

### Workflow Name
`TPX Admin SMS Command Router`

### Workflow ID (DEV)
TBD - To be created

### Trigger
Webhook receiving SMS from GHL when admin phone number sends text

### Flow Steps

**1. Webhook Trigger - Receive Admin SMS**
```javascript
// GHL sends SMS webhook when admin phone texts
const smsData = {
  from: "+15551234567", // Admin phone
  to: "+15559999999",   // Power100 admin number
  body: "DELAY 30 OLS2025"
};
```

**2. Verify Admin Authorization**
```javascript
// Check if phone number is authorized admin
const response = await fetch('https://tpx.power100.io/api/admin-controls/verify-admin', {
  method: 'POST',
  body: JSON.stringify({ phone: smsData.from })
});

if (!response.authorized) {
  sendSMS(smsData.from, "❌ Unauthorized. Contact admin@power100.io");
  return;
}
```

**3. Parse Command**
```javascript
const parseCommand = (text) => {
  const parts = text.trim().split(' ');
  const command = parts[0].toUpperCase();

  // Extract event code (always uppercase, usually at end or after numbers)
  const eventCodeMatch = text.match(/\b([A-Z]{3}\d{4})\b/);
  const eventCode = eventCodeMatch ? eventCodeMatch[1] : null;

  if (command === 'DELAY') {
    return {
      type: 'delay',
      minutes: parseInt(parts[1]),
      event_code: eventCode,
      raw_text: text
    };
  } else if (command === 'MSG') {
    const audience = parts[1].toUpperCase(); // ALL, CHECKEDIN, PENDING
    const colonIndex = text.indexOf(':');
    const message = text.substring(colonIndex + 1).trim();

    return {
      type: 'message',
      audience: audience,
      event_code: eventCode,
      message_content: message,
      raw_text: text
    };
  } else if (command === 'STATUS') {
    return {
      type: 'status',
      event_code: eventCode,
      raw_text: text
    };
  } else if (command === 'CHECKIN') {
    // CHECKIN John Smith OLS2025
    const nameEndIndex = text.lastIndexOf(eventCode);
    const name = text.substring('CHECKIN '.length, nameEndIndex).trim();

    return {
      type: 'checkin',
      contractor_name: name,
      event_code: eventCode,
      raw_text: text
    };
  } else if (command === 'CANCEL') {
    return {
      type: 'cancel',
      message_type: parts[1].toLowerCase(),
      event_code: eventCode,
      raw_text: text
    };
  } else if (command === 'HELP') {
    return {
      type: 'help',
      specific_command: parts[1]?.toLowerCase(),
      raw_text: text
    };
  }

  return { type: 'unknown', raw_text: text };
};
```

**4. Route Switch - Execute Command**
```javascript
// Branch based on command type
switch (parsedCommand.type) {
  case 'delay':
    // Call delay-override endpoint
    break;
  case 'message':
    // Call custom-message endpoint
    break;
  case 'status':
    // Call event-status endpoint
    break;
  case 'checkin':
    // Call manual-checkin endpoint
    break;
  case 'cancel':
    // Call cancel-messages endpoint
    break;
  case 'help':
    // Return help text
    break;
  default:
    // Unknown command
    break;
}
```

**5. Call Backend API**
```javascript
// Example: DELAY command
const backendResponse = await fetch('https://tpx.power100.io/api/admin-controls/sms-command', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'tpx-n8n-automation-key-2025-power100-experience'
  },
  body: JSON.stringify({
    admin_phone: smsData.from,
    event_code: parsedCommand.event_code,
    command_type: parsedCommand.type,
    command_text: parsedCommand.raw_text,
    parsed_params: parsedCommand
  })
});
```

**6. Log Command to Database**
```javascript
// Log in admin_sms_commands table
await fetch('https://tpx.power100.io/api/admin-controls/log-sms-command', {
  method: 'POST',
  body: JSON.stringify({
    admin_phone: smsData.from,
    command: parsedCommand,
    response: backendResponse,
    executed: backendResponse.success
  })
});
```

**7. Send SMS Reply**
```javascript
// Send confirmation back to admin
await sendSMS(smsData.from, backendResponse.sms_reply);
```

---

## 🖥️ Frontend Interfaces

### 1. Nested UI (Existing - Needs Fix)

**Location:** `/admindashboard/events/[id]/check-in` → Orchestrator tab

**Current Issues:**
- ❌ API endpoint mismatch: calls `/api/event-scheduler/delay` instead of `/api/event-messaging/delay-override`
- ❌ Missing "reason" field (backend expects it)
- ❌ Poor error handling (just uses `alert()`)
- ❌ Message queue is static (should fetch from database)
- ❌ No refresh after delay applied

**Fixes Needed:**
```typescript
// Fix API call
const handleDelayOverride = async () => {
  const delayMinutes = parseInt(delayInput);
  const reason = delayReason || 'Manual delay override from admin dashboard';

  try {
    const response = await fetch('/api/event-messaging/delay-override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getFromStorage('authToken')}`
      },
      body: JSON.stringify({
        event_id: params.id,
        delay_minutes: delayMinutes,
        reason: reason
      })
    });

    const data = await handleApiResponse(response);

    if (data.success) {
      toast.success(`✅ ${data.messages_delayed} messages delayed by ${delayMinutes} minutes`);
      fetchMessageQueue(); // Refresh queue
    }
  } catch (error) {
    toast.error(`Failed to apply delay: ${error.message}`);
  }
};
```

**Add Message Queue Fetch:**
```typescript
const fetchMessageQueue = async () => {
  try {
    const response = await fetch(`/api/event-messaging/event/${params.id}/queue`, {
      headers: {
        'Authorization': `Bearer ${getFromStorage('authToken')}`
      }
    });

    const data = await handleApiResponse(response);
    setMessageQueue(data.messages);
  } catch (error) {
    console.error('Failed to fetch message queue:', error);
  }
};
```

---

### 2. Standalone Control Center (NEW)

**Location:** `/admindashboard/event-control-center`

**Purpose:** Quick access to all active/upcoming events for rapid control

**Layout:**
```typescript
// Event Control Center Component Structure
<div className="event-control-center">
  {/* Header */}
  <h1>Event Control Center</h1>
  <p>Quick controls for all active events</p>

  {/* Active Events Grid */}
  <div className="events-grid">
    {activeEvents.map(event => (
      <EventControlCard key={event.id} event={event}>
        {/* Quick Stats */}
        <Stats>
          <Stat label="Checked In">{event.checked_in}/{event.total}</Stat>
          <Stat label="Pending Messages">{event.pending_messages}</Stat>
          <Stat label="Next Message">{event.next_message_in}</Stat>
        </Stats>

        {/* Quick Delay Control */}
        <DelayControl>
          <Input type="number" placeholder="Minutes" />
          <Button onClick={() => applyDelay(event.id)}>Apply Delay</Button>
        </DelayControl>

        {/* Quick Message */}
        <QuickMessage>
          <Textarea placeholder="Send message to all attendees..." />
          <Button>Send to All</Button>
          <Button>Send to Checked In</Button>
        </QuickMessage>

        {/* View Details Link */}
        <Link href={`/admindashboard/events/${event.id}/check-in`}>
          Full Controls →
        </Link>
      </EventControlCard>
    ))}
  </div>

  {/* SMS Command Help Section */}
  <Card className="sms-help">
    <CardHeader>
      <CardTitle>📱 Control Events via SMS</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Text these commands to: +1 (555) 999-9999</p>

      <CommandList>
        <Command>
          <Code>DELAY 30 {event.sms_event_code}</Code>
          <Description>Delay all messages by 30 minutes</Description>
        </Command>

        <Command>
          <Code>MSG ALL {event.sms_event_code}: Running late</Code>
          <Description>Send message to all attendees</Description>
        </Command>

        <Command>
          <Code>STATUS {event.sms_event_code}</Code>
          <Description>Get event status</Description>
        </Command>
      </CommandList>

      <Link href="/admindashboard/sms-command-log">
        View SMS Command History →
      </Link>
    </CardContent>
  </Card>

  {/* SMS Command Log (Recent) */}
  <Card className="recent-sms-commands">
    <CardHeader>
      <CardTitle>Recent SMS Commands</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Command</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentCommands.map(cmd => (
            <TableRow key={cmd.id}>
              <TableCell>{formatTime(cmd.created_at)}</TableCell>
              <TableCell>{cmd.admin_name}</TableCell>
              <TableCell>{cmd.event_code}</TableCell>
              <TableCell><Code>{cmd.command_text}</Code></TableCell>
              <TableCell>
                {cmd.success ? '✅' : '❌'} {cmd.response_message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</div>
```

---

## 📝 Implementation Phases

### Phase 1: Fix Existing Nested UI (1 hour) ✅ CRITICAL
**Goal:** Make current CEO delay override functional

**Tasks:**
1. Fix API endpoint from `/api/event-scheduler/delay` to `/api/event-messaging/delay-override`
2. Add "reason" input field to UI
3. Replace `alert()` with proper toast notifications
4. Add loading states
5. Create `fetchMessageQueue()` function
6. Make message queue dynamic (fetch from database)
7. Add auto-refresh after delay applied
8. Test with backend

**Files to Edit:**
- `tpe-front-end/src/app/admindashboard/events/[id]/check-in/page.tsx` (lines 690-720)

---

### Phase 2: Add SMS Event Codes to Database (30 min) ✅ CRITICAL
**Goal:** Enable event identification via short codes

**Tasks:**
1. Create database migration for `sms_event_code` column
2. Write auto-generation logic for existing events
3. Update EventForm component to include SMS code field
4. Add SMS code to event details display
5. Test code generation and uniqueness

**Database Changes:**
```sql
-- Add column
ALTER TABLE events ADD COLUMN sms_event_code VARCHAR(20) UNIQUE;

-- Auto-generate codes
UPDATE events SET sms_event_code = [generation logic];

-- Add index
CREATE INDEX idx_events_sms_code ON events(sms_event_code);
```

**Files to Edit:**
- Database migration script (new file)
- `tpe-backend/src/controllers/eventController.js` (add code generation)
- `tpe-front-end/src/components/admin/EventForm.tsx` (add SMS code field)

---

### Phase 3: Build Backend API Endpoints (2 hours) 🔧 HIGH PRIORITY
**Goal:** Create unified admin control API

**Tasks:**
1. Create new controller: `adminControlsController.js`
2. Create new routes: `adminControlsRoutes.js`
3. Implement endpoints:
   - POST `/api/admin-controls/custom-message`
   - GET `/api/admin-controls/event-status/:eventId`
   - POST `/api/admin-controls/sms-command`
   - POST `/api/admin-controls/manual-checkin`
   - POST `/api/admin-controls/cancel-messages`
   - POST `/api/admin-controls/verify-admin`
   - POST `/api/admin-controls/log-sms-command`
4. Update existing `applyDelayOverride` to work with new API
5. Create database table for `admin_sms_commands`
6. Write tests for each endpoint

**Files to Create:**
- `tpe-backend/src/controllers/adminControlsController.js`
- `tpe-backend/src/routes/adminControlsRoutes.js`
- `tpe-backend/migrations/create_admin_sms_commands_table.sql`

**Files to Edit:**
- `tpe-backend/src/server.js` (register new routes)

---

### Phase 4: Build SMS Command Router (n8n) (2 hours) 🤖 HIGH PRIORITY
**Goal:** Enable SMS-based event control

**Tasks:**
1. Create n8n workflow: "TPX Admin SMS Command Router - DEV"
2. Set up webhook trigger for admin SMS
3. Implement command parser (DELAY, MSG, STATUS, CHECKIN, CANCEL, HELP)
4. Implement admin authorization check
5. Implement API calls to backend for each command type
6. Implement SMS reply logic
7. Add error handling for unknown commands
8. Test each command type
9. Create production version

**n8n Workflow Steps:**
- Webhook trigger
- Parse admin SMS
- Verify authorization
- Route switch (command type)
- Call backend API
- Log command
- Send SMS reply

---

### Phase 5: Build Standalone Control Center UI (2 hours) 🖥️ MEDIUM PRIORITY
**Goal:** Quick multi-event control dashboard

**Tasks:**
1. Create page: `/admindashboard/event-control-center/page.tsx`
2. Fetch all active/upcoming events
3. Display event cards with quick controls
4. Implement quick delay control
5. Implement quick custom message
6. Add SMS command help section with event codes
7. Add recent SMS command log table
8. Create SMS command history page
9. Add navigation link from main admin dashboard
10. Test all controls

**Files to Create:**
- `tpe-front-end/src/app/admindashboard/event-control-center/page.tsx`
- `tpe-front-end/src/app/admindashboard/sms-command-log/page.tsx`
- `tpe-front-end/src/components/admin/EventControlCard.tsx`
- `tpe-front-end/src/components/admin/QuickDelayControl.tsx`
- `tpe-front-end/src/components/admin/QuickMessage.tsx`

**Files to Edit:**
- `tpe-front-end/src/app/admindashboard/page.tsx` (add navigation link)

---

### Phase 6: Enhance & Test SMS Commands (1 hour) 🧪 MEDIUM PRIORITY
**Goal:** Comprehensive testing and refinement

**Tasks:**
1. Test DELAY command with various time values
2. Test MSG command with different audiences
3. Test STATUS command output formatting
4. Test CHECKIN with name matching logic
5. Test CANCEL with different message types
6. Test HELP command responses
7. Test with multiple simultaneous events
8. Test error cases (wrong event code, unauthorized phone, etc.)
9. Optimize SMS reply formatting for mobile readability
10. Document all edge cases

---

### Phase 7: Admin Phone Management (1 hour) 👤 LOW PRIORITY
**Goal:** Manage which admins can use SMS controls

**Tasks:**
1. Add `sms_admin_access` and `admin_phone` to admin_users table
2. Create admin settings page for phone number management
3. Add phone verification workflow (optional 2FA)
4. Create admin list with SMS access status
5. Add UI to enable/disable SMS access per admin
6. Test authorization logic

**Files to Create:**
- `tpe-front-end/src/app/admindashboard/admin-settings/page.tsx`

**Database Changes:**
```sql
ALTER TABLE admin_users ADD COLUMN sms_admin_access BOOLEAN DEFAULT false;
ALTER TABLE admin_users ADD COLUMN admin_phone VARCHAR(20);
```

---

## 🔐 Security Considerations

### SMS Authentication
1. **Phone Number Verification**
   - Only pre-authorized phone numbers can send commands
   - Phone numbers stored in `admin_users.admin_phone`
   - Flag `sms_admin_access` must be true

2. **Command Logging**
   - All SMS commands logged in `admin_sms_commands` table
   - Includes timestamp, admin, event, command, success/failure
   - Audit trail for compliance

3. **Rate Limiting**
   - Max 10 SMS commands per admin per minute
   - Prevents accidental spam or abuse

### API Security
1. **Authentication Required**
   - All admin control endpoints require JWT token or API key
   - SMS commands authenticated via phone number + API key

2. **Event Ownership**
   - Verify admin has access to specified event
   - Cross-reference event permissions

3. **Validation**
   - All inputs validated and sanitized
   - Event codes verified against database
   - Message content checked for length/format

---

## 📊 Success Metrics

### Phase 1-2 Success Criteria
- ✅ CEO delay override works correctly from nested UI
- ✅ All events have unique SMS codes
- ✅ Message queue displays real-time data

### Phase 3-4 Success Criteria
- ✅ All 7 backend endpoints functional
- ✅ SMS commands successfully route and execute
- ✅ Confirmations sent back via SMS within 3 seconds

### Phase 5 Success Criteria
- ✅ Control center shows all active events
- ✅ Quick controls work for delay and messaging
- ✅ SMS command log displays recent activity

### Overall Success
- ✅ Greg can control events entirely via SMS during live events
- ✅ All three interfaces (nested, standalone, SMS) use same backend
- ✅ Command execution time < 3 seconds
- ✅ 100% command logging for audit trail
- ✅ Zero unauthorized command executions

---

## 🔗 Related Documentation

- [Event Orchestrator Overview](../AI-FIRST-STRATEGY.md#event-experience-orchestrator)
- [Event SMS Message Categorization](./event-orchestrator/event-sms-message-categorization.md)
- [SMS Router System](./event-orchestrator/event-sms-message-categorization.md#sms-router-architecture)
- [N8N Workflow Format Requirements](../N8N-WORKFLOW-FORMAT-REQUIREMENTS.md)

---

**Document Version**: 1.0
**Last Updated**: October 2, 2025
**Status**: Planning Complete - Ready for Implementation
**Maintainer**: The Power100 Experience Development Team
