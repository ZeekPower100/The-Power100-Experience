# Event Orchestrator Enhancement - Todo List

## 🎯 GOAL
Enable AI Concierge to deliver 100% of Greg's vision for interactive event orchestration, note-taking, priority management, and proactive follow-ups.

**Estimated Total Time:** 23 hours (~3 days)

---

## 📋 ENHANCEMENT #1: System Prompt Update (4 hours)

### **Objective:** Make AI ask the right questions and recognize event context

- [ ] **1.1** Read current system prompt in `openAIService.js` (line 639)
- [ ] **1.2** Add EVENT DETECTION section to system prompt
  - [ ] Add event status detection (pre-event, during-event, post-event)
  - [ ] Add event context display (name, date, location)
  - [ ] Add "Event Orchestrator mode" description
- [ ] **1.3** Add NOTE-TAKING INSTRUCTIONS section
  - [ ] Add note detection patterns (names, contact info, insights)
  - [ ] Add clarifying questions ("What session are you in?")
  - [ ] Add entity extraction instructions (names, phones, emails)
  - [ ] Add natural response examples
- [ ] **1.4** Add SESSION AWARENESS section
  - [ ] Add event schedule context
  - [ ] Add current session references
  - [ ] Add upcoming session suggestions
- [ ] **1.5** Add POST-EVENT PRIORITY EXTRACTION section
  - [ ] Add priority question ("What are your top 3 priorities?")
  - [ ] Add priority extraction instructions
  - [ ] Add follow-up creation guidance
  - [ ] Add example conversation flow
- [ ] **1.6** Add FOLLOW-UP SCHEDULING section
  - [ ] Add check-in timing suggestions
  - [ ] Add natural follow-up language examples
  - [ ] Add proactive behavior instructions
- [ ] **1.7** Add EMAIL INTRODUCTION ASSISTANCE section
  - [ ] Add opportunity detection (when to offer help)
  - [ ] Add email draft template
  - [ ] Add offer assistance language
- [ ] **1.8** Add NON-EVENT PARTNER RECOMMENDATIONS section
  - [ ] Add timing guidance (2-3 weeks post-event)
  - [ ] Add recommendation template
  - [ ] Add partner linking instructions
- [ ] **1.9** Add CONTINUOUS ENGAGEMENT section
  - [ ] Add event reference examples
  - [ ] Add momentum building instructions
  - [ ] Add long-term context maintenance

### **Testing Checklist:**
- [ ] **T1.1** AI detects when contractor shares a note vs asks a question
- [ ] **T1.2** AI asks "What session are you in?" when context unclear
- [ ] **T1.3** AI extracts names, phones, emails from conversation
- [ ] **T1.4** AI asks "What are your top 3 priorities?" post-event
- [ ] **T1.5** AI offers to draft email introductions
- [ ] **T1.6** AI suggests check-in times for action items
- [ ] **T1.7** AI references event context in ongoing conversations

### **Files Modified:**
- `tpe-backend/src/services/openAIService.js`

---

## 📋 ENHANCEMENT #2: Function Calling for Database Writes (10 hours)

### **Objective:** Enable AI to write to database tables

### **Phase 2A: Create Service Layer (4 hours)**

- [ ] **2A.1** Create `eventNoteService.js`
  - [ ] Add DATABASE-CHECKED header with table verification
  - [ ] Implement `captureEventNote()` function
    - [ ] Accept all required parameters (eventId, contractorId, noteText, etc.)
    - [ ] Build INSERT query with proper field mapping
    - [ ] Handle JSONB fields (extracted_entities, ai_tags)
    - [ ] Return created note object
  - [ ] Implement `getEventNotes()` function
    - [ ] Query notes by event and contractor
    - [ ] Order by captured_at DESC
    - [ ] Return array of notes
  - [ ] Export all functions
  - [ ] Add inline documentation

