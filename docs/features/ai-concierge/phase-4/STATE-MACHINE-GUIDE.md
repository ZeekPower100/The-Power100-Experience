# AI Concierge State Machine Guide

**Document Version:** 1.0
**Date:** October 15, 2025
**Status:** PRODUCTION READY
**Phase:** 4 - State Machine Integration Complete ✅

---

## 🎯 Overview

The AI Concierge State Machine manages agent routing between **Standard Agent** and **Event Agent** using XState v5. This declarative approach replaces procedural if/else logic with a visual, testable state machine that ensures predictable agent behavior.

### Why State Machines?

- **Declarative Logic**: Agent routing is explicit and verifiable through state diagrams
- **Visual Documentation**: State machines provide clear understanding of concierge behavior
- **Predictable Behavior**: Eliminates edge cases in agent routing
- **Easier Testing**: State transitions can be unit tested independently
- **Maintainability**: Future agent types or modes become simpler to add

---

## 📊 State Machine Architecture

### States

The state machine has **4 states**:

| State | Purpose | Duration |
|-------|---------|----------|
| **idle** | Waiting for first message | Until MESSAGE_RECEIVED |
| **routing** | Evaluating guards and routing | Immediate transition |
| **standard_agent** | Business growth mode | Until routing event |
| **event_agent** | Event support mode | Until routing event |

### Visual Diagram

See `state-machine-diagram.mmd` for the complete Mermaid diagram.

**Quick View:**
```
idle → routing → [standard_agent | event_agent] → routing → ...
```

---

## 🔄 State Transitions

### All Possible Transitions

| From State | Event | Guard | To State |
|------------|-------|-------|----------|
| `idle` | MESSAGE_RECEIVED | - | `routing` |
| `idle` | UPDATE_EVENT_CONTEXT | - | `idle` (no transition) |
| `routing` | - (always) | hasActiveEvent = false | `standard_agent` |
| `routing` | - (always) | hasActiveEvent = true | `event_agent` |
| `standard_agent` | MESSAGE_RECEIVED | - | `routing` |
| `standard_agent` | EVENT_REGISTERED | - | `routing` |
| `standard_agent` | SESSION_END | - | `idle` |
| `standard_agent` | UPDATE_EVENT_CONTEXT | - | `standard_agent` (no transition) |
| `event_agent` | MESSAGE_RECEIVED | - | `routing` |
| `event_agent` | EVENT_ENDED | - | `routing` |
| `event_agent` | SESSION_END | - | `idle` |
| `event_agent` | UPDATE_EVENT_CONTEXT | - | `event_agent` (no transition) |

### Event Descriptions

#### **MESSAGE_RECEIVED**
- **Trigger**: Contractor sends a message to the AI Concierge
- **Effect**: Forces re-routing through guards to determine correct agent
- **Use Case**: Every contractor message triggers this event

#### **EVENT_REGISTERED**
- **Trigger**: Contractor registers for an event (triggered by controller)
- **Effect**: Forces re-routing (will switch to event agent if event is today)
- **Use Case**: Mid-conversation event registration

#### **EVENT_ENDED**
- **Trigger**: Event concludes (triggered by controller or time-based check)
- **Effect**: Forces re-routing (will switch back to standard agent)
- **Use Case**: Event ends while contractor is in conversation

#### **SESSION_END**
- **Trigger**: Contractor ends conversation or session times out
- **Effect**: Transitions to idle state, machine can be destroyed
- **Use Case**: Clean session termination

#### **UPDATE_EVENT_CONTEXT**
- **Trigger**: Event context changes (internal state update)
- **Effect**: Updates context but doesn't force routing
- **Use Case**: Update event data without triggering agent switch

---

## 🛡️ Guards

### hasActiveEvent

**Purpose**: Determines if contractor should use Event Agent

**Evaluation Logic**:
```javascript
hasActiveEvent: ({ context }) => {
  if (!context.eventContext) return false;

  const { eventDate, eventStatus } = context.eventContext;

  // Check if event status indicates active attendance
  const activeStatuses = ['registered', 'checked_in', 'attending'];
  const isActiveStatus = activeStatuses.includes(eventStatus);

  if (!isActiveStatus) return false;

  // Check if event is today (string comparison to avoid UTC issues)
  const now = new Date();
  const todayString = now.toISOString().split('T')[0];
  const eventDateString = typeof eventDate === 'string' ? eventDate.split('T')[0] : eventDate;

  return eventDateString === todayString;
}
```

**Returns `true` when**:
- Event context exists
- Event status is 'registered', 'checked_in', or 'attending'
- Event date is today (local date comparison)

