// DATABASE-CHECKED: contractor_followup_schedules (21 columns) verified on 2025-10-07
// DATABASE-CHECKED: contractor_action_items (27 columns) verified on 2025-10-07
// DATABASE-CHECKED: contractors (phone, first_name, last_name) verified on 2025-10-07

const { query } = require('../config/database');
const followUpService = require('./followUpService');
const openAIService = require('./openAIService');

/**
 * Proactive Scheduler Service
 * Automatically checks for and sends scheduled follow-ups to contractors
 */

/**
 * Get all follow-ups that are due to be sent now
 * @returns {Array} - Array of follow-ups ready to send
 */
async function getDueFollowUps() {
  try {
    console.log('[ProactiveScheduler] Checking for due follow-ups...');

    const result = await query(`
      SELECT
        fs.*,
        c.phone,
        c.first_name,
        c.last_name,
        c.email,
        ai.title as action_item_title,
        ai.status as action_item_status,
        ai.completed_at as action_item_completed_at
      FROM contractor_followup_schedules fs
      INNER JOIN contractors c ON fs.contractor_id = c.id
      LEFT JOIN contractor_action_items ai ON fs.action_item_id = ai.id
      WHERE fs.status = 'scheduled'
        AND fs.scheduled_time <= NOW()
        AND (
          fs.skip_if_completed = false
          OR ai.status IS NULL
          OR ai.status != 'completed'
        )
      ORDER BY fs.scheduled_time ASC
    `);

    console.log(`[ProactiveScheduler] Found ${result.rows.length} follow-ups due`);
    return result.rows;

  } catch (error) {
    console.error('[ProactiveScheduler] Error getting due follow-ups:', error);
    throw error;
  }
}

/**
 * Personalize follow-up message using AI
 * @param {Object} followUp - Follow-up object
 * @param {Object} contractor - Contractor object
 * @returns {string} - Personalized message
 */
async function personalizeMessage(followUp, contractor) {
  try {
    // If AI personalization is disabled, return template as-is
    if (!followUp.ai_should_personalize) {
      return followUp.message_template;
    }

    console.log(`[ProactiveScheduler] Personalizing message for contractor ${contractor.id}`);

    // Build context for AI
    const contextHints = followUp.ai_context_hints || {};
    const actionItemContext = followUp.action_item_title
      ? `This is about their action item: "${followUp.action_item_title}" (Status: ${followUp.action_item_status})`
      : '';

    const prompt = `Personalize this follow-up message for ${contractor.first_name}:

Template: "${followUp.message_template}"

Context:
- Contractor: ${contractor.first_name} ${contractor.last_name}
- Follow-up Type: ${followUp.followup_type}
- Tone: ${followUp.message_tone || 'friendly'}
${actionItemContext}

Additional Context: ${JSON.stringify(contextHints)}

Make it natural, conversational, and appropriate for SMS. Keep it under 160 characters if possible.
DO NOT use emojis unless the original template has them.`;

    const response = await openAIService.generateConciergeResponse(
      prompt,
      contractor,
      [],
      [],
      {}
    );

    return response.content || followUp.message_template;

  } catch (error) {
    console.error('[ProactiveScheduler] Error personalizing message:', error);
    // Fallback to template if AI fails
    return followUp.message_template;
  }
}

/**
 * Send a follow-up message via SMS
 * @param {Object} followUp - Follow-up object with contractor info
 * @param {string} message - Message to send
 * @returns {Object} - Send result
 */
async function sendFollowUpMessage(followUp, message) {
  try {
    console.log(`[ProactiveScheduler] Sending follow-up ${followUp.id} to ${followUp.phone}`);

    // Build the webhook payload
    const payload = {
      phone: followUp.phone,
      message: message,
      contractor_id: followUp.contractor_id,
      followup_id: followUp.id,
      followup_type: followUp.followup_type
    };

    // Send to n8n outbound webhook
    const n8nWebhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL || 'http://localhost:5678/webhook/sms-outbound';

    console.log(`[ProactiveScheduler] Sending to n8n webhook: ${n8nWebhookUrl}`);

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    console.log(`[ProactiveScheduler] ✅ Follow-up sent successfully`);
    return { success: true, result };

  } catch (error) {
    console.error('[ProactiveScheduler] ❌ Error sending follow-up:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process all due follow-ups
 * @returns {Object} - Processing results
 */
async function processDueFollowUps() {
  try {
    console.log('[ProactiveScheduler] 🚀 Starting proactive follow-up processing...');

    const dueFollowUps = await getDueFollowUps();

    if (dueFollowUps.length === 0) {
      console.log('[ProactiveScheduler] No follow-ups due at this time');
      return { processed: 0, sent: 0, failed: 0 };
    }

    console.log(`[ProactiveScheduler] Processing ${dueFollowUps.length} follow-ups...`);

    let sent = 0;
    let failed = 0;

    for (const followUp of dueFollowUps) {
      try {
        // Build contractor object
        const contractor = {
          id: followUp.contractor_id,
          phone: followUp.phone,
          first_name: followUp.first_name,
          last_name: followUp.last_name,
          email: followUp.email
        };

        // Personalize message if needed
        const message = await personalizeMessage(followUp, contractor);

        // Send the message
        const sendResult = await sendFollowUpMessage(followUp, message);

        if (sendResult.success) {
          // Mark as sent
          await followUpService.markFollowUpSent(followUp.id, 'scheduler');
          sent++;
          console.log(`[ProactiveScheduler] ✅ Follow-up ${followUp.id} sent and marked`);
        } else {
          failed++;
          console.error(`[ProactiveScheduler] ❌ Failed to send follow-up ${followUp.id}:`, sendResult.error);
        }

      } catch (error) {
        failed++;
        console.error(`[ProactiveScheduler] ❌ Error processing follow-up ${followUp.id}:`, error);
      }

      // Rate limiting - wait 2 seconds between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const results = {
      processed: dueFollowUps.length,
      sent,
      failed
    };

    console.log('[ProactiveScheduler] ✅ Processing complete:', results);
    return results;

  } catch (error) {
    console.error('[ProactiveScheduler] ❌ Error processing due follow-ups:', error);
    throw error;
  }
}

/**
 * Get scheduler statistics
 * @returns {Object} - Scheduler stats
 */
async function getSchedulerStats() {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_time <= NOW()) as overdue_count,
        MIN(scheduled_time) FILTER (WHERE status = 'scheduled' AND scheduled_time > NOW()) as next_scheduled
      FROM contractor_followup_schedules
    `);

    return result.rows[0];

  } catch (error) {
    console.error('[ProactiveScheduler] Error getting stats:', error);
    throw error;
  }
}

module.exports = {
  getDueFollowUps,
  personalizeMessage,
  sendFollowUpMessage,
  processDueFollowUps,
  getSchedulerStats
};