- [ ] **2A.2** Create `actionItemService.js`
  - [ ] Add DATABASE-CHECKED header with table verification
  - [ ] Implement `createActionItem()` function
    - [ ] Accept all required parameters
    - [ ] Build INSERT query with proper field mapping
    - [ ] Handle JSONB conversation_context field
    - [ ] Set ai_generated = true
    - [ ] Return created action item
  - [ ] Implement `updateActionItemStatus()` function
    - [ ] Log update to action_item_updates table FIRST
    - [ ] Update contractor_action_items status
    - [ ] Set completed_at if status = 'completed'
    - [ ] Return updated action item
  - [ ] Implement `getPendingActionItems()` function
    - [ ] Query by contractor_id and status = 'pending'
    - [ ] Order by priority ASC, due_date ASC NULLS LAST
    - [ ] Limit results
    - [ ] Return array of action items
  - [ ] Export all functions
  - [ ] Add inline documentation

- [ ] **2A.3** Create `followUpService.js`
  - [ ] Add DATABASE-CHECKED header with table verification
  - [ ] Implement `scheduleFollowUp()` function
    - [ ] Accept all required parameters
    - [ ] Build INSERT query with proper field mapping
    - [ ] Handle JSONB ai_context_hints field
    - [ ] Set status = 'scheduled'
    - [ ] Return created follow-up schedule
  - [ ] Implement `getPendingFollowUps()` function
    - [ ] Query scheduled follow-ups with time check
    - [ ] JOIN contractors table for phone/name
    - [ ] LEFT JOIN action_items for status check
    - [ ] Filter out completed action items if skip_if_completed = true
    - [ ] Order by scheduled_time ASC
    - [ ] Return array with contractor details
  - [ ] Implement `markFollowUpSent()` function
    - [ ] Update status to 'sent'
    - [ ] Set sent_at timestamp
    - [ ] Store response_text if provided
    - [ ] Return updated follow-up
  - [ ] Export all functions
  - [ ] Add inline documentation

### **Phase 2B: Add Function Calling to OpenAI Service (3 hours)**

- [ ] **2B.1** Update `openAIService.js` imports
  - [ ] Import eventNoteService
  - [ ] Import actionItemService
  - [ ] Import followUpService

- [ ] **2B.2** Define function schemas
  - [ ] Add `capture_event_note` function schema
    - [ ] Define all parameters (note_text, extracted_names, etc.)
    - [ ] Set required fields
    - [ ] Add descriptions for each parameter
  - [ ] Add `create_action_item` function schema
    - [ ] Define all parameters (title, action_type, priority, etc.)
    - [ ] Set required fields (title, action_type)
    - [ ] Add enum constraints for action_type
  - [ ] Add `schedule_followup` function schema
    - [ ] Define parameters (action_item_id, days_from_now, etc.)
    - [ ] Add followup_type enum
    - [ ] Add context_hints object structure
  - [ ] Add `update_action_item_status` function schema
    - [ ] Define parameters (action_item_id, new_status, update_note)
    - [ ] Add status enum constraints

- [ ] **2B.3** Update OpenAI API call
  - [ ] Add `tools` array to chat completion request
  - [ ] Set `tool_choice: "auto"`
  - [ ] Maintain existing temperature and max_tokens

- [ ] **2B.4** Implement function call handler
  - [ ] Check if response contains tool_calls
  - [ ] Loop through each tool call
  - [ ] Parse function arguments (handle JSON parse errors)
  - [ ] Implement switch statement for each function:
    - [ ] **Case: capture_event_note**
      - [ ] Get active event context for contractor
      - [ ] Build extracted_entities object from function args
      - [ ] Call eventNoteService.captureEventNote()
      - [ ] Log success
      - [ ] Handle errors gracefully
    - [ ] **Case: create_action_item**
      - [ ] Get event context if available
      - [ ] Call actionItemService.createActionItem()
      - [ ] Log created action item ID
      - [ ] Handle errors gracefully
    - [ ] **Case: schedule_followup**
      - [ ] Calculate scheduled_time (now + days_from_now)
      - [ ] Call followUpService.scheduleFollowUp()
      - [ ] Log success
      - [ ] Handle errors gracefully
    - [ ] **Case: update_action_item_status**
      - [ ] Call actionItemService.updateActionItemStatus()
      - [ ] Log success
      - [ ] Handle errors gracefully
  - [ ] Continue with AI response after function calls