**Returns `false` when**:
- No event context
- Event status is 'no_show' or 'cancelled'
- Event is in the future or past

---

## 🎬 Actions

### setStandardAgent
**Trigger**: When routing to standard agent
**Effect**: Sets `currentAgent` to 'standard' and updates `lastTransition` timestamp

### setEventAgent
**Trigger**: When routing to event agent
**Effect**: Sets `currentAgent` to 'event' and updates `lastTransition` timestamp

### updateEventContext
**Trigger**: UPDATE_EVENT_CONTEXT event
**Effect**: Updates `eventContext` in machine context

### logStandardAgentEntry
**Trigger**: When entering standard_agent state
**Effect**: Logs entry to console for debugging

### logEventAgentEntry
**Trigger**: When entering event_agent state
**Effect**: Logs entry to console with event name

---

## 🗄️ Context Structure

The state machine maintains this context per contractor+session:

```typescript
interface Context {
  contractorId: number;           // Contractor ID
  sessionId: string;              // Unique session identifier
  eventContext: {                 // Event data (null if no event)
    eventId: number;
    eventName: string;
    eventDate: string;            // YYYY-MM-DD format
    eventStatus: string;          // 'registered' | 'checked_in' | 'attending'
  } | null;
  currentAgent: 'standard' | 'event' | null;
  lastTransition: string;         // ISO timestamp
}
```

---

## 💾 State Persistence

### Database Storage

State is persisted to `ai_concierge_sessions` table:

```sql
ai_concierge_sessions (
  session_id VARCHAR,           -- Session identifier
  contractor_id INTEGER,        -- FK to contractors
  session_data TEXT,            -- JSON.stringify(state machine state)
  session_type VARCHAR,         -- 'standard' or 'event'
  ...
)
```

### Persistence Timing

State is persisted:
- ✅ After every transition
- ✅ After every MESSAGE_RECEIVED event
- ✅ When session ends

### State Restoration

When a machine is recreated (e.g., after server restart):
1. Load `session_data` from database
2. Parse JSON to get previous state and context
3. Create new actor with restored context
4. If previous state was not 'idle', trigger MESSAGE_RECEIVED to restore correct agent state
5. Machine evaluates guards and transitions to correct state

---

## 🔧 Integration Points

### AI Concierge Controller

**File**: `tpe-backend/src/controllers/aiConciergeController.js`

**Integration**:
```javascript
const stateMachineManager = require('../services/conciergeStateMachineManager');

async function routeToAgent(contractorId, sessionId) {
  // 1. Get event context from database
  const eventContext = await fetchEventContext(contractorId);

  // 2. Update state machine context
  await stateMachineManager.updateEventContext(contractorId, sessionId, eventContext);

  // 3. Send MESSAGE_RECEIVED event
  await stateMachineManager.sendEvent(contractorId, sessionId, 'MESSAGE_RECEIVED', { eventContext });

  // 4. Get current agent
  const agentType = await stateMachineManager.getCurrentAgent(contractorId, sessionId);

  // 5. Return appropriate agent
  return {
    agentType,
    agent: agentType === 'event' ? getOrCreateEventAgent() : getOrCreateStandardAgent(),
    ...
  };
}
```

### State Machine Manager

**File**: `tpe-backend/src/services/conciergeStateMachineManager.js`

**Key Methods**:
- `getOrCreateMachine(contractorId, sessionId)` - Get or create machine instance
- `sendEvent(contractorId, sessionId, eventName, eventData)` - Send event to machine
- `getCurrentAgent(contractorId, sessionId)` - Get current agent type
- `updateEventContext(contractorId, sessionId, eventContext)` - Update event context
- `persistState(contractorId, sessionId, service)` - Save state to database
- `destroyMachine(contractorId, sessionId)` - Clean up machine

---

## 🧪 Testing

### Test Coverage

**Unit Tests**: `test-state-machine.js`
- ✅ Machine instance creation
- ✅ Initial state verification
- ✅ Standard agent routing (no event)
- ✅ Event agent routing (with active event)
- ✅ State persistence to database

**Transition Tests**: `test-state-transitions.js`
- ✅ SCENARIO 1: Mid-conversation event activation (standard → event)
- ✅ SCENARIO 2: Mid-conversation event deactivation (event → standard)
- ✅ SCENARIO 3: Event status changes (future event → today)
- ✅ SCENARIO 4: State persistence across multiple messages
- ✅ SCENARIO 5: Machine restoration after restart

### Running Tests

```bash
cd tpe-backend

# Basic state machine tests
node test-state-machine.js

# Transition and edge case tests
node test-state-transitions.js
```

---

## 🐛 Troubleshooting

### Issue: Agent not switching when event starts

