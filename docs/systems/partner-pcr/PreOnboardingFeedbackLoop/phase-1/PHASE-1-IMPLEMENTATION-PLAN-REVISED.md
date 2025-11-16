# Phase 1: Pre-Onboarding PowerCard Integration - REVISED Implementation Plan

**Document Version:** 2.0 (REVISED)
**Date:** November 10, 2025
**Status:** READY FOR IMPLEMENTATION
**Key Change:** Leverages existing PowerCard system (90% built) - we're adding automation layer

---

## 🎉 MAJOR DISCOVERY: PowerCard System Already Exists!

**The existing PowerCard system (`powerCardService.js`) provides:**
- ✅ Template creation
- ✅ Campaign management
- ✅ Recipient tracking with unique survey links
- ✅ Response submission (public endpoint)
- ✅ Response aggregation & PCR calculation
- ✅ Beautiful multi-step survey form (PowerCardSurvey.tsx)
- ✅ All database tables (6 tables, fully functional)

**What we're ACTUALLY building:**
- 🔧 Thin automation wrapper around existing services
- 🔧 Email delivery integration
- 🔧 Step 8 completion hook
- 🔧 Reference text parsing

**Revised Timeline: 3-4 days** (down from 7 days)

---

## 📋 What Phase 1 Delivers (Revised)

### NEW Deliverables:
- ✅ Automatic campaign creation on Step 8 submission
- ✅ Reference parser for text format: "Name <email>, Name2 <email2>"
- ✅ Email delivery to 10 recipients (5 customers + 5 employees)
- ✅ Integration with partner onboarding flow

### REUSING Existing:
- ✅ PowerCard template system (already complete)
- ✅ Survey links generation (already complete)
- ✅ Public survey form (already complete)
- ✅ Response storage (already complete)
- ✅ Database schema (already complete)

---

## 🛠️ Implementation - NEW Code Only

### File 1: Pre-Onboarding Integration Service (NEW - Thin Wrapper)

**File:** `tpe-backend/src/services/preOnboardingPowerCardService.js` (NEW)

**DATABASE-CHECKED: Reuses existing tables, no new fields needed**

