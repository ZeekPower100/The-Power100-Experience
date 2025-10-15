// DATABASE-CHECKED: ai_concierge_sessions, contractor_event_registrations, events verified October 15, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_event_registrations.event_status: NO CHECK CONSTRAINT (can use any string value)
// ================================================================
// VERIFIED FIELD NAMES:
// - ai_concierge_sessions.session_id (NOT sessionId)
// - ai_concierge_sessions.session_data (NOT sessionData)
// - ai_concierge_sessions.session_type (NOT sessionType)
// - contractor_event_registrations.contractor_id (NOT contractorId)
// - contractor_event_registrations.event_id (NOT eventId)
// - contractor_event_registrations.event_status (NOT eventStatus)
// - events.date (NOT start_date, NOT startDate) - TYPE: date (not timestamp)
// - events.end_date (NOT endDate) - TYPE: date (not timestamp)
// ================================================================
// VERIFIED DATA TYPES:
// - session_data: TEXT (store JSON.stringify(state))
// - session_type: VARCHAR (plain text: 'standard' or 'event')
// - event_status: VARCHAR (no constraint - checking for: 'registered', 'checked_in', 'attending')
// - date: DATE (event start date)
// - end_date: DATE (event end date)
// - contractor_id: INTEGER
// - event_id: INTEGER
// ================================================================
// STATE MACHINE GUARDS:
// - hasActiveEvent: Checks event_status IN ('registered', 'checked_in', 'attending')
// - eventIsToday: Checks date is today
// ================================================================

const { createMachine, assign } = require('xstate');

/**
 * AI Concierge State Machine
 *
 * Manages agent routing between Standard Agent and Event Agent
 * based on contractor's event registration status.
 *
 * States:
 * - idle: Waiting for message
 * - routing: Determining which agent to use
 * - standard_agent: Using Standard Agent (business growth focus)
 * - event_agent: Using Event Agent (event context focus)
 *
 * Guards:
 * - hasActiveEvent: Check if contractor has event registration with event today
 *
 * Context:
 * - contractorId: integer
 * - eventContext: null | { eventId, eventName, eventDate, eventStatus }
 * - currentAgent: 'standard' | 'event'
 * - lastTransition: timestamp
 * - sessionId: string
 */
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
    /**
     * Check if contractor has active event registration
     * Database fields used:
     * - contractor_event_registrations.event_status (VARCHAR, no CHECK constraint)
     * - contractor_event_registrations.event_date (DATE)
     * - events.date (DATE)
     */
    hasActiveEvent: (context) => {
      if (!context.eventContext) {
        return false;
      }

      const { eventDate, eventStatus } = context.eventContext;

      // Check if event status indicates active attendance
      // Using values we found in controller: 'registered', 'checked_in', 'attending'
      const activeStatuses = ['registered', 'checked_in', 'attending'];
      const isActiveStatus = activeStatuses.includes(eventStatus);

      if (!isActiveStatus) {
        return false;
      }

      // Check if event is today
      const now = new Date();
      const eventDay = new Date(eventDate);

      // Compare dates (ignore time component)
      const isToday = eventDay.toDateString() === now.toDateString();

      return isToday;
    }
  },

  actions: {
    /**
     * Set Standard Agent as current agent
     */
    setStandardAgent: assign({
      currentAgent: 'standard',
      lastTransition: () => new Date().toISOString()
    }),

    /**
     * Set Event Agent as current agent
     */
    setEventAgent: assign({
      currentAgent: 'event',
      lastTransition: () => new Date().toISOString()
    }),

    /**
     * Log entry into Standard Agent state
     */
    logStandardAgentEntry: (context) => {
      console.log(`[State Machine] → STANDARD AGENT for contractor ${context.contractorId}`);
    },

    /**
     * Log entry into Event Agent state
     */
    logEventAgentEntry: (context) => {
      console.log(`[State Machine] → EVENT AGENT for contractor ${context.contractorId} at ${context.eventContext?.eventName || 'unknown event'}`);
    }
  }
});

module.exports = { conciergeStateMachine };
