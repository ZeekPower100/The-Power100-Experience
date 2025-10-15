# Phase 4: State Machine Integration - Implementation Plan

**Document Version:** 1.0
**Date:** October 15, 2025
**Status:** READY FOR IMPLEMENTATION
**Duration:** 5 Days (Week 5)
**Database Schema:** To be verified before implementation

---

## 🎯 Phase Overview

### Goal
Implement XState state machine integration to replace procedural agent routing logic with declarative state management. The state machine will manage all AI Concierge mode transitions (Standard Agent ↔ Event Agent) and ensure predictable, testable behavior.

### Why This Matters
- **Declarative Logic**: Agent routing becomes explicit and verifiable through state diagrams
- **Visual Documentation**: State machines provide clear understanding of concierge behavior
- **Predictable Behavior**: Eliminates edge cases in agent routing
- **Easier Testing**: State transitions can be unit tested independently
- **Maintainability**: Future agent types or modes become simpler to add

### Current Architecture (Phase 3 Complete)
We currently have:
- ✅ **Standard Agent** (aiConciergeStandardAgent.js) - Business growth, partner matching, resources
- ✅ **Event Agent** (aiConciergeEventAgent.js) - Event-specific support with real-time context
- ✅ **Procedural Routing** in aiConciergeController.js (lines 50-110) - Simple if/else logic
- ✅ **LangSmith Tracing** - Full observability of agent decisions
- ✅ **AI Action Guards** - Permission-based safety checks
- ✅ **OpenAI Tracer** - Token usage tracking

### Phase 4 Objectives
1. Install and configure XState for backend state management
2. Define complete state machine with all concierge states and agent routing
3. Replace procedural routing with state machine-driven routing
4. Implement state persistence per contractor session
5. Generate visual state diagrams for documentation
6. Comprehensive testing of all state transitions

---

## 📋 5-Day Implementation Timeline

### Day 1: XState Setup & State Machine Definition (1.5 days)

#### Objectives
- Install XState and understand state machine patterns
- Define complete state machine for AI Concierge agent routing
- Map all state transitions and guards

#### Tasks

**1. Install XState Dependencies**
```bash
cd tpe-backend
npm install xstate
npm install @xstate/graph --save-dev  # For visualization
```

**2. Create State Machine Service File**
- **File**: `tpe-backend/src/services/conciergeStateMachine.js` (NEW)
- **Purpose**: Define the complete XState machine for concierge agent routing

**State Machine Structure:**
```javascript
// States:
// - idle: Waiting for message
// - routing: Determining which agent to use
// - standard_agent: Using Standard Agent (business growth focus)
// - event_agent: Using Event Agent (event context focus)

// Guards:
// - hasActiveEvent: Check if contractor has event registration with event today
// - eventIsLive: Check if current datetime is within event start/end times
// - eventRecentlyEnded: Check if event ended within last 24 hours

// Context (stored per contractor):
// - contractorId: integer
// - eventContext: null | { eventId, eventName, eventDate, eventStatus }
// - currentAgent: 'standard' | 'event'
// - lastTransition: timestamp
// - sessionId: string
```

**3. Define State Machine with XState**

**File**: `tpe-backend/src/services/conciergeStateMachine.js`

```javascript
// DATABASE-CHECKED: [tables to be verified in Pre-Flight Checklist]
const { createMachine } = require('xstate');

const conciergeStateMachine = createMachine({
  id: 'aiConcierge',
  initial: 'idle',

  context: {
    contractorId: null,
    eventContext: null,
    currentAgent: null,
    sessionId: null,
    lastTransition: null
  },

  states: {
    idle: {
      on: {
        MESSAGE_RECEIVED: 'routing'
      }
    },

    routing: {
      always: [
        {
          target: 'event_agent',
          guard: 'hasActiveEvent',
          actions: 'setEventAgent'
        },
        {
          target: 'standard_agent',
          actions: 'setStandardAgent'
        }
      ]
    },

    standard_agent: {
      on: {
        MESSAGE_RECEIVED: 'routing',
        EVENT_REGISTERED: 'routing',
        SESSION_END: 'idle'
      },

      entry: 'logStandardAgentEntry',

      meta: {
        agentType: 'standard',
        description: 'Business growth, partner matching, resources'
      }
    },

    event_agent: {
      on: {
        MESSAGE_RECEIVED: 'routing',
        EVENT_ENDED: 'routing',
        SESSION_END: 'idle'
      },

      entry: 'logEventAgentEntry',

      meta: {
        agentType: 'event',
        description: 'Event-specific support with real-time context'
      }
    }
  }
}, {
  guards: {
    hasActiveEvent: (context) => {
      if (!context.eventContext) return false;

      const { eventDate, eventStatus } = context.eventContext;
      const now = new Date();
      const eventDay = new Date(eventDate);

      // Check if event is today AND contractor is registered/attending
      const isToday = eventDay.toDateString() === now.toDateString();
      const isActiveStatus = ['registered', 'checked_in', 'attending'].includes(eventStatus);

      return isToday && isActiveStatus;
    }
  },

  actions: {
    setStandardAgent: (context) => {
      context.currentAgent = 'standard';
      context.lastTransition = new Date().toISOString();
    },

    setEventAgent: (context) => {
      context.currentAgent = 'event';
      context.lastTransition = new Date().toISOString();
    },

    logStandardAgentEntry: (context) => {
      console.log(`[State Machine] → STANDARD AGENT for contractor ${context.contractorId}`);
    },

    logEventAgentEntry: (context) => {
      console.log(`[State Machine] → EVENT AGENT for contractor ${context.contractorId} at ${context.eventContext?.eventName}`);
    }
  }
});

module.exports = { conciergeStateMachine };
```