```javascript
// DATABASE-CHECKED: Leverages existing power_card_* tables verified November 10, 2025
// ================================================================
// Pre-Onboarding PowerCard Integration Service
// ================================================================
// Purpose: Automation wrapper around existing PowerCard system
// Key Insight: We're NOT building PowerCards - just automating them for pre-onboarding
// ================================================================

const powerCardService = require('./powerCardService');
const emailService = require('./emailService');
const { query } = require('../config/database');

/**
 * Generate PowerCard campaign for partner completing Step 8
 * Thin wrapper that calls existing PowerCard services
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Campaign info with survey links
 */
async function generatePreOnboardingCampaign(partnerId) {
  console.log(`[Pre-Onboarding] Starting PowerCard campaign for partner ${partnerId}`);

  // STEP 1: Get partner data
  const partnerResult = await query(`
    SELECT
      id,
      company_name,
      client_references,
      employee_references,
      logo_url
    FROM strategic_partners
    WHERE id = $1 AND is_active = true
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found or inactive`);
  }

  const partner = partnerResult.rows[0];

  // STEP 2: Parse references (format: "Name <email>, Name2 <email2>")
  const customerRefs = parseReferences(partner.client_references);
  const employeeRefs = parseReferences(partner.employee_references);

  if (customerRefs.length < 5 || employeeRefs.length < 5) {
    throw new Error(
      `Insufficient references: need 5 customers and 5 employees, ` +
      `got ${customerRefs.length} customers and ${employeeRefs.length} employees`
    );
  }

  // STEP 3: Create PowerCard template using EXISTING service
  // Default template for pre-onboarding (3 standard metrics)
  const templateData = {
    partner_id: partnerId,
    partner_type: 'strategic_partner',
    metric_1_name: 'Communication Quality',
    metric_1_question: 'How would you rate the quality of communication?',
    metric_1_type: 'rating',
    metric_2_name: 'Technical Expertise',
    metric_2_question: 'How would you rate the technical expertise?',
    metric_2_type: 'rating',
    metric_3_name: 'Overall Value',
    metric_3_question: 'How would you rate the overall value delivered?',
    metric_3_type: 'rating',
    include_satisfaction: true,
    include_recommendation: true,
    include_culture: false // Not relevant for pre-onboarding
  };

  const template = await powerCardService.createTemplate(templateData);
  console.log(`[Pre-Onboarding] ✅ Template created: ${template.id}`);

  // STEP 4: Create campaign using EXISTING service
  const now = new Date();
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  const year = now.getFullYear();

  const campaignData = {
    campaign_name: `${partner.company_name} Pre-Onboarding ${quarter} ${year}`,
    quarter,
    year,
    start_date: now,
    end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    status: 'active',
    campaign_type: 'pre_onboarding' // Tag for filtering
  };

  const campaign = await powerCardService.createCampaign(campaignData);
  console.log(`[Pre-Onboarding] ✅ Campaign created: ${campaign.id}`);

  // STEP 5: Add recipients using EXISTING service
  // Format recipients for existing service
  const recipients = [
    // 5 customers
    ...customerRefs.slice(0, 5).map(ref => ({
      recipient_name: ref.name,
      recipient_email: ref.email,
      recipient_type: 'client', // Use 'client' to match existing schema
      company_id: partnerId,
      company_type: 'partner',
      revenue_tier: null // Not applicable for pre-onboarding
    })),
    // 5 employees
    ...employeeRefs.slice(0, 5).map(ref => ({
      recipient_name: ref.name,
      recipient_email: ref.email,
      recipient_type: 'employee',
      company_id: partnerId,
      company_type: 'partner',
      revenue_tier: null
    }))
  ];

  const recipientResults = await powerCardService.addRecipients(
    campaign.id,
    template.id,
    recipients
  );
  console.log(`[Pre-Onboarding] ✅ Added ${recipientResults.added} recipients`);

  // STEP 6: Send emails to all recipients
  let sentCount = 0;
  for (const recipientData of recipientResults.recipients) {
    try {
      await sendPowerCardEmail({
        recipientEmail: recipientData.recipient_email,
        recipientName: recipientData.recipient_name,
        recipientType: recipientData.recipient_type,
        surveyLink: recipientData.survey_link,
        partnerName: partner.company_name,
        partnerLogo: partner.logo_url,
        campaignId: campaign.id
      });
      sentCount++;
    } catch (error) {
      console.error(
        `[Pre-Onboarding] Failed to send email to ${recipientData.recipient_email}:`,
        error
      );
    }
  }

  console.log(
    `[Pre-Onboarding] ✅ Campaign complete. ` +
    `Sent ${sentCount}/10 emails for campaign ${campaign.id}`
  );

  return {
    campaignId: campaign.id,
    templateId: template.id,
    emailsSent: sentCount,
    totalRecipients: 10,
    surveyLinks: recipientResults.recipients.map(r => ({
      email: r.recipient_email,
      name: r.recipient_name,
      type: r.recipient_type,
      link: r.survey_link
    }))
  };
}

/**
 * Parse reference string into array of {name, email} objects
 * Format: "John Doe <john@example.com>, Jane Smith <jane@example.com>"
 *
 * @param {string} referencesText - Comma-separated references
 * @returns {Array<{name: string, email: string}>}
 */
function parseReferences(referencesText) {
  if (!referencesText || typeof referencesText !== 'string') {
    return [];
  }

  const refs = referencesText.split(',').map(ref => ref.trim());

  return refs
    .map(ref => {
      // Try to match "Name <email>" format
      const match = ref.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return {
          name: match[1].trim(),
          email: match[2].trim()
        };
      }

      // Fallback: assume it's just an email
      if (ref.includes('@')) {
        return {
          name: ref.split('@')[0], // Use email prefix as name
          email: ref
        };
      }

      return null;
    })
    .filter(ref => ref !== null && ref.email.includes('@'));
}

/**
 * Send PowerCard email using existing email service
 *
 * @param {Object} emailData - Email parameters
 */
async function sendPowerCardEmail(emailData) {
  const {
    recipientEmail,
    recipientName,
    recipientType,
    surveyLink,
    partnerName,
    partnerLogo,
    campaignId
  } = emailData;

  const subject = `${partnerName} would love your feedback`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      ${partnerLogo ? `<img src="${partnerLogo}" alt="${partnerName}" style="max-width: 200px; margin: 20px 0;">` : ''}

      <h2>Hi ${recipientName},</h2>

      <p>We'd love to hear about your experience with ${partnerName}.</p>

      <p>Your feedback helps ${partnerName} improve and helps other contractors make informed decisions.</p>

      <p>This survey takes about 3-5 minutes and is completely anonymous.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${surveyLink}"
           style="background-color: #28a745; color: white; padding: 15px 30px;
                  text-decoration: none; border-radius: 5px; font-size: 16px;
                  display: inline-block;">
          Share Your Feedback
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${surveyLink}">${surveyLink}</a>
      </p>

      <p style="color: #999; font-size: 12px; margin-top: 40px;">
        This survey was sent as part of ${partnerName}'s onboarding with The Power100 Experience.
        Your responses are anonymous and will be aggregated with other feedback.
      </p>
    </div>
  `;

  // Call existing email service (to be implemented/configured)
  await emailService.sendEmail({
    to: recipientEmail,
    subject,
    html: htmlBody,
    tags: ['powercard', 'pre-onboarding', `campaign-${campaignId}`]
  });

  console.log(`[Pre-Onboarding] ✅ Email sent to ${recipientEmail}`);
}

