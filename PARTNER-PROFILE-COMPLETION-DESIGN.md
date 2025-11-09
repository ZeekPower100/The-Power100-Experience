# Partner/Sponsor Event Registration Profile Completion System

## Overview
When partners/sponsors are registered for an event and have incomplete profiles in TPX, automatically trigger profile completion requests similar to the contractor flow.

## Architecture

### Current State (Contractors)
1. Contractor registers for event → `event_attendees` record created
2. System checks profile completeness (focus_areas, revenue_tier, team_size)
3. If incomplete → `sendProfileCompletionRequest()` sends email + SMS
4. Email describes event benefits (personalized agenda, AI matching, event concierge)
5. Links to: `/events/${eventId}/profile?contractor=${contractorId}`

### New State (Partners/Sponsors)
1. Sponsor added to event → `event_sponsors` record created with `partner_id`
2. System checks if `partner_id` exists in `strategic_partners`
3. If exists, check profile completeness (different required fields than contractors)
4. If incomplete → `sendPartnerProfileCompletionRequest()` sends email
5. Email describes TPX benefits (better lead matching, exposure, networking)
6. Links to: `/partner-portal/profile?partner=${partnerId}&event=${eventId}`

## Database Schema

### Tables Involved
- **event_sponsors**: Links partners to specific events (has `partner_id` → strategic_partners)
- **strategic_partners**: Main partner profile system (124 columns)
- **event_attendees**: Contractors only (has `contractor_id`)

### Key Difference
Partners are tracked via `event_sponsors` table, NOT `event_attendees` table.

## Partner Profile Completeness Criteria

### Required Fields for "Complete Profile"
Based on matching algorithm and partner value proposition needs:

1. **Company Basics**
   - `company_name` (must exist)
   - `company_description` (what they do)
   - `website` (optional but recommended)

2. **Contact Information**
   - `primary_contact` (name)
   - `primary_email` (email)
   - `primary_phone` (phone)