#### Database Fields Used
**Tables to verify (MANDATORY Pre-Flight Check):**
- `ai_concierge_sessions` - Store machine state
- `contractor_event_registrations` - Check event registration status
- `events` - Get event details

**Database Verification Commands (to run in Pre-Flight Checklist):**
```bash
# Verify ai_concierge_sessions columns:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""

# Verify contractor_event_registrations columns:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' ORDER BY ordinal_position;\""

# Verify events columns:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;\""
```

#### Success Criteria
- [ ] XState installed and importable
- [ ] `conciergeStateMachine.js` created with all states defined
- [ ] Guards implemented with correct logic
- [ ] Actions implemented for state transitions
- [ ] Machine exports correctly

---

### Day 2: State Machine Manager Service (2 days)

#### Objectives
- Create state machine manager service to handle machine instances
- Integrate with existing AI Concierge Controller
- Implement state persistence to database
- Replace procedural routing with state machine

#### Tasks

**1. Create State Machine Manager Service**

**File**: `tpe-backend/src/services/conciergeStateMachineManager.js` (NEW)

```javascript
// DATABASE-CHECKED: [tables to be verified in Pre-Flight Checklist]
const { interpret } = require('xstate');
const { conciergeStateMachine } = require('./conciergeStateMachine');
const { query } = require('../config/database');

/**
 * State Machine Manager
 * Manages XState machine instances per contractor
 * Handles state persistence and restoration
 */
class ConciergeStateMachineManager {
  constructor() {
    this.machines = new Map(); // contractorId -> machine service
  }

  /**
   * Get or create machine for contractor
   * @param {number} contractorId
   * @param {string} sessionId
   * @returns {Promise<object>} Machine service
   */
  async getOrCreateMachine(contractorId, sessionId) {
    const key = `${contractorId}-${sessionId}`;

    if (this.machines.has(key)) {
      return this.machines.get(key);
    }

    // Check if we can restore state from database
    const savedState = await this.loadStateFromDatabase(sessionId);

    // Create machine with initial or restored context
    const machineWithContext = conciergeStateMachine.withContext({
      contractorId,
      sessionId,
      eventContext: savedState?.eventContext || null,
      currentAgent: savedState?.currentAgent || null,
      lastTransition: savedState?.lastTransition || null
    });

    // Start the machine
    const service = interpret(machineWithContext);
    service.start();

    // If we have saved state, restore it
    if (savedState?.state) {
      // XState state restoration would go here
      console.log(`[State Machine Manager] Restored state for contractor ${contractorId}`);
    }

    this.machines.set(key, service);
    return service;
  }

  /**
   * Send event to contractor's machine
   * @param {number} contractorId
   * @param {string} sessionId
   * @param {string} eventName
   * @param {object} eventData
   */
  async sendEvent(contractorId, sessionId, eventName, eventData = {}) {
    const service = await this.getOrCreateMachine(contractorId, sessionId);

    // Update context if event includes event context
    if (eventData.eventContext) {
      service.send({
        type: 'UPDATE_CONTEXT',
        eventContext: eventData.eventContext
      });
    }

    service.send({ type: eventName, ...eventData });

    // Persist state after transition
    await this.persistState(contractorId, sessionId, service);
  }

  /**
   * Get current agent type for contractor
   * @param {number} contractorId
   * @param {string} sessionId
   * @returns {Promise<'standard'|'event'>}
   */
  async getCurrentAgent(contractorId, sessionId) {
    const service = await this.getOrCreateMachine(contractorId, sessionId);
    const state = service.getSnapshot();

    if (state.matches('standard_agent')) return 'standard';
    if (state.matches('event_agent')) return 'event';

    return null;
  }

  /**
   * Persist machine state to database
   * @param {number} contractorId
   * @param {string} sessionId
   * @param {object} service - Machine service
   */
  async persistState(contractorId, sessionId, service) {
    const snapshot = service.getSnapshot();

    const stateData = {
      state: snapshot.value,
      context: snapshot.context,
      timestamp: new Date().toISOString()
    };

    await query(`
      UPDATE ai_concierge_sessions
      SET
        session_data = $1,
        session_type = $2,
        updated_at = NOW()
      WHERE session_id = $3
    `, [
      JSON.stringify(stateData),
      snapshot.context.currentAgent || 'standard',
      sessionId
    ]);
  }

  /**
   * Load state from database
   * @param {string} sessionId
   * @returns {Promise<object|null>}
   */
  async loadStateFromDatabase(sessionId) {
    const result = await query(`
      SELECT session_data, session_type
      FROM ai_concierge_sessions
      WHERE session_id = $1
    `, [sessionId]);

    if (result.rows.length === 0) return null;

    const { session_data, session_type } = result.rows[0];

    if (!session_data) return null;

    try {
      const parsed = JSON.parse(session_data);
      return {
        ...parsed,
        currentAgent: session_type
      };
    } catch (error) {
      console.error('[State Machine Manager] Error parsing saved state:', error);
      return null;
    }
  }

  /**
   * Destroy machine when session ends
   * @param {number} contractorId
   * @param {string} sessionId
   */
  async destroyMachine(contractorId, sessionId) {
    const key = `${contractorId}-${sessionId}`;

    if (this.machines.has(key)) {
      const service = this.machines.get(key);
      service.send('SESSION_END');
      service.stop();
      this.machines.delete(key);

      console.log(`[State Machine Manager] Destroyed machine for contractor ${contractorId}`);
    }
  }
}

// Singleton instance
const stateMachineManager = new ConciergeStateMachineManager();

module.exports = stateMachineManager;
```