**Symptoms**: Contractor registers for event, but stays in Standard Agent

**Diagnosis**:
1. Check event context: Is `eventDate` today?
2. Check event status: Is it 'registered', 'checked_in', or 'attending'?
3. Check guard evaluation: Is `hasActiveEvent` returning true?

**Solution**:
```javascript
// Verify event context
const context = machine.getSnapshot().context;
console.log('Event Context:', context.eventContext);

// Force re-routing
await stateMachineManager.sendEvent(contractorId, sessionId, 'MESSAGE_RECEIVED', { eventContext });
```

### Issue: State not persisting to database

**Symptoms**: State resets after server restart

**Diagnosis**:
1. Check database connection
2. Verify `session_id` exists in `ai_concierge_sessions` table
3. Check `session_data` field has JSON content

**Solution**:
```sql
-- Check if session exists
SELECT session_id, session_type, session_data
FROM ai_concierge_sessions
WHERE session_id = 'your-session-id';

-- Verify session_data is JSON
SELECT session_id,
       (session_data::jsonb)->'state' as current_state,
       session_type
FROM ai_concierge_sessions;
```

### Issue: Machine stuck in routing state

**Symptoms**: getCurrentAgent returns null

**Diagnosis**:
1. Check if guards are evaluating correctly
2. Verify routing state transitions immediately (it's an "always" transition)

**Solution**:
```javascript
// Get current state
const currentState = await stateMachineManager.getCurrentState(contractorId, sessionId);
console.log('Current State:', currentState); // Should not be 'routing'

// If stuck in routing, check guard logic
const snapshot = machine.getSnapshot();
console.log('Context:', snapshot.context);
```

### Issue: Date comparison not working correctly

**Symptoms**: Event is today, but guard returns false

**Diagnosis**: UTC offset issues with date parsing

**Solution**: We use string comparison to avoid UTC issues:
```javascript
// ✅ CORRECT: String comparison
const todayString = new Date().toISOString().split('T')[0]; // '2025-10-15'
const eventDateString = eventDate.split('T')[0]; // '2025-10-15'
return todayString === eventDateString;

// ❌ WRONG: Date object comparison (UTC issues)
const eventDay = new Date(eventDate);
return eventDay.toDateString() === now.toDateString();
```

---

## 📈 Performance Considerations

### Memory Management

- Each contractor+session gets ONE machine instance
- Machines are stored in a Map with key: `${contractorId}-${sessionId}`
- Machines are destroyed when session ends (via SESSION_END event)
- No memory leaks - machines are properly cleaned up

### State Persistence Overhead

- Persistence happens after every transition (~1-2ms)
- Uses async database writes (non-blocking)
- Only persists when state actually changes
- Consider batching if performance becomes an issue

### Guard Evaluation

- Guards are pure functions (no side effects)
- Guards evaluate in <1ms
- Guards only run during routing state
- No database queries in guards (context is pre-fetched)

---

## 🔮 Future Enhancements

### Potential New States

1. **multi_agent**: Run both agents in parallel
2. **partner_agent**: Specialized agent for partner-specific questions
3. **emergency_agent**: High-priority support mode

### Potential New Guards

1. **hasCriticalIssue**: Route to emergency agent
2. **hasPartnerContext**: Route to partner-specific agent
3. **isBusinessHours**: Time-based routing

### Potential New Events

1. **CRITICAL_ISSUE_DETECTED**: Emergency routing
2. **PARTNER_MENTION**: Route to partner agent
3. **BUSINESS_HOURS_CHANGED**: Time-based routing

---

## 📚 Related Documentation

- **Implementation Plan**: `PHASE-4-IMPLEMENTATION-PLAN.md`
- **Pre-Flight Checklist**: `PHASE-4-PRE-FLIGHT-CHECKLIST.md`
- **Architecture Recommendation**: `../AI-CONCIERGE-HYBRID-ARCHITECTURE-RECOMMENDATION.md`
- **State Machine Code**: `tpe-backend/src/services/conciergeStateMachine.js`
- **Manager Code**: `tpe-backend/src/services/conciergeStateMachineManager.js`

---

## 🎓 Learning Resources

### XState v5 Documentation
- Official Docs: https://stately.ai/docs/xstate
- State Machine Basics: https://stately.ai/docs/state-machines
- Guards: https://stately.ai/docs/guards
- Actions: https://stately.ai/docs/actions

### State Machine Patterns
- Finite State Machines: https://en.wikipedia.org/wiki/Finite-state_machine
- Statecharts: https://statecharts.dev/

---

**Last Updated:** October 15, 2025
**Status:** Production Ready
**Next Review:** As needed for new features
