// DATABASE-CHECKED: No database operations
// Dynamic Mermaid Diagram Generator from XState Machine Configuration

const { conciergeStateMachine } = require('./conciergeStateMachine');

/**
 * Generate Mermaid diagram from XState machine configuration
 * @returns {string} Mermaid diagram code
 */
function generateMermaidDiagram() {
  const machine = conciergeStateMachine;

  // Start diagram
  let diagram = 'stateDiagram-v2\n';
  diagram += '    [*] --> idle\n\n';

  // Get all states from machine config
  const states = machine.config.states;

  // Generate transitions
  Object.entries(states).forEach(([stateName, stateConfig]) => {
    // Handle regular transitions (on events)
    if (stateConfig.on) {
      Object.entries(stateConfig.on).forEach(([event, transition]) => {
        // Handle simple string targets
        if (typeof transition === 'string') {
          diagram += `    ${stateName} --> ${transition} : ${event}\n`;
        }
        // Handle transition objects with actions but no target (self-transition)
        else if (transition.actions && !transition.target) {
          diagram += `    ${stateName} --> ${stateName} : ${event}\n`;
        }
        // Handle transition objects with target
        else if (transition.target) {
          diagram += `    ${stateName} --> ${transition.target} : ${event}\n`;
        }
      });
    }

    // Handle "always" transitions (guarded transitions)
    if (stateConfig.always) {
      stateConfig.always.forEach((transition) => {
        const guardName = transition.guard || 'default';
        const target = transition.target;

        if (guardName === 'hasActiveEvent') {
          diagram += `    ${stateName} --> ${target} : Has Active Event (hasActiveEvent = true)\n`;
        } else if (guardName === 'default' || !transition.guard) {
          diagram += `    ${stateName} --> ${target} : No Active Event (hasActiveEvent = false)\n`;
        }
      });
    }
  });

  // Add return to initial
  diagram += '\n    idle --> [*]\n\n';

  // Add state notes/descriptions
  diagram += `    note right of idle
        Waiting State
        - Machine starts here
        - No agent active
        - Awaits first message
    end note

    note right of routing
        Decision State
        - Evaluates guards
        - Checks event context
        - Routes to appropriate agent
        - Always transitions immediately
    end note

    note right of standard_agent
        Standard Agent Mode
        - Business growth focus
        - Partner matching
        - Resource recommendations
        - General business advice

        Context: No active event today
    end note

    note right of event_agent
        Event Agent Mode
        - Event-specific support
        - Real-time session info
        - Event context awareness
        - Still answers any question

        Context: Active event today
    end note
`;

  return diagram;
}

/**
 * Get machine metadata for documentation
 * @returns {object} Machine metadata
 */
function getMachineMetadata() {
  const machine = conciergeStateMachine;
  const states = machine.config.states;

  const metadata = {
    machineId: machine.config.id,
    initialState: machine.config.initial,
    states: {},
    events: new Set(),
    guards: []
  };

  // Extract state information
  Object.entries(states).forEach(([stateName, stateConfig]) => {
    metadata.states[stateName] = {
      description: stateConfig.meta?.description || '',
      agentType: stateConfig.meta?.agentType || null,
      transitions: []
    };

    // Collect events
    if (stateConfig.on) {
      Object.keys(stateConfig.on).forEach(event => {
        metadata.events.add(event);
        metadata.states[stateName].transitions.push({
          event,
          type: 'regular'
        });
      });
    }

    // Collect guarded transitions
    if (stateConfig.always) {
      stateConfig.always.forEach(transition => {
        if (transition.guard) {
          metadata.guards.push(transition.guard);
          metadata.states[stateName].transitions.push({
            guard: transition.guard,
            target: transition.target,
            type: 'guarded'
          });
        }
      });
    }
  });

  metadata.events = Array.from(metadata.events);
  metadata.guards = Array.from(new Set(metadata.guards));

  return metadata;
}

module.exports = {
  generateMermaidDiagram,
  getMachineMetadata
};