module.exports = {
  generatePreOnboardingCampaign,
  parseReferences,
  sendPowerCardEmail
};
```

---

### File 2: Partner Controller Integration (UPDATE EXISTING)

**File:** `tpe-backend/src/controllers/partnerController.js` (UPDATE)

**Add this function after Step 8 completion:**

```javascript
// Add this import at top
const preOnboardingPowerCardService = require('../services/preOnboardingPowerCardService');

// Add this in the partner approval/Step 8 completion handler
async function handleStep8Completion(partnerId) {
  try {
    // Existing Step 8 logic...

    // NEW: Generate PowerCard campaign
    const campaignResult = await preOnboardingPowerCardService.generatePreOnboardingCampaign(partnerId);

    console.log(`[Partner Onboarding] ✅ PowerCard campaign ${campaignResult.campaignId} created for partner ${partnerId}`);

    return {
      success: true,
      message: 'Step 8 completed and PowerCard campaign initiated',
      campaign: {
        id: campaignResult.campaignId,
        emailsSent: campaignResult.emailsSent,
        totalRecipients: campaignResult.totalRecipients
      }
    };
  } catch (error) {
    console.error('[Partner Onboarding] Failed to generate PowerCard campaign:', error);

    // Don't fail the entire Step 8 if PowerCard generation fails
    return {
      success: true,
      message: 'Step 8 completed but PowerCard campaign failed. Admin will be notified.',
      warning: error.message
    };
  }
}
```

---

### File 3: Email Service Configuration (UPDATE EXISTING)

**File:** `tpe-backend/src/services/emailService.js` (UPDATE)

**Add PowerCard email method if not exists:**

```javascript
/**
 * Send email using configured service (SendGrid, AWS SES, etc.)
 *
 * @param {Object} emailData - Email parameters
 */
async function sendEmail({ to, subject, html, tags = [] }) {
  // TODO: Configure actual email service
  // Options: SendGrid, AWS SES, Mailgun, etc.

  // For now, log to console (REPLACE THIS IN PRODUCTION)
  console.log(`[Email Service] Would send email:`);
  console.log(`  To: ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Tags: ${tags.join(', ')}`);

  // Example SendGrid integration:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  await sgMail.send({
    to,
    from: process.env.EMAIL_FROM,
    subject,
    html,
    categories: tags
  });
  */

  // Example AWS SES integration:
  /*
  const AWS = require('aws-sdk');
  const ses = new AWS.SES({ region: 'us-east-1' });

  await ses.sendEmail({
    Source: process.env.EMAIL_FROM,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } }
    }
  }).promise();
  */
}