3. **Business Profile**
   - `value_proposition` (why they're valuable)
   - `focus_areas` (what business areas they serve - JSON)
   - `service_areas` (what services they offer - JSON)
   - `target_revenue_audience` (who they serve)

4. **Key Differentiators**
   - `key_differentiators` OR `ai_generated_differentiators` (what makes them unique)

### Profile Completeness Check Logic
```javascript
function checkPartnerProfileCompleteness(partner) {
  const requiredFields = [
    'company_name',
    'company_description',
    'primary_contact',
    'primary_email',
    'primary_phone',
    'value_proposition',
    'focus_areas',
    'service_areas',
    'target_revenue_audience'
  ];

  for (const field of requiredFields) {
    const value = partner[field];

    // Check if field is missing or empty
    if (!value || value === '' || value === 'null') {
      return false;
    }

    // For JSON fields, check if empty array
    if (field === 'focus_areas' || field === 'service_areas') {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return false;
      }
    }
  }

  // Check if EITHER key_differentiators OR ai_generated_differentiators exists
  const hasDifferentiators = (partner.key_differentiators && partner.key_differentiators !== '') ||
                              (partner.ai_generated_differentiators && partner.ai_generated_differentiators !== '');

  return hasDifferentiators;
}
```

## Email Template Design

### Subject Line
`${partnerContact}, maximize your exposure at ${eventName}!`

### Content Focus
Unlike contractors (who get event concierge), partners get:

1. **Event-Specific Benefits**
   - Better matching with ideal contractor attendees
   - Booth traffic optimization based on attendee profiles
   - Targeted networking opportunities
   - Real-time engagement insights during event

2. **TPX Platform Benefits**
   - Ongoing lead matching with contractors in TPX ecosystem
   - PowerConfidence scoring and reputation building
   - Access to contractor insights and industry trends
   - Long-term partnership opportunities beyond single events

3. **Call-to-Action**
   - "Complete Your Partner Profile" button
   - Pre-populated with known sponsor information
   - Quick 5-minute completion process
   - Immediate matching improvements

### Email Template Structure
```html
Hi ${partnerContact},

Thank you for sponsoring ${eventName}! 🎉

We noticed your partner profile in The Power100 Experience isn't complete yet.
A complete profile will help you:

**For ${eventName}:**
- Match with contractors who need your services most
- Increase booth traffic from qualified leads
- Get personalized networking recommendations
- Access real-time engagement analytics

**For TPX Platform:**
- Ongoing lead matching with contractors in our ecosystem
- Build your PowerConfidence reputation score
- Gain insights into contractor needs and trends
- Long-term partnership opportunities

Complete your profile now to maximize your ${eventName} ROI:
[Complete Your Profile Button]

Takes just 5 minutes and will significantly improve your results!

Best regards,
The Power100 Team
```

## Implementation Plan

### 1. Create Partner Profile Completeness Check (eventRegistrationService.js)
```javascript
async function checkPartnerProfileCompleteness(partnerId) {
  const partnerResult = await query(`
    SELECT
      id, company_name, company_description, primary_contact,
      primary_email, primary_phone, value_proposition,
      focus_areas, service_areas, target_revenue_audience,
      key_differentiators, ai_generated_differentiators
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    return { exists: false, isComplete: false };
  }

  const partner = partnerResult.rows[0];
  const isComplete = checkPartnerProfileCompletenessLogic(partner);

  return { exists: true, isComplete, partner };
}
```

### 2. Create Email Template (emailTemplates.js)
```javascript
function buildPartnerProfileCompletionEmail({
  partnerContact,
  companyName,
  eventName,
  eventId,
  partnerId,
  eventDate
}) {
  const content = `
    <p>Hi <strong>${partnerContact}</strong>,</p>

    <p>Thank you for sponsoring <strong>${eventName}</strong>! 🎉</p>

    <p>We noticed your partner profile in The Power100 Experience isn't complete yet.</p>

    <div style="background-color: #e7f5ff; border-left: 4px solid #1c7ed6; padding: 20px 25px; margin: 30px 0;">
      <h2 style="color: #1c7ed6; margin-top: 0;">📊 Complete Profile Benefits</h2>

      <h3 style="color: #1c7ed6; font-size: 16px; margin-bottom: 10px;">For ${eventName}:</h3>
      <ul style="color: #495057; margin: 0 0 20px 0;">
        <li><strong>Better Matching:</strong> Connect with contractors who need your services most</li>
        <li><strong>Booth Optimization:</strong> Increase qualified traffic based on attendee profiles</li>
        <li><strong>Smart Networking:</strong> Get personalized networking recommendations</li>
        <li><strong>Real-time Insights:</strong> Access engagement analytics during the event</li>
      </ul>

      <h3 style="color: #1c7ed6; font-size: 16px; margin-bottom: 10px;">For TPX Platform Overall:</h3>
      <ul style="color: #495057; margin: 0;">
        <li><strong>Ongoing Leads:</strong> Continuous matching with contractors in our ecosystem</li>
        <li><strong>PowerConfidence Rating:</strong> Build your reputation with verified ratings</li>
        <li><strong>Industry Insights:</strong> Gain visibility into contractor needs and trends</li>
        <li><strong>Long-term Partnerships:</strong> Opportunities beyond single events</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${getBaseUrl()}/partner-portal/profile?partner=${partnerId}&event=${eventId}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        Complete Your Partner Profile
      </a>
    </div>

    <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
      <strong>Takes just 5 minutes</strong> and will significantly improve your ${eventName} ROI!
    </p>

    <p style="margin-top: 30px;">Best regards,<br>The Power100 Team</p>
  `;

  return wrapEmailTemplate(content);
}
```

### 3. Add Email Scheduler Function (emailScheduler.js)
```javascript
async function sendPartnerProfileCompletionRequest(eventId, partnerId) {
  console.log(`[EMAIL SCHEDULER] Sending partner profile completion for event ${eventId}, partner ${partnerId}`);

  try {
    // Get partner info
    const partnerResult = await query(`
      SELECT id, company_name, primary_contact, primary_email, primary_phone
      FROM strategic_partners WHERE id = $1
    `, [partnerId]);

    if (partnerResult.rows.length === 0) {
      throw new Error(`Partner not found: ${partnerId}`);
    }
    const partner = partnerResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, date
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Build email content
    const emailSubject = `${partner.primary_contact || 'Hi'}, maximize your exposure at ${event.name}!`;
    const emailBody = buildPartnerProfileCompletionEmail({
      partnerContact: partner.primary_contact || partner.company_name,
      companyName: partner.company_name,
      eventName: event.name,
      eventDate: event.date,
      eventId: eventId,
      partnerId: partnerId
    });

    // Save to database
    const messageResult = await query(`
      INSERT INTO event_messages (
        event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        message_content, status
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6, $7)
      RETURNING id
    `, [
      eventId,
      'partner_profile_completion_request',
      'outbound',
      'email',
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name,
        partner_id: partnerId,
        company_name: partner.company_name
      }),
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: partner.primary_email,
      to_name: partner.primary_contact || partner.company_name,
      subject: emailSubject,
      body: emailBody,
      template: 'partner_profile_completion_request',
      event_id: eventId,
      partner_id: partnerId
    };

    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Partner email sent via n8n`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Partner profile completion sent`);

    return {
      success: true,
      message_id: messageId,
      email: partner.primary_email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending partner profile completion:', error);
    throw error;
  }
}
```

### 4. Enhance syncEventSponsors (eventController.js)
Add profile completeness check after creating event_sponsors record:

```javascript
// After each INSERT INTO event_sponsors
if (partnerId) {
  // Check partner profile completeness
  const { checkPartnerProfileCompleteness } = require('../services/eventOrchestrator/eventRegistrationService');
  const { sendPartnerProfileCompletionRequest } = require('../services/eventOrchestrator/emailScheduler');

  const profileCheck = await checkPartnerProfileCompleteness(partnerId);

  if (profileCheck.exists && !profileCheck.isComplete) {
    console.log(`[EVENT] Partner ${partnerId} has incomplete profile, sending completion request`);
    await sendPartnerProfileCompletionRequest(eventId, partnerId);
  }
}
```

### 5. Create Partner Profile Completion API
New endpoint: `GET /api/partners/:id/profile-form?event=:eventId`

Returns partner data pre-populated for form, including:
- All existing partner data
- Which fields are required but missing
- Event context (which event triggered this request)

### 6. Create Frontend Form
New page: `/partner-portal/profile?partner=${partnerId}&event=${eventId}`

Features:
- Pre-populated fields from strategic_partners table
- Only show fields that are missing or incomplete
- Event context displayed at top ("Complete your profile for ${eventName}")
- Submit updates strategic_partners record
- Redirects to event confirmation or partner portal dashboard

## Testing Checklist

1. ✅ Create test event with incomplete partner as sponsor
2. ✅ Verify email is triggered automatically
3. ✅ Verify email content shows both event and TPX benefits
4. ✅ Verify profile completion link works with pre-population
5. ✅ Verify completing profile marks profile as complete
6. ✅ Verify no email sent if profile already complete
7. ✅ Verify email is NOT sent for sponsors without partner_id match

## Success Criteria

- Partners with incomplete profiles automatically receive completion email when added to events
- Email clearly differentiates partner benefits (lead matching) vs contractor benefits (event concierge)
- Profile completion form pre-populates known sponsor data
- System only triggers for partners with matched partner_id in strategic_partners
- Profile completeness check uses partner-specific required fields (not contractor fields)