**2. Update AI Concierge Controller**

**File**: `tpe-backend/src/controllers/aiConciergeController.js`

Update the `routeToAgent` function (lines 50-110):

```javascript
// BEFORE (Procedural):
async function routeToAgent(contractorId) {
  try {
    const eventCheckQuery = `...`;
    const result = await query(eventCheckQuery, [contractorId]);

    if (result.rows.length > 0) {
      return { agentType: 'event', agent: getOrCreateEventAgent(), ... };
    } else {
      return { agentType: 'standard', agent: getOrCreateStandardAgent(), ... };
    }
  } catch (error) {
    // Fallback...
  }
}

// AFTER (State Machine):
const stateMachineManager = require('../services/conciergeStateMachineManager');

async function routeToAgent(contractorId, sessionId) {
  try {
    // Get event context from database
    const eventCheckQuery = `
      SELECT
        cer.event_id,
        cer.event_status,
        e.name as event_name,
        e.date as event_date
      FROM contractor_event_registrations cer
      JOIN events e ON e.id = cer.event_id
      WHERE cer.contractor_id = $1
        AND cer.event_status IN ('registered', 'checked_in', 'attending')
        AND e.date >= CURRENT_DATE - INTERVAL '1 day'
        AND e.date <= CURRENT_DATE + INTERVAL '1 day'
      ORDER BY e.date DESC
      LIMIT 1
    `;

    const result = await query(eventCheckQuery, [contractorId]);

    // Prepare event context
    const eventContext = result.rows.length > 0 ? {
      eventId: result.rows[0].event_id,
      eventName: result.rows[0].event_name,
      eventDate: result.rows[0].event_date,
      eventStatus: result.rows[0].event_status
    } : null;

    // Send MESSAGE_RECEIVED event to state machine
    await stateMachineManager.sendEvent(
      contractorId,
      sessionId,
      'MESSAGE_RECEIVED',
      { eventContext }
    );

    // Get current agent from state machine
    const agentType = await stateMachineManager.getCurrentAgent(contractorId, sessionId);

    console.log(`[AI Concierge Controller] State Machine routed to: ${agentType} agent`);

    return {
      agentType,
      agent: agentType === 'event' ? getOrCreateEventAgent() : getOrCreateStandardAgent(),
      eventId: eventContext?.eventId || null,
      sessionType: agentType,
      context: eventContext
    };
  } catch (error) {
    console.error('[AI Concierge Controller] Error in state machine routing:', error);
    // Fallback to Standard Agent
    return {
      agentType: 'standard',
      agent: getOrCreateStandardAgent(),
      eventId: null,
      sessionType: 'standard',
      context: null
    };
  }
}
```