module.exports = {
  sendEmail
};
```

---

## 📅 Revised Implementation Timeline (3-4 Days)

### Day 1: Integration Service & Reference Parser
**Tasks:**
1. Create `preOnboardingPowerCardService.js`
2. Implement `generatePreOnboardingCampaign()` wrapper
3. Implement `parseReferences()` function
4. Unit tests for reference parsing
5. Test calling existing `powerCardService` methods

**Deliverable:** Service that creates campaigns by calling existing PowerCard system

**Time:** 4-6 hours

---

### Day 2: Email Integration
**Tasks:**
1. Configure email service (SendGrid or AWS SES)
2. Create PowerCard email template HTML
3. Implement `sendPowerCardEmail()` function
4. Test email delivery to test addresses
5. Verify survey links in emails work

**Deliverable:** Working email delivery with branded PowerCard invitations

**Time:** 4-6 hours

---

### Day 3: Partner Onboarding Integration
**Tasks:**
1. Update `partnerController.js` Step 8 handler
2. Add PowerCard campaign trigger
3. Add error handling (don't fail Step 8 if PowerCards fail)
4. Test full flow: Step 8 → campaign → emails → survey
5. Verify existing survey form works for pre-onboarding

**Deliverable:** Automatic PowerCard generation on Step 8 completion

**Time:** 3-4 hours

---

### Day 4: Testing & Refinement
**Tasks:**
1. End-to-end testing with real partner data
2. Test with various reference formats
3. Verify all 10 emails send successfully
4. Test survey completion and response storage
5. Edge case handling (missing references, invalid emails)

**Deliverable:** Production-ready pre-onboarding PowerCard automation

**Time:** 4-5 hours

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Integration Simplicity** | < 200 lines new code | Line count of `preOnboardingPowerCardService.js` |
| **Campaign Creation** | < 2 seconds | Time from Step 8 to campaign created |
| **Email Delivery Rate** | 95%+ | Emails sent successfully / total recipients |
| **Reference Parsing** | 100% | Correctly parsed name/email pairs |
| **Survey Form Compatibility** | 100% | Existing form works for pre-onboarding |

---

## 🔧 Reusing Existing Components

### What We're NOT Building:

❌ PowerCard templates (use existing `createTemplate()`)
❌ Campaign management (use existing `createCampaign()`)
❌ Recipient tracking (use existing `addRecipients()`)
❌ Survey links generation (existing service handles this)
❌ Survey form UI (use existing `PowerCardSurvey.tsx`)
❌ Response submission (use existing public endpoint)
❌ Database tables (all 6 tables already exist)

### What We ARE Building:

✅ Thin wrapper service (`preOnboardingPowerCardService.js`)
✅ Reference text parser (`parseReferences()`)
✅ Email delivery integration (`sendPowerCardEmail()`)
✅ Step 8 completion hook
✅ Error handling for campaign generation

---

## 📚 Related Documents

- **Overview:** [Pre-Onboarding System Overview](../PRE-ONBOARDING-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 1 Pre-Flight Checklist (Revised)](./PHASE-1-PRE-FLIGHT-CHECKLIST-REVISED.md)
- **Phase 2 Plan:** [Phase 2 Implementation Plan (Revised)](../phase-2/PHASE-2-IMPLEMENTATION-PLAN-REVISED.md)
- **Existing PowerCard Service:** `tpe-backend/src/services/powerCardService.js`
- **Existing Survey Form:** `tpe-front-end/src/components/powerCards/PowerCardSurvey.tsx`

---

## 🎉 Key Advantages of This Approach

1. **Minimal New Code:** ~200 lines vs. ~1000+ lines
2. **Proven Components:** Reusing battle-tested PowerCard system
3. **Faster Implementation:** 3-4 days vs. 7 days
4. **Lower Risk:** Not reinventing the wheel
5. **Easier Maintenance:** One PowerCard system to maintain
6. **Consistent UX:** Same survey experience for all PowerCards

---

**Last Updated:** November 10, 2025
**Status:** Ready for Day 1 Implementation
**Next Step:** Run Phase 1 Pre-Flight Checklist (Revised)
**Estimated Completion:** 3-4 days
