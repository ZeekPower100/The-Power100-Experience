// DATABASE-CHECKED: ai_concierge_sessions, contractor_event_registrations, events verified October 15, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_sessions.session_type: NO CHECK CONSTRAINT (can use 'standard' or 'event')
// - ai_concierge_sessions.session_status: NO CHECK CONSTRAINT
// - contractor_event_registrations.event_status: NO CHECK CONSTRAINT (can use any values)
// ================================================================
// VERIFIED FIELD NAMES:
// - ai_concierge_sessions.session_id (NOT sessionId)
// - ai_concierge_sessions.session_data (NOT sessionData)
// - ai_concierge_sessions.session_type (NOT sessionType)
// - contractor_event_registrations.contractor_id (NOT contractorId)
// - contractor_event_registrations.event_id (NOT eventId)
// - contractor_event_registrations.event_name (NOT eventName) - EXISTS AT TABLE LEVEL
// - contractor_event_registrations.event_date (NOT eventDate) - EXISTS AT TABLE LEVEL
// - contractor_event_registrations.event_status (NOT eventStatus)
// - events.name (NOT event_name at SELECT level)
// - events.date (NOT start_date, NOT eventDate) - TYPE: date (not timestamp)
// ================================================================
// VERIFIED DATA TYPES:
// - session_data: TEXT (use JSON.stringify before storing)
// - session_type: VARCHAR (plain text: 'standard' or 'event')
// - event_status: VARCHAR (no constraint - can use any values)
// - event_date: DATE (at contractor_event_registrations level)
// - date: DATE (at events table level)
// ================================================================

const { createActor } = require('xstate');
const { conciergeStateMachine } = require('./conciergeStateMachine');
const { query } = require('../config/database');

/**
 * State Machine Manager
 * Manages XState machine instances per contractor
 * Handles state persistence and restoration
 */
class ConciergeStateMachineManager {
  constructor() {
    this.machines = new Map(); // key: contractorId-sessionId -> machine service
  }

  /**
   * Get or create machine for contractor or member
   * @param {number} contractorId
   * @param {string} sessionId
   * @param {number} [memberId] - Inner Circle member ID (if member session)
   * @returns {Promise<object>} Machine service
   */
  async getOrCreateMachine(contractorId, sessionId, memberId = null) {
    const key = memberId ? `member-${memberId}-${sessionId}` : `${contractorId}-${sessionId}`;

    if (this.machines.has(key)) {
      return this.machines.get(key);
    }

    // Check if we can restore state from database
    const savedState = await this.loadStateFromDatabase(sessionId);

    // XState v5: Create actor with initial context
    const actor = createActor(conciergeStateMachine, {
      input: {
        contractorId,
        memberId,
        memberContext: savedState?.memberContext || null,
        sessionId,
        eventContext: savedState?.eventContext || null,
        currentAgent: savedState?.currentAgent || null,
        lastTransition: savedState?.lastTransition || null
      }
    });

    // Start the actor
    actor.start();

    // If we have saved state, restore it by triggering routing
    if (savedState?.state && savedState.state !== 'idle') {
      console.log(`[State Machine Manager] Restoring state: ${savedState.state} for contractor ${contractorId}`);

      // First, update the event context in the machine
      if (savedState.context?.eventContext) {
        actor.send({
          type: 'UPDATE_EVENT_CONTEXT',
          eventContext: savedState.context.eventContext
        });
      }

      // Then trigger MESSAGE_RECEIVED to force re-routing based on restored context
      // This will evaluate guards and transition to correct agent state
      actor.send({ type: 'MESSAGE_RECEIVED' });

      console.log(`[State Machine Manager] State restored to: ${actor.getSnapshot().value}`);
    }

    this.machines.set(key, actor);

    const entityLabel = memberId ? `member ${memberId}` : `contractor ${contractorId}`;
    console.log(`[State Machine Manager] Created new machine for ${entityLabel}, session ${sessionId}`);

    return actor;
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
      // Update the machine's context with new event context
      service.send({
        type: 'UPDATE_CONTEXT',
        eventContext: eventData.eventContext
      });
    }

    // Send the main event
    service.send({ type: eventName });