#### Database Fields Used
**ai_concierge_sessions table:**
- `session_id` (VARCHAR) - Unique session identifier
- `session_data` (TEXT) - Stringified machine state
- `session_type` (VARCHAR) - Current agent type ('standard' or 'event')
- `updated_at` (TIMESTAMP) - Last state update

**contractor_event_registrations table:**
- `contractor_id` (INTEGER) - Contractor ID
- `event_id` (INTEGER) - Event ID
- `event_status` (VARCHAR) - Registration status

**events table:**
- `id` (INTEGER) - Event ID
- `name` (VARCHAR) - Event name
- `date` (TIMESTAMP) - Event date

#### Success Criteria
- [ ] `conciergeStateMachineManager.js` created and working
- [ ] State machine integrated into `aiConciergeController.js`
- [ ] Procedural routing replaced with state machine routing
- [ ] State persists to database after each transition
- [ ] State restores correctly when contractor resumes session
- [ ] Manual testing shows correct agent routing

---

### Day 3: Testing & Edge Cases (1 day)

#### Objectives
- Write comprehensive unit tests for state machine
- Test all state transitions
- Test edge cases (event registration mid-conversation, etc.)
- Integration testing with real agent invocations

#### Tasks

**1. Create State Machine Unit Tests**

**File**: `tpe-backend/tests/unit/conciergeStateMachine.test.js` (NEW)

Test cases:
- Initial state is 'idle'
- MESSAGE_RECEIVED transitions to 'routing'
- Routing transitions to 'standard_agent' when no event
- Routing transitions to 'event_agent' when event exists
- Guards evaluate correctly for event status
- Context updates correctly
- Actions fire correctly

**2. Create Manager Unit Tests**

**File**: `tpe-backend/tests/unit/conciergeStateMachineManager.test.js` (NEW)

Test cases:
- Manager creates machine per contractor + session
- Manager retrieves existing machine
- State persists to database correctly
- State restores from database correctly
- Current agent type returns correctly
- Machine destroyed when session ends

**3. Integration Tests**

**File**: `tpe-backend/tests/integration/stateMachineIntegration.test.js` (NEW)

Test cases:
- Full contractor conversation flow (standard agent)
- Full contractor conversation flow (event agent)
- Agent switch when event starts mid-conversation
- Agent switch when event ends mid-conversation
- State persistence across multiple API calls
- Session restoration after server restart

**4. Edge Case Testing**
- Contractor registers for event while in standard mode
- Event starts while contractor is active in conversation
- Event ends while contractor is active
- Multiple events (should use closest upcoming event)
- Event cancelled (should revert to standard mode)
- Session timeout and state restoration

#### Database Fields Used
**Test data setup uses:**
- `ai_concierge_sessions` - Test state persistence
- `contractors` - Test contractor setup
- `contractor_event_registrations` - Test event scenarios
- `events` - Test event dates and statuses

#### Success Criteria
- [ ] All unit tests passing (100% coverage on state machine logic)
- [ ] All integration tests passing
- [ ] Edge cases handled gracefully
- [ ] No memory leaks from machine instances
- [ ] State transitions logged for debugging

---

### Day 4: State Visualization & Documentation (0.5 days)

#### Objectives
- Generate visual state diagram
- Document state machine behavior
- Create troubleshooting guide

#### Tasks

**1. Generate State Diagram**

**File**: `tpe-backend/scripts/generateStateDiagram.js` (NEW)

