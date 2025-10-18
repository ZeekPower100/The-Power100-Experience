// DATABASE-CHECKED: event_messages (28 columns) verified on 2025-10-17
// DATABASE-CHECKED: contractors (id, phone, name, first_name, last_name, email, company_name) verified on 2025-10-17
// DATABASE-CHECKED: events (id, name, date, location) verified on 2025-10-17

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { query } = require('../config/database');
const { safeJsonParse } = require('../utils/jsonHelpers');
const { processMessageForSMS } = require('../utils/smsHelpers');

// Import existing outbound scheduler functions
const outboundScheduler = require('../services/eventOrchestrator/outboundScheduler');
const aiConciergeController = require('../controllers/aiConciergeController');

// Define which message types should use AI for natural, conversational messaging
const AI_DRIVEN_MESSAGE_TYPES = [
  'sponsor_recommendation',
  'attendance_check',
  'pcr_request',
  'sponsor_batch_check',
  'post_event_wrap_up'
];

/**
 * Bull Worker for Event Message Processing
 * Processes scheduled event messages at their exact scheduled time
 * Handles: check-in reminders, speaker alerts, sponsor recommendations, PCR requests, wrap-ups
 */

// Redis connection for worker
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

/**
 * Process function - executes when message is due
 */
async function processEventMessage(job) {
  const {
    message_id,
    event_id,
    contractor_id,
    message_type,
    scheduled_time
  } = job.data;

  console.log(`[EventMessageWorker] 🚀 Processing message ${message_id} (${message_type}) for contractor ${contractor_id}`);
  console.log(`[EventMessageWorker] Scheduled: ${scheduled_time}, Actual: ${new Date().toISOString()}`);

  try {
    // Get full message data from database with contractor info
    // DATABASE-CHECKED: Using exact column names from event_messages and contractors tables
    const messageResult = await query(`
      SELECT
        em.*,
        c.phone,
        c.name,
        c.first_name,
        c.last_name,
        c.email,
        c.company_name,
        e.name as event_name,
        e.date as event_date,
        e.location as event_location
      FROM event_messages em
      INNER JOIN contractors c ON em.contractor_id = c.id
      LEFT JOIN events e ON em.event_id = e.id
      WHERE em.id = $1
    `, [message_id]);

    if (messageResult.rows.length === 0) {
      console.error(`[EventMessageWorker] ❌ Message ${message_id} not found in database`);
      return { success: false, error: 'Message not found' };
    }

    const message = messageResult.rows[0];

    // Check if already sent (status field)
    if (message.status === 'sent') {
      console.log(`[EventMessageWorker] ⏭️ Message ${message_id} already sent, skipping`);
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    // Check if cancelled (status field)
    if (message.status === 'cancelled') {
      console.log(`[EventMessageWorker] ⏭️ Message ${message_id} cancelled, skipping`);
      return { success: true, skipped: true, reason: 'cancelled' };
    }

    // Verify contractor has phone number
    if (!message.phone) {
      console.error(`[EventMessageWorker] ❌ Contractor ${contractor_id} has no phone number`);

      // Mark as failed in database
      await query(`
        UPDATE event_messages
        SET status = 'failed',
            error_message = 'Contractor has no phone number',
            updated_at = NOW()
        WHERE id = $1
      `, [message_id]);

      return { success: false, error: 'No phone number' };
    }

    // Get personalized message content
    let messageText = message.message_content;

    // If message_content is empty, generate based on message_type
    if (!messageText || messageText.trim() === '') {
      messageText = await generateMessageContent(message);
    }

    // Personalize with contractor name
    const firstName = message.first_name || message.name?.split(' ')[0] || 'there';
    messageText = messageText.replace(/\{firstName\}/g, firstName);
    messageText = messageText.replace(/\{name\}/g, message.name || 'there');
    messageText = messageText.replace(/\{eventName\}/g, message.event_name || 'the event');

    // Process for multi-SMS if needed (using existing smsHelpers)
    const smsResult = processMessageForSMS(messageText, {
      allowMultiSMS: true,
      maxMessages: 3,
      context: { messageType: message.message_type }
    });

    // Send via n8n webhook (using existing outboundScheduler function)
    await outboundScheduler.sendViaWebhook(message.phone, smsResult.messages);

    // Mark as sent in database (using exact field names)
    await query(`
      UPDATE event_messages
      SET status = 'sent',
          actual_send_time = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [message_id]);

    console.log(`[EventMessageWorker] ✅ Message ${message_id} sent successfully to ${message.phone} (${smsResult.messages.length} SMS)`);

    return {
      success: true,
      message_id,
      contractor_id,
      message_type,
      phone: message.phone,
      sms_count: smsResult.messages.length,
      sent_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[EventMessageWorker] ❌ Error processing message ${message_id}:`, error);

    // Update database with error (using exact field names)
    try {
      await query(`
        UPDATE event_messages
        SET status = 'failed',
            error_message = $2,
            updated_at = NOW()
        WHERE id = $1
      `, [message_id, error.message]);
    } catch (dbError) {
      console.error(`[EventMessageWorker] Failed to update error status:`, dbError);
    }

    throw error; // Bull will retry
  }
}

/**
 * Generate message content based on message type
 * Routes AI-driven types through AI Concierge for conversational messaging
 * Uses templates for time-critical alerts
 */
async function generateMessageContent(message) {
  const firstName = message.first_name || message.name?.split(' ')[0] || 'there';
  const eventName = message.event_name || 'the event';

  // Parse personalization_data if exists
  const personalizationData = safeJsonParse(message.personalization_data, {});

  // Check if this message type should use AI for natural conversation
  if (AI_DRIVEN_MESSAGE_TYPES.includes(message.message_type)) {
    console.log(`[EventMessageWorker] Using AI Concierge for ${message.message_type}`);
    return await generateAIMessage(message, firstName, eventName, personalizationData);
  }

  // Otherwise use templates for fast, time-critical messages
  console.log(`[EventMessageWorker] Using template for ${message.message_type}`);

  switch (message.message_type) {
    case 'check_in_reminder_night_before':
      return `Hi ${firstName}! Reminder: ${eventName} is tomorrow! Check your email for your QR code and event details. See you soon!`;

    case 'check_in_reminder_1_hour':
      return `Hi ${firstName}! ${eventName} starts in 1 hour at ${message.event_location || 'the venue'}. Don't forget your QR code for check-in!`;

    case 'check_in_reminder_event_start':
      return `${eventName} is starting now! Head to the registration desk with your QR code to check in. Welcome!`;

    case 'speaker_alert':
      if (personalizationData.speaker_name) {
        return `📣 Upcoming session: "${personalizationData.session_title}" with ${personalizationData.speaker_name} in 15 minutes! Location: ${personalizationData.location || 'Main Hall'}`;
      }
      return `📣 Your recommended session starts in 15 minutes! Check the event app for details.`;

    case 'sponsor_recommendation':
      if (personalizationData.sponsor_name) {
        return `🤝 Check out ${personalizationData.sponsor_name} at booth ${personalizationData.booth_number || 'TBD'}! They're a great fit for your business goals.`;
      }
      return `🤝 Visit our sponsor booths during the break! We've identified great matches for you.`;

    case 'attendance_check':
      // Attendance confirmation for speaker sessions, sponsors, or peer matches
      if (personalizationData.attendance_type === 'speaker' && personalizationData.speaker_name) {
        return `Hi ${firstName}! Did you attend "${personalizationData.session_name}" with ${personalizationData.speaker_name}? Reply YES or NO.`;
      } else if (personalizationData.attendance_type === 'sponsor' && personalizationData.sponsor_name) {
        return `Hi ${firstName}! Did you visit ${personalizationData.sponsor_name}'s booth? Reply YES or NO.`;
      } else if (personalizationData.attendance_type === 'peer_match' && personalizationData.peer_name) {
        return `Hi ${firstName}! Did you get a chance to connect with ${personalizationData.peer_name}? Reply YES or NO.`;
      }
      return `Hi ${firstName}! Did you attend this session? Reply YES or NO.`;

    case 'pcr_request':
      if (personalizationData.speaker_name) {
        return `Did you attend "${personalizationData.session_title}" with ${personalizationData.speaker_name}? Reply YES or NO.`;
      } else if (personalizationData.sponsor_name) {
        return `Did you visit ${personalizationData.sponsor_name}'s booth? Reply YES or NO.`;
      }
      return `Did you attend this session/visit this sponsor? Reply YES or NO.`;

    case 'post_event_wrap_up':
      return `🎉 Thank you for attending ${eventName}! Check your email for your personalized event summary, connections made, and recommended next steps.`;

    case 'personalized_agenda':
      return `Hi ${firstName}! Your personalized agenda for ${eventName} is ready! Check your email for speaker recommendations, sponsor matches, and networking opportunities tailored to your goals.`;

    case 'registration_confirmation':
      return `✅ You're registered for ${eventName}! Check your email for event details and your QR code. We'll send reminders as the event approaches.`;

    case 'peer_match_introduction':
      if (personalizationData.peer_name && personalizationData.peer_company) {
        const peerFirstName = personalizationData.peer_name.split(' ')[0] || personalizationData.peer_name;
        const peerLocation = personalizationData.peer_location || 'a different market';
        const matchReason = personalizationData.match_reason || 'similar business challenges';

        return `Hey ${firstName}! 👋\n\n🤝 Find Your Peer: I found someone perfect for you to meet!\n\n${personalizationData.peer_name} from ${personalizationData.peer_company} (${peerLocation}) - ${matchReason}.\n\nThey're in a non-competing market, so this is a great chance to share strategies!\n\nReply YES to get an intro, or LATER if you want to connect during a break.`;
      }
      return `Hey ${firstName}! 👋 I found a great peer match for you at ${eventName}! Reply YES to get an introduction.`;

    default:
      return `Hi ${firstName}! You have a new message about ${eventName}. Check your email for details.`;
  }
}

/**
 * Generate AI-driven conversational message
 * Uses AI Concierge to create natural, personalized messages for relationship-building moments
 */
async function generateAIMessage(message, firstName, eventName, personalizationData) {
  try {
    // Build contractor object for AI Concierge context
    const contractor = {
      id: message.contractor_id,
      name: message.name,
      first_name: message.first_name,
      last_name: message.last_name,
      email: message.email,
      company_name: message.company_name
    };

    // Build context-specific prompt based on message type
    let prompt = '';

    switch (message.message_type) {
      case 'sponsor_recommendation':
        prompt = buildSponsorRecommendationPrompt(firstName, eventName, personalizationData);
        break;

      case 'attendance_check':
        prompt = buildAttendanceCheckPrompt(firstName, personalizationData);
        break;

      case 'pcr_request':
        prompt = buildPCRRequestPrompt(firstName, personalizationData);
        break;

      case 'sponsor_batch_check':
        prompt = buildSponsorBatchCheckPrompt(firstName, eventName, personalizationData);
        break;

      case 'post_event_wrap_up':
        prompt = buildPostEventWrapUpPrompt(firstName, eventName, personalizationData);
        break;

      default:
        // Fallback to template if AI prompt not defined
        console.log(`[EventMessageWorker] No AI prompt for ${message.message_type}, using fallback`);
        return `Hi ${firstName}! You have a message about ${eventName}.`;
    }

    // Generate AI response
    const aiResponse = await aiConciergeController.generateAIResponse(
      prompt,
      contractor,
      contractor.id
    );

    console.log(`[EventMessageWorker] AI generated ${message.message_type} message successfully`);
    return aiResponse;

  } catch (error) {
    console.error(`[EventMessageWorker] Error generating AI message:`, error);
    // Fallback to template if AI fails
    return `Hi ${firstName}! You have a message about ${eventName}.`;
  }
}

/**
 * Build prompts for each AI-driven message type
 */
function buildSponsorRecommendationPrompt(firstName, eventName, data) {
  const sponsors = data.sponsors || [];
  const sponsorList = sponsors.slice(0, 3).map((s, idx) =>
    `${idx + 1}. ${s.sponsor_name} - ${s.tagline || s.value_proposition || 'Strategic partner'}`
  ).join('\n');

  return `I'm at ${eventName} and it's break time - perfect for visiting sponsor booths!

Send me a warm, conversational message that:
- Reminds me it's a great time to visit sponsors
- Lists my top 3 recommended sponsors (based on my focus areas):
${sponsorList}
- Tells me to reply with a number (1, 2, or 3) to get talking points for that sponsor
- Keeps it friendly and helpful

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be conversational and warm
- Make it easy to take action
- NO fluff or filler words`;
}

function buildAttendanceCheckPrompt(firstName, data) {
  const type = data.attendance_type;
  const name = data.speaker_name || data.sponsor_name || data.peer_name || 'this session';

  return `I just attended ${name} at an event.

Send me a brief, friendly message asking if I attended/visited them. Keep it:
- Conversational and natural
- Simple YES/NO question
- Reference ${type === 'speaker' ? 'the session' : type === 'sponsor' ? 'their booth' : 'our meeting'}
- Warm but not pushy

CRITICAL SMS CONSTRAINTS:
- Maximum 160 characters
- Be friendly and casual
- Clear YES or NO ask`;
}

function buildPCRRequestPrompt(firstName, data) {
  return `I confirmed I attended/visited ${data.speaker_name || data.sponsor_name || 'a session'}.

Send me a brief message asking me to rate my experience on a 1-5 scale:
- Thank me for attending
- Ask for rating (1-5 where 5 is excellent)
- Keep it conversational
- Make it quick and easy

CRITICAL SMS CONSTRAINTS:
- Maximum 160 characters
- Be warm and appreciative
- Clear 1-5 rating ask`;
}

function buildSponsorBatchCheckPrompt(firstName, eventName, data) {
  const sponsors = data.prioritized_sponsors || data.sponsors || [];
  const sponsorList = sponsors.map((s, idx) =>
    `${idx + 1}. ${s.sponsor_name}${s.had_talking_points ? ' (you got talking points)' : ''}`
  ).join('\n');

  return `I just finished Day ${data.day_number || 1} of ${eventName}!

Send me a friendly end-of-day message asking which sponsors I visited:
- Thank me for attending
- List the sponsors I should have visited:
${sponsorList}
- Ask me to reply with the numbers I visited (e.g., "1" or "1,2")
- Keep it conversational and easy

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be warm and appreciative
- Make responding easy
- NO fluff`;
}

function buildPostEventWrapUpPrompt(firstName, eventName, data) {
  return `${eventName} just ended and I had a great time!

Send me a warm thank-you message that:
- Thanks me for attending
- Mentions I'll get a personalized summary via email
- References connections made (${data.peer_matches || 0} peers, ${data.sponsor_visits || 0} sponsors)
- Encourages continued engagement
- Feels genuine and appreciative

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be warm and personal
- Reference specific numbers
- End with future-focused CTA`;
}

// Create the worker
const worker = new Worker(
  'event-messages',
  processEventMessage,
  {
    connection,
    concurrency: 10, // Process up to 10 messages simultaneously
    limiter: {
      max: 20, // Max 20 jobs per minute (to respect SMS rate limits)
      duration: 60000
    }
  }
);

// Worker event listeners
worker.on('completed', (job, result) => {
  if (result.skipped) {
    console.log(`[EventMessageWorker] ⏭️ Job ${job.id} skipped:`, result.reason);
  } else {
    console.log(`[EventMessageWorker] ✅ Job ${job.id} completed successfully`);
  }
});

worker.on('failed', (job, err) => {
  console.error(`[EventMessageWorker] ❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

  // If all retries exhausted, log to error tracking
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`[EventMessageWorker] 🔴 Job ${job.id} PERMANENTLY FAILED - manual intervention required`);
  }
});

worker.on('error', (err) => {
  console.error('[EventMessageWorker] Worker error:', err);
});

worker.on('ready', () => {
  console.log('[EventMessageWorker] ✅ Worker ready and listening for jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[EventMessageWorker] Received SIGTERM, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[EventMessageWorker] Received SIGINT, closing worker...');
  await worker.close();
  process.exit(0);
});

console.log('[EventMessageWorker] 🚀 Event Message Worker started');
console.log('[EventMessageWorker] Redis:', process.env.REDIS_HOST || 'localhost');
console.log('[EventMessageWorker] Concurrency: 10');
console.log('[EventMessageWorker] Rate limit: 20 jobs/minute');

module.exports = worker;