    // Persist state after transition
    await this.persistState(contractorId, sessionId, service);
  }

  /**
   * Get current agent type for contractor
   * @param {number} contractorId
   * @param {string} sessionId
   * @returns {Promise<'standard'|'event'|'inner_circle'|null>}
   */
  async getCurrentAgent(contractorId, sessionId, memberId = null) {
    const service = await this.getOrCreateMachine(contractorId, sessionId, memberId);
    const state = service.getSnapshot();

    if (state.matches('standard_agent')) return 'standard';
    if (state.matches('event_agent')) return 'event';
    if (state.matches('inner_circle_agent')) return 'inner_circle';

    // If in idle or routing, return null
    return null;
  }

  /**
   * Update event context in machine
   * This is called before routing to update the guard data
   * @param {number} contractorId
   * @param {string} sessionId
   * @param {object|null} eventContext
   */
  async updateEventContext(contractorId, sessionId, eventContext) {
    const actor = await this.getOrCreateMachine(contractorId, sessionId);

    // Send UPDATE_EVENT_CONTEXT event to trigger assign action
    actor.send({
      type: 'UPDATE_EVENT_CONTEXT',
      eventContext: eventContext
    });

    console.log(`[State Machine Manager] Updated event context for contractor ${contractorId}:`, eventContext ? 'Event active' : 'No event');
  }

  /**
   * Persist machine state to database
   * DATABASE VERIFIED: session_data is TEXT (needs JSON.stringify)
   * DATABASE VERIFIED: session_type is VARCHAR (plain text)
   * OPTIMIZED: Uses UPSERT for better performance (Phase 5 Day 2)
   * @param {number} contractorId
   * @param {string} sessionId
   * @param {object} service - Machine service
   */
  async persistState(contractorId, sessionId, service) {
    const snapshot = service.getSnapshot();
    const memberId = snapshot.context.memberId;

    const stateData = {
      state: snapshot.value,
      context: snapshot.context,
      timestamp: new Date().toISOString()
    };

    // DATABASE VERIFIED FIELD NAMES: session_data, session_type, session_id, contractor_id, member_id
    // Phase 5 Optimization: Use UPSERT (INSERT ON CONFLICT) for better performance
    await query(`
      INSERT INTO ai_concierge_sessions
        (session_id, contractor_id, member_id, session_data, session_type, started_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET
        session_data = EXCLUDED.session_data,
        session_type = EXCLUDED.session_type,
        member_id = EXCLUDED.member_id,
        updated_at = NOW()
    `, [
      sessionId,
      contractorId,
      memberId || null,
      JSON.stringify(stateData),  // TEXT field - JSON.stringify required
      snapshot.context.currentAgent || 'standard'  // VARCHAR field - plain text
    ]);

    const entityLabel = memberId ? `member ${memberId}` : `contractor ${contractorId}`;
    console.log(`[State Machine Manager] Persisted state for ${entityLabel}, agent: ${snapshot.context.currentAgent}`);
  }

  /**
   * Load state from database
   * DATABASE VERIFIED: session_data is TEXT (needs JSON.parse)
   * DATABASE VERIFIED: session_type is VARCHAR
   * @param {string} sessionId
   * @returns {Promise<object|null>}
   */
  async loadStateFromDatabase(sessionId) {
    // DATABASE VERIFIED FIELD NAMES: session_data, session_type, session_id
    const result = await query(`
      SELECT session_data, session_type
      FROM ai_concierge_sessions
      WHERE session_id = $1
    `, [sessionId]);

    if (result.rows.length === 0) return null;

    const { session_data, session_type } = result.rows[0];

    if (!session_data) return null;

    try {
      const parsed = JSON.parse(session_data);  // TEXT field - JSON.parse required
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
      const actor = this.machines.get(key);
      // XState v5: Send event as object
      actor.send({ type: 'SESSION_END' });
      actor.stop();
      this.machines.delete(key);

      console.log(`[State Machine Manager] Destroyed machine for contractor ${contractorId}`);
    }
  }

  /**
   * Get current state for debugging
   * @param {number} contractorId
   * @param {string} sessionId
   * @returns {Promise<string>}
   */
  async getCurrentState(contractorId, sessionId) {
    const service = await this.getOrCreateMachine(contractorId, sessionId);
    const state = service.getSnapshot();
    return state.value;
  }
}

// Singleton instance
const stateMachineManager = new ConciergeStateMachineManager();

module.exports = stateMachineManager;