```javascript
const { conciergeStateMachine } = require('../src/services/conciergeStateMachine');
const fs = require('fs');

// Generate Mermaid diagram
const mermaidDiagram = `
stateDiagram-v2
    [*] --> idle
    idle --> routing : MESSAGE_RECEIVED

    routing --> standard_agent : No Active Event
    routing --> event_agent : Has Active Event

    standard_agent --> routing : MESSAGE_RECEIVED
    standard_agent --> routing : EVENT_REGISTERED
    standard_agent --> idle : SESSION_END

    event_agent --> routing : MESSAGE_RECEIVED
    event_agent --> routing : EVENT_ENDED
    event_agent --> idle : SESSION_END

    idle --> [*]

    note right of standard_agent
        Business Growth Mode
        - Partner matching
        - Resource recommendations
        - General business advice
    end note

    note right of event_agent
        Event Support Mode
        - Real-time session info
        - Event-specific context
        - Still answers any question
    end note
`;

fs.writeFileSync(
  'docs/features/ai-concierge/phase-4/state-machine-diagram.mmd',
  mermaidDiagram
);

console.log('✅ State diagram generated!');
console.log('📍 View at: https://mermaid.live/');
```

**Output**: `docs/features/ai-concierge/phase-4/state-machine-diagram.mmd`

**2. Create State Machine Documentation**

**File**: `docs/features/ai-concierge/phase-4/STATE-MACHINE-GUIDE.md` (NEW)

Contents:
- Overview of state machine architecture
- All states and their purpose
- All transitions and their triggers
- All guards and their conditions
- Agent routing logic
- Troubleshooting common issues

**3. Update Technical Documentation**

**File**: `docs/features/ai-concierge/AI-CONCIERGE-HYBRID-ARCHITECTURE-RECOMMENDATION.md`

Update: Add "Phase 4 Complete ✅" badge and link to state machine guide

#### Database Fields Used
**No database interaction for visualization.**

#### Success Criteria
- [ ] State diagram generated and committed
- [ ] State machine guide written and comprehensive
- [ ] Technical docs updated with Phase 4 completion
- [ ] Diagram is readable and accurate

---

### Day 5: Production Deployment & Validation (1 day)

#### Objectives
- Deploy state machine to production
- Validate state machine behavior in production
- Monitor for any issues
- Document rollback plan

#### Tasks

**1. Pre-Deployment Checklist**
- [ ] All tests passing in development
- [ ] State machine verified in local testing
- [ ] Database schema matches production (verify with Pre-Flight Checklist)
- [ ] Environment variables set (none needed for XState)
- [ ] Rollback plan documented

**2. Deploy to Production**
```bash
# 1. Commit all changes
git add .
git commit -m "feat: Phase 4 - XState State Machine Integration Complete

- Implemented XState state machine for agent routing
- Replaced procedural routing with declarative state management
- Added state persistence to ai_concierge_sessions table
- Created state machine manager service
- Comprehensive testing suite with unit + integration tests
- State diagram generated for documentation"

# 2. Push to production
git push origin master

# 3. Wait for deployment to complete (~13-14 minutes)

# 4. Verify backend restart
# Check PM2 logs on production
```

**3. Production Validation**
Test scenarios:
- [ ] Standard agent conversation (contractor not at event)
- [ ] Event agent conversation (contractor at event)
- [ ] State persistence across multiple messages
- [ ] Session restoration after server restart
- [ ] Check LangSmith traces for state machine decisions
- [ ] Monitor error logs for state machine issues

**4. Production Monitoring**
```bash
# Check backend logs:
ssh production
pm2 logs tpe-backend --lines 100 | grep -i "state machine"

# Check for errors:
pm2 logs tpe-backend --lines 100 | grep -i "error"

# Verify state persistence:
# Use mcp__aws-production__exec tool to query database
```

**5. Rollback Plan (If Needed)**
```bash
# If issues occur:
git revert HEAD
git push origin master

# Or restore previous version:
git reset --hard <previous-commit-hash>
git push origin master --force
```

#### Database Fields Used
**Production verification:**
- `ai_concierge_sessions.session_data` - Verify state persistence
- `ai_concierge_sessions.session_type` - Verify agent tracking

**Production Database Check (MANDATORY):**
```bash
# Verify production has ai_concierge_sessions table:
# Use mcp__aws-production__exec tool:
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions';"
```

#### Success Criteria
- [ ] State machine deployed to production
- [ ] All production validation tests pass
- [ ] No errors in production logs
- [ ] State persistence working in production
- [ ] LangSmith traces show state machine integration
- [ ] Rollback plan documented and tested (in case of issues)

---