- [ ] **2B.5** Create helper function `getActiveEventForContractor()`
  - [ ] Query event_attendees and events tables
  - [ ] Check date ranges for event status
  - [ ] Return event_id, name, date, status
  - [ ] Return null if no active event

### **Testing Checklist:**
- [ ] **T2.1** AI captures note when contractor shares information
- [ ] **T2.2** Verify `event_notes` table populated with correct data
- [ ] **T2.3** Verify extracted_entities JSONB contains names/phones/emails
- [ ] **T2.4** AI creates action item when contractor states priority
- [ ] **T2.5** Verify `contractor_action_items` table populated
- [ ] **T2.6** Verify contractor_priority field matches stated ranking
- [ ] **T2.7** AI schedules follow-up when creating action item
- [ ] **T2.8** Verify `contractor_followup_schedules` table populated
- [ ] **T2.9** AI updates action item status on contractor confirmation
- [ ] **T2.10** Verify `action_item_updates` audit trail created
- [ ] **T2.11** All database writes succeed without errors
- [ ] **T2.12** AI responds naturally (no technical/database mentions)
- [ ] **T2.13** Function call errors logged but don't crash AI response

### **Files Created:**
- `tpe-backend/src/services/eventNoteService.js`
- `tpe-backend/src/services/actionItemService.js`
- `tpe-backend/src/services/followUpService.js`

### **Files Modified:**
- `tpe-backend/src/services/openAIService.js`

---

## 📋 ENHANCEMENT #3: Proactive Follow-Up Scheduler (9 hours)

### **Objective:** Build background service for automated follow-ups

### **Phase 3A: Create Scheduler Service (4 hours)**

- [ ] **3A.1** Create `proactiveFollowUpScheduler.js`
  - [ ] Add service documentation header
  - [ ] Import required dependencies (query, services, axios)
  - [ ] Implement `checkAndSendPendingFollowUps()` main function
    - [ ] Log scheduler execution
    - [ ] Call followUpService.getPendingFollowUps(20)
    - [ ] Return early if no pending follow-ups
    - [ ] Loop through each follow-up
    - [ ] Call sendFollowUpMessage() for each
    - [ ] Catch and log errors without crashing
    - [ ] Log completion summary
  - [ ] Implement `sendFollowUpMessage()` function
    - [ ] Query contractor details (name, phone, company)
    - [ ] Return early if contractor not found
    - [ ] Build message context object
    - [ ] Check if message_template exists
    - [ ] If yes: call personalizeFollowUpTemplate()
    - [ ] If no: call generateFollowUpMessage()
    - [ ] Log generated message preview
    - [ ] Call sendViaWebhook() to send SMS
    - [ ] Call followUpService.markFollowUpSent()
    - [ ] Insert into event_messages for context continuity
    - [ ] Log success
  - [ ] Implement `personalizeFollowUpTemplate()` function
    - [ ] Replace basic placeholders ({contractor_name}, etc.)
    - [ ] Check if context_hints exist
    - [ ] If yes: use AI to enhance message with hints
    - [ ] Build AI prompt for personalization
    - [ ] Call OpenAI with gpt-4-turbo
    - [ ] Extract and return personalized message
  - [ ] Implement `generateFollowUpMessage()` function
    - [ ] Build AI prompt with contractor and action item context
    - [ ] Include context hints in prompt
    - [ ] Add instructions (friendly, under 320 chars, specific)
    - [ ] Call OpenAI with gpt-4-turbo
    - [ ] Extract and return generated message
  - [ ] Implement `sendViaWebhook()` function
    - [ ] Determine webhook URL (production vs dev)
    - [ ] Build payload (phone, message, metadata)
    - [ ] POST to n8n webhook via axios
    - [ ] Log success
    - [ ] Handle errors without throwing
  - [ ] Implement `startScheduler()` function
    - [ ] Log scheduler start
    - [ ] Call checkAndSendPendingFollowUps() immediately
    - [ ] Set interval for every 5 minutes (5 * 60 * 1000)
    - [ ] Return interval ID (for stopping if needed)
  - [ ] Export startScheduler and checkAndSendPendingFollowUps

### **Phase 3B: Integrate into Server (1 hour)**

- [ ] **3B.1** Update `server.js`
  - [ ] Import proactiveFollowUpScheduler at top
  - [ ] After app.listen() success, check env variable
  - [ ] If ENABLE_FOLLOWUP_SCHEDULER !== 'false', start scheduler
  - [ ] Log scheduler start confirmation
  - [ ] Add error handling for scheduler start failures

- [ ] **3B.2** Update `.env` files
  - [ ] Add ENABLE_FOLLOWUP_SCHEDULER=true to development .env
  - [ ] Add ENABLE_FOLLOWUP_SCHEDULER=true to production .env
  - [ ] Document variable in .env.example

### **Phase 3C: Add Manual Trigger Endpoint (1 hour)**

- [ ] **3C.1** Update `eventMessagingRoutes.js`
  - [ ] Add POST route `/trigger-followups`
  - [ ] Wrap in asyncHandler
  - [ ] Import proactiveFollowUpScheduler
  - [ ] Call checkAndSendPendingFollowUps()
  - [ ] Return success response with timestamp
  - [ ] Add to protected routes (requires auth)

### **Phase 3D: Testing & Debugging (3 hours)**

- [ ] **3D.1** Unit test scheduler functions
  - [ ] Test checkAndSendPendingFollowUps() with mock data
  - [ ] Test sendFollowUpMessage() with test follow-up
  - [ ] Test personalizeFollowUpTemplate() with template
  - [ ] Test generateFollowUpMessage() with context
  - [ ] Verify no crashes on errors

- [ ] **3D.2** Integration test with real database
  - [ ] Create test action item
  - [ ] Create test follow-up scheduled for NOW
  - [ ] Call manual trigger endpoint
  - [ ] Verify SMS sent via n8n webhook
  - [ ] Verify follow-up marked as 'sent'
  - [ ] Verify event_messages entry created

- [ ] **3D.3** Test automatic scheduler
  - [ ] Restart backend server
  - [ ] Verify scheduler starts (check logs)
  - [ ] Create follow-up scheduled for 2 minutes from now
  - [ ] Wait 5 minutes
  - [ ] Verify message sent automatically
  - [ ] Check database for status update

- [ ] **3D.4** Test edge cases
  - [ ] Follow-up with skip_if_completed = true and completed action
  - [ ] Follow-up with missing contractor
  - [ ] Follow-up with no message_template (AI generation)
  - [ ] Multiple follow-ups for same contractor
  - [ ] n8n webhook failure handling

### **Testing Checklist:**
- [ ] **T3.1** Scheduler starts automatically when server starts
- [ ] **T3.2** Scheduler checks database every 5 minutes
- [ ] **T3.3** AI generates personalized follow-up messages
- [ ] **T3.4** Messages sent via n8n webhook successfully
- [ ] **T3.5** Follow-ups marked as "sent" in database
- [ ] **T3.6** Follow-ups skipped if action already completed
- [ ] **T3.7** Manual trigger endpoint works for testing
- [ ] **T3.8** Contractor can reply and AI continues conversation
- [ ] **T3.9** No duplicate messages sent for same follow-up
- [ ] **T3.10** Errors logged but don't crash scheduler
- [ ] **T3.11** Scheduler survives server restarts
- [ ] **T3.12** Multiple pending follow-ups processed in order

### **Files Created:**
- `tpe-backend/src/services/proactiveFollowUpScheduler.js`

### **Files Modified:**
- `tpe-backend/server.js`
- `tpe-backend/src/routes/eventMessagingRoutes.js`
- `.env` (development)
- `.env` (production - if different file)

---

## 🎯 END-TO-END INTEGRATION TEST

**Complete flow from note-taking to proactive follow-up:**

- [ ] **E2E.1** Setup test environment
  - [ ] Create test event (TEST-EVENT-2025)
  - [ ] Create test contractor (Test User)
  - [ ] Register contractor for event
  - [ ] Set event status to "during-event"

- [ ] **E2E.2** During-Event Note-Taking
  - [ ] Send SMS: "Met John Smith - great insights on AI. 555-1234, john@example.com"
  - [ ] Verify AI asks: "What session are you in?"
  - [ ] Reply: "AI automation session"
  - [ ] Verify AI confirms note captured
  - [ ] Check database: event_notes table has entry
  - [ ] Check extracted_entities contains: names=["John Smith"], phones=["555-1234"], emails=["john@example.com"]
  - [ ] Check session_context = "AI automation session"

- [ ] **E2E.3** Post-Event Priority Extraction
  - [ ] Set event status to "post-event"
  - [ ] Wait for AI to send wrap-up
  - [ ] Verify AI asks: "What are your top 3 priorities?"
  - [ ] Reply: "1. Follow up with John Smith, 2. Demo with Acme Corp, 3. Implement AI tools"
  - [ ] Verify AI confirms plan created
  - [ ] Check database: 3 entries in contractor_action_items
  - [ ] Check contractor_priority = 1, 2, 3 respectively
  - [ ] Check action_types are correct (contact_peer, demo_prep, implement_tool)

- [ ] **E2E.4** Follow-Up Scheduling
  - [ ] Verify AI asked: "When should I check in?"
  - [ ] Reply: "3 days"
  - [ ] Check database: entry in contractor_followup_schedules
  - [ ] Check scheduled_time = NOW + 3 days
  - [ ] Check followup_type = 'check_in'
  - [ ] Check action_item_id links to "Follow up with John" action

- [ ] **E2E.5** Proactive Follow-Up Execution
  - [ ] Manually set follow-up scheduled_time to NOW - 1 minute
  - [ ] Call manual trigger: POST /api/event-messaging/trigger-followups
  - [ ] Verify SMS received (check n8n logs or test phone)
  - [ ] Verify message contains "John Smith" reference
  - [ ] Check database: follow-up status = 'sent'
  - [ ] Check database: event_messages has proactive_followup entry

- [ ] **E2E.6** Conversation Continuity
  - [ ] Reply to proactive message: "Yes, we had a great call yesterday!"
  - [ ] Verify AI asks follow-up questions naturally
  - [ ] Verify AI references event context
  - [ ] Reply: "We're scheduling a follow-up meeting next week"
  - [ ] Verify AI marks action item as completed
  - [ ] Check database: action_item status = 'completed'
  - [ ] Check database: action_item_updates has entry

- [ ] **E2E.7** Long-Term Context Maintenance
  - [ ] One week later, send unrelated question
  - [ ] Verify AI still references event experience
  - [ ] Verify AI knows about John Smith connection
  - [ ] Verify AI can see completed action items

---

## 📊 PROGRESS TRACKING

### Enhancement #1: System Prompt Update
- **Status:** Not Started
- **Time Spent:** 0 hours
- **Estimated Remaining:** 4 hours

### Enhancement #2: Function Calling
- **Status:** Not Started
- **Time Spent:** 0 hours
- **Estimated Remaining:** 10 hours

### Enhancement #3: Proactive Scheduler
- **Status:** Not Started
- **Time Spent:** 0 hours
- **Estimated Remaining:** 9 hours

### Overall Project
- **Total Estimated:** 23 hours
- **Total Spent:** 0 hours
- **Completion:** 0%

---

## 🎉 COMPLETION CRITERIA

All enhancements are considered complete when:

1. ✅ All checklist items marked complete
2. ✅ All testing criteria passed
3. ✅ End-to-end integration test successful
4. ✅ No errors in production logs for 24 hours
5. ✅ Greg's vision fully demonstrated in live test
6. ✅ Documentation updated (AI-FIRST-STRATEGY.md, etc.)
7. ✅ Code committed to git with proper commit messages

---

## 📝 NOTES SECTION

### Development Notes:
- [ ] Record any issues encountered
- [ ] Document any deviations from plan
- [ ] Note any performance concerns
- [ ] Track any additional features discovered

### Testing Notes:
- [ ] Record test failures and resolutions
- [ ] Document edge cases found
- [ ] Note any unexpected behaviors

### Deployment Notes:
- [ ] Production deployment checklist
- [ ] Rollback procedures if needed
- [ ] Post-deployment verification steps
