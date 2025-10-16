// State Diagram Generator for AI Concierge State Machine
// Generates Mermaid diagram for visual documentation

const fs = require('fs');
const path = require('path');

// Generate Mermaid diagram
const mermaidDiagram = `stateDiagram-v2
    [*] --> idle

    idle --> routing : MESSAGE_RECEIVED
    idle --> idle : UPDATE_EVENT_CONTEXT

    routing --> standard_agent : No Active Event (hasActiveEvent = false)
    routing --> event_agent : Has Active Event (hasActiveEvent = true)
    routing --> routing : UPDATE_EVENT_CONTEXT

    standard_agent --> routing : MESSAGE_RECEIVED
    standard_agent --> routing : EVENT_REGISTERED
    standard_agent --> idle : SESSION_END
    standard_agent --> standard_agent : UPDATE_EVENT_CONTEXT

    event_agent --> routing : MESSAGE_RECEIVED
    event_agent --> routing : EVENT_ENDED
    event_agent --> idle : SESSION_END
    event_agent --> event_agent : UPDATE_EVENT_CONTEXT

    idle --> [*]

    note right of idle
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

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../../docs/features/ai-concierge/phase-4');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the diagram
const outputPath = path.join(outputDir, 'state-machine-diagram.mmd');
fs.writeFileSync(outputPath, mermaidDiagram);

console.log('✅ State diagram generated!');
console.log('📍 Location:', outputPath);
console.log('📊 View at: https://mermaid.live/');
console.log('\n💡 To view the diagram:');
console.log('   1. Copy the contents of state-machine-diagram.mmd');
console.log('   2. Paste into https://mermaid.live/');
console.log('   3. Or use a Mermaid plugin in your IDE');
