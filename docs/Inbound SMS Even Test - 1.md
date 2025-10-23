[SMS] Inbound message received: {
  phone: '+18108934075',
  message_content: "Didn't you ask me about the sponsors I visited?",
  ghl_contact_id: 'tM5OabD8WqIUYIhRePz6',
  ghl_location_id: 'Jlq8gw3IEjAQu39n4c0s',
  direction: 'inbound',
  timestamp: '2025-10-21T02:29:32.943Z',
  raw_webhook_data: {
    contact_id: 'tM5OabD8WqIUYIhRePz6',
    first_name: 'Zeek',
    last_name: 'Test',
    full_name: 'Zeek Test',
    email: 'zeek@power100.io',
    phone: '+18108934075',
    tags: 'tpe-contractor,event-attendee,tpe-dev',
    country: 'US',
    date_created: '2025-09-30T23:20:45.976Z',
    full_address: '',
    contact_type: 'lead',
    location: {
      name: 'Next100',
      address: '2401 West Bay Drive Suite 321',
      city: 'Largo',
      state: 'FL',
      country: 'US',
      postalCode: '33770',
      fullAddress: '2401 West Bay Drive Suite 321, Largo FL 33770',
      id: 'Jlq8gw3IEjAQu39n4c0s'
    },
    message: {
      type: 2,
      body: "Didn't you ask me about the sponsors I visited?"
    },
    workflow: {
      id: '07d75ad9-e5b9-40ac-8c6c-433f28311eb5',
      name: 'SMS Replies Sent To n8n-1'
    },
    triggerData: {},
    customData: { Direction: 'Inbound' }
  }
}
[SMS] Contractor found: 56 Zeek Test
[AIRouter] Classifying intent for message: Didn't you ask me about the sponsors I visited?
[AIRouter] Checking database context for contractor: 56
[AIRouter] Found 5 pending messages
[AIRouter] Message types: post_event_wrap_up, sponsor_general_inquiry, sponsor_batch_check, sponsor_recommendation, attendance_check
[ConversationContext] Building context for contractor 56
[AI Classifier] Sending to GPT-4...
[AI Classifier] GPT-4 Response: {
  "intent": "User inquiring about previous sponsor interactions",
  "route": "sponsor_details",
  "confidence": 0.95,
  "reasoning": "The user's message directly references a previous inquiry about sponsors, aligning with the rule that if a user asks about sponsors or booths, the message should be routed to 'sponsor_details'."
}
[AI Classifier] Result: sponsor_details (95% confidence) in 4102ms
[AIRouter] AI routing found: sponsor_details confidence: 0.95
[SMS] Classification result: {
  classified_intent: 'User inquiring about previous sponsor interactions',
  confidence: 0.95,
  routing_method: 'ai',
  route_to: 'sponsor_details',
  ai_reasoning: "The user's message directly references a previous inquiry about sponsors, aligning with the rule that if a user asks about sponsors or booths, the message should be routed to 'sponsor_details'.",
  ai_model_used: 'gpt-4-turbo',
  context_data: {
    contractor: {
      id: 56,
      name: 'Zeek Test',
      company_name: 'Zeek Co',
      email: 'zeek@power100.io',
      phone: '+18108934075'
    },
    event: {
      id: 56,
      event_name: 'Business Growth Expo 2025',
      event_date: 2025-10-20T04:00:00.000Z,
      day_date: 2025-10-21T04:00:00.000Z,
      start_time: '20:14:27',
      end_time: '20:32:27',
      event_start_timestamp: 2025-10-22T00:14:27.000Z,
      event_end_timestamp: 2025-10-22T00:32:27.000Z,
      time_distance: '78293.681379'
    }
  },
  processing_time_ms: 4122
}
[Routing Metrics] ⚠️  Slow routing detected: 4122ms (target: 2000ms)
[SponsorHandler] Processing sponsor details request: Didn't you ask me about the sponsors I visited?
[SponsorHandler] Not a sponsor number - routing to AI Concierge for general sponsor question
Database query error: error: operator does not exist: integer = text
    at C:\Users\broac\CascadeProjects\The-Power100-Experience\node_modules\pg-pool\index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async query (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\config\database.postgresql.js:33:20)
    at async AIConcierge.getConversations (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\models\aiConcierge.js:90:22)
    at async Object.generateAIResponse (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\controllers\aiConciergeController.js:789:35)
    at async handleSponsorDetails (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\services\eventOrchestrator\sponsorHandlers.js:49:26)
    at async AIRouter.route (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\services\aiRouter.js:417:22)
    at async handleInbound (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\controllers\smsController.js:574:27) {
  length: 200,
  severity: 'ERROR',
  code: '42883',
  detail: undefined,
  hint: 'No operator matches the given name and argument types. You might need to add explicit type casts.',
  position: '781',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_oper.c',
  line: '656',
  routine: 'op_error'
}
[SponsorHandler] Error handling sponsor details: Error: Error fetching conversations: operator does not exist: integer = text
    at AIConcierge.getConversations (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\models\aiConcierge.js:93:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Object.generateAIResponse (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\controllers\aiConciergeController.js:789:35)
    at async handleSponsorDetails (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\services\eventOrchestrator\sponsorHandlers.js:49:26)
    at async AIRouter.route (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\services\aiRouter.js:417:22)
    at async handleInbound (C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\controllers\smsController.js:574:27)
69.62.66.214 - - [21/Oct/2025:02:29:37 +0000] "POST /api/sms/inbound HTTP/1.1" 200 237 "-" "axios/1.8.3"
Saved interaction 7c2cd209-8f6a-4116-8e8f-f75b4c35903f locally
Saved interaction 96422309-16dd-417a-85c1-7d3acb8541f7 locally