# Intelligent Time-Based Registration System

## Overview

The Event Registration Service now includes **intelligent time-based logic** that automatically adjusts messaging urgency and tone based on how close the event is to starting. This ensures late registrants receive appropriate urgency messaging and aren't confused by outdated reminder schedules.

---

## How It Works

### Urgency Levels

The system calculates urgency based on hours until event start:

| Urgency Level | Time Window | Behavior |
|--------------|-------------|----------|
| **IMMEDIATE** | < 1 hour | Ultra-urgent messaging with ⚡ indicators |
| **VERY_URGENT** | 1-2 hours | Urgent messaging with 🚨 indicators |
| **URGENT** | 2-24 hours | Same-day messaging with emphasis |
| **NORMAL** | > 24 hours | Standard messaging with normal cadence |

### Calculation Logic

```javascript
function calculateUrgencyLevel(eventDate) {
  const now = new Date();
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

  if (hoursUntilEvent < 1) return 'immediate';
  if (hoursUntilEvent < 2) return 'very_urgent';
  if (hoursUntilEvent < 24) return 'urgent';
  return 'normal';
}
```

---

## Message Examples

### IMMEDIATE (< 1 hour)

**Profile Completion Request:**
```
⚡ John! Power100 Summit 2025 is STARTING NOW!

URGENT: Complete your profile in the next few minutes to get your personalized agenda:

Reply with:
1️⃣ Top 3 business focus areas
2️⃣ Revenue range
3️⃣ Team size

Example: "Sales, Operations, Marketing | $1-2M | 10-20"

Do this NOW to get matched with speakers & sponsors! ⚡
```

**Personalized Agenda:**
```
⚡ John, Power100 Summit 2025 is STARTING NOW! Here's your personalized agenda:

🎤 TOP SPEAKERS FOR YOU:
[speakers...]

🤝 TOP SPONSORS FOR YOU:
[sponsors...]

Check in NOW and start networking! ⚡
```

### VERY_URGENT (1-2 hours)

**Profile Completion Request:**
```
🚨 John! Power100 Summit 2025 starts in 1 hour!

Complete your profile NOW to get your personalized agenda before the event:

Reply with:
1️⃣ Top 3 business focus areas
2️⃣ Revenue range
3️⃣ Team size

Example: "Sales, Operations, Marketing | $1-2M | 10-20"

Quick! Get matched with the right speakers & sponsors! 🚨
```

**Personalized Agenda:**
```
🚨 John, Power100 Summit 2025 starts in 1 hour! Your agenda:

🎤 TOP SPEAKERS FOR YOU:
[speakers...]

🤝 TOP SPONSORS FOR YOU:
[sponsors...]

Check in when you arrive - see you soon! 🚨
```

### URGENT (2-24 hours)

**Profile Completion Request:**
```
Hi John! 🎉 You're registered for Power100 Summit 2025 - EVENT TODAY!

Complete your profile to unlock your personalized agenda with AI-powered recommendations:

Reply with:
1️⃣ Top 3 business focus areas
2️⃣ Annual revenue range
3️⃣ Team size

Example: "Sales, Operations, Marketing | $1-2M | 10-20 employees"

Do this today to get matched with perfect sessions & sponsors!
```

**Personalized Agenda:**
```
🎉 John, Power100 Summit 2025 is TODAY! Your personalized agenda:

🎤 TOP SPEAKERS FOR YOU:
[speakers...]

🤝 TOP SPONSORS FOR YOU:
[sponsors...]

Check in when you arrive today. Enjoy the event! 🚀
```

### NORMAL (> 24 hours)

**Profile Completion Request:**
```
Hi John! 🎉 You're registered for Power100 Summit 2025!

To unlock your personalized agenda with AI-powered speaker & sponsor recommendations, complete your profile:

Reply with:
1️⃣ Your top 3 business focus areas
2️⃣ Annual revenue range
3️⃣ Team size

Example: "Sales, Operations, Marketing | $1-2M | 10-20 employees"

This helps us match you with the perfect sessions & sponsors!
```

**Personalized Agenda:**
```
🎉 John, your personalized Power100 Summit 2025 agenda is ready!

🎤 TOP SPEAKERS FOR YOU:
[speakers...]

🤝 TOP SPONSORS FOR YOU:
[sponsors...]

We'll send reminders before each session. See you there! 🚀
```

---

## Implementation Details

### Files Modified

- **`eventRegistrationService.js`** - Added urgency calculation and urgency-aware messaging

### Key Functions

1. **`calculateUrgencyLevel(eventDate)`**
   - Calculates urgency based on hours until event
   - Returns urgency level constant

2. **`registerSingleContractor(eventId, data)`**
   - Gets event date and calculates urgency
   - Passes urgency to handler functions

3. **`handleExistingContractor(eventId, contractor, urgencyLevel, hoursUntilEvent)`**
   - Receives urgency parameters
   - Passes to messaging functions

4. **`handleNewContractor(eventId, data, urgencyLevel, hoursUntilEvent)`**
   - Receives urgency parameters
   - Passes to messaging functions

5. **`sendProfileCompletionRequest(eventId, contractorId, contractor, urgencyLevel, hoursUntilEvent)`**
   - Accepts urgency parameters (defaults to 'normal')
   - Uses switch statement to select appropriate message template
   - Saves urgency level in `personalization_data` for tracking

6. **`sendPersonalizedAgenda(eventId, contractorId, urgencyLevel, hoursUntilEvent)`**
   - Accepts urgency parameters (defaults to 'normal')
   - Adjusts opening and closing messages based on urgency
   - Saves urgency level in `personalization_data` for tracking

---

## Database Tracking

All messages sent with urgency awareness store metadata in `event_messages.personalization_data`:

```json
{
  "sms_event_code": "PWR100",
  "registration_trigger": true,
  "urgency_level": "very_urgent",
  "hours_until_event": 1,
  "speakers": [...],
  "sponsors": [...]
}
```

This allows for:
- Analytics on late registration patterns
- Message effectiveness by urgency level
- Future optimization of urgency thresholds

---

## Benefits

### For Contractors
- ✅ Clear understanding of timing urgency
- ✅ Appropriate messaging for their registration timing
- ✅ No confusion from outdated reminder schedules
- ✅ Better event preparation experience

### For Event Organizers
- ✅ Reduced no-shows from late registrants
- ✅ Higher profile completion rates
- ✅ Better attendee data quality
- ✅ Improved event experience

### For System
- ✅ Automatic adaptation to registration timing
- ✅ No manual intervention required
- ✅ Consistent messaging logic
- ✅ Trackable urgency analytics

---

## Testing

### Test Scenarios

**Scenario 1: Registration 3 days before event**
- Expected: NORMAL urgency
- Message: Standard messaging with normal cadence

**Scenario 2: Registration 12 hours before event**
- Expected: URGENT urgency
- Message: "EVENT TODAY!" messaging

**Scenario 3: Registration 90 minutes before event**
- Expected: VERY_URGENT urgency
- Message: "starts in 1 hour!" messaging

**Scenario 4: Registration 30 minutes before event**
- Expected: IMMEDIATE urgency
- Message: "STARTING NOW!" messaging

### Test Endpoint

Use the existing registration endpoint with different event dates:

```bash
# Create test event with date in the future
POST /api/event-messaging/event/:eventId/register
{
  "email": "test@example.com",
  "phone": "+15555555555",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Test Company"
}
```

### Verify Urgency

Check console logs:
```
[EventRegistration] Urgency level: very_urgent (1 hours until event)
[EventRegistration] Profile completion request sent (very_urgent): 123
```

Check database:
```sql
SELECT
  message_content,
  personalization_data->>'urgency_level' as urgency,
  personalization_data->>'hours_until_event' as hours
FROM event_messages
WHERE id = 123;
```

---

## Future Enhancements

### Potential Improvements

1. **Dynamic Reminder Scheduling**
   - Skip already-passed reminder windows
   - Only schedule future reminders based on current time

2. **Urgency Threshold Configuration**
   - Allow event organizers to customize urgency thresholds
   - Different urgency levels for different event types

3. **Escalation Logic**
   - Send follow-up if no profile completion after X minutes
   - Increase urgency if event is very close

4. **Multi-Channel Urgency**
   - SMS for urgent registrations
   - Email for normal registrations
   - Both for very urgent

---

## Configuration

### Urgency Thresholds

Current thresholds are hard-coded in `URGENCY_LEVELS`:

```javascript
const URGENCY_LEVELS = {
  IMMEDIATE: 'immediate',      // < 1 hour
  VERY_URGENT: 'very_urgent',  // < 2 hours
  URGENT: 'urgent',            // < 24 hours
  NORMAL: 'normal'             // > 24 hours
};
```

To modify thresholds, update the `calculateUrgencyLevel()` function.

### Message Templates

Message templates are defined in:
- `sendProfileCompletionRequest()` - Profile completion messages
- `sendPersonalizedAgenda()` - Agenda delivery messages

Each uses a switch statement with cases for each urgency level.

---

## Related Documentation

- `EVENT-CHECK-IN-SYSTEM.md` - Check-in system overview
- `EVENT-ORCHESTRATION.md` - Event orchestration workflow
- `EMAIL-ARCHITECTURE.md` - Email notification system
- `eventRegistrationService.js` - Implementation source code

---

## Change Log

**2025-10-10** - Initial implementation
- Added urgency level calculation
- Created urgency-aware messaging templates
- Updated registration flow to pass urgency context
- Added database tracking for urgency metadata