## 📊 Final Architecture After Phase 4

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI CONCIERGE REQUEST                        │
│                 (Contractor sends message)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              AI CONCIERGE CONTROLLER                            │
│  - Receives message                                             │
│  - Gets event context from database                             │
│  - Calls State Machine Manager                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           STATE MACHINE MANAGER                                 │
│  - getOrCreateMachine(contractorId, sessionId)                  │
│  - sendEvent('MESSAGE_RECEIVED', { eventContext })              │
│  - Loads/restores state from database                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 XSTATE STATE MACHINE                            │
│  ┌──────────┐    MESSAGE_RECEIVED    ┌──────────┐              │
│  │   idle   │ ──────────────────────▶ │ routing  │              │
│  └──────────┘                         └─────┬────┘              │
│                                             │                    │
│                     ┌───────────────────────┴─────────────┐     │
│                     │ Guards Evaluate                     │     │
│                     │ - hasActiveEvent?                    │     │
│                     ▼                                     ▼     │
│         ┌────────────────────┐              ┌──────────────────┐│
│         │  standard_agent    │              │   event_agent    ││
│         │ (No active event)  │              │ (Active event)   ││
│         │                    │              │                  ││
│         │ Returns: Standard  │              │ Returns: Event   ││
│         │ Agent instance     │              │ Agent instance   ││
│         └────────────────────┘              └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           AGENT EXECUTION (Phase 2)                             │
│  Standard Agent OR Event Agent                                  │
│  - Uses tools (Phase 2)                                         │
│  - Protected by guards (Phase 3)                                │
│  - Traced by LangSmith & OpenAI Tracer (Phase 3)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│        STATE PERSISTENCE (Phase 4)                              │
│  - persistState() saves to ai_concierge_sessions.session_data   │
│  - session_type updated with current agent                      │
│  - State restored on next message                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE TO CONTRACTOR                       │
│  - State persisted to database                                  │
│  - Ready for next message                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Schema Reference

### ai_concierge_sessions Table
**Used for state persistence (VERIFY EXACT NAMES IN PRE-FLIGHT CHECKLIST)**

```sql
-- EXPECTED SCHEMA (to be verified):
CREATE TABLE ai_concierge_sessions (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  session_type VARCHAR(50),  -- 'standard' or 'event'
  session_status VARCHAR(50), -- 'active', 'completed', 'ended'
  session_data TEXT,  -- Stringified XState machine state (NEW: stores state machine)
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Phase 4 Changes:**
- `session_data` now stores XState machine state (previously stored LangGraph state)
- `session_type` still tracks current agent ('standard' or 'event')
- No new fields required

---

## ✅ Phase 4 Success Criteria Summary

### Code Implementation
- [ ] XState installed and configured
- [ ] State machine defined with all states, transitions, guards
- [ ] State machine manager service created
- [ ] AI Concierge Controller updated to use state machine
- [ ] Procedural routing completely removed
- [ ] State persistence implemented
- [ ] Event context passed to state machine guards

### Testing
- [ ] All unit tests passing (state machine logic)
- [ ] All integration tests passing (with agents)
- [ ] Edge cases tested and handled
- [ ] Manual testing in development successful

### Documentation
- [ ] State diagram generated
- [ ] State machine guide written
- [ ] Technical docs updated
- [ ] Troubleshooting guide created

### Production
- [ ] Deployed to production successfully
- [ ] Production validation tests pass
- [ ] No errors in production logs
- [ ] State persistence working in production
- [ ] Rollback plan documented

---

## 📚 Key Files to Create or Update

### New Files
1. `tpe-backend/src/services/conciergeStateMachine.js` - XState machine definition
2. `tpe-backend/src/services/conciergeStateMachineManager.js` - Manager service
3. `tpe-backend/scripts/generateStateDiagram.js` - Diagram generation script
4. `tpe-backend/tests/unit/conciergeStateMachine.test.js` - Unit tests
5. `tpe-backend/tests/unit/conciergeStateMachineManager.test.js` - Manager tests
6. `tpe-backend/tests/integration/stateMachineIntegration.test.js` - Integration tests
7. `docs/features/ai-concierge/phase-4/STATE-MACHINE-GUIDE.md` - User guide
8. `docs/features/ai-concierge/phase-4/state-machine-diagram.mmd` - Visual diagram

### Updated Files
1. `tpe-backend/src/controllers/aiConciergeController.js` - Integrate state machine (lines 50-110)
2. `docs/features/ai-concierge/AI-CONCIERGE-HYBRID-ARCHITECTURE-RECOMMENDATION.md` - Mark Phase 4 complete

---

**Last Updated:** October 15, 2025
**Status:** Ready for Day 1 implementation
**Next Step:** Complete Phase 4 Pre-Flight Checklist BEFORE creating any files
