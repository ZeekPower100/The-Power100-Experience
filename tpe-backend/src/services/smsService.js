const axios = require('axios');
const { buildTags } = require('../utils/tagBuilder');

// Initialize Twilio client only if credentials are provided (BACKUP ONLY - Not actively used)
let twilioClient = null;

if (process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio client initialized (backup only - all SMS via n8n)');
  } catch (error) {
    console.log('⚠️ Twilio initialization skipped:', error.message);
    console.log('   All SMS will route through n8n → GHL');
  }
} else {
  console.log('ℹ️ Twilio credentials not configured - all SMS via n8n → GHL');
}

/**
 * Send SMS via n8n webhook (backend-to-ghl endpoint)
 * Uses environment-aware webhook path
 */
async function sendViaWebhook(phone, message, tags = []) {
  try {
    const n8nWebhookUrl = process.env.NODE_ENV === 'production'
      ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
      : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

    await axios.post(n8nWebhookUrl, {
      send_via_ghl: {
        phone,
        message,
        from_name: 'Power100',
        timestamp: new Date().toISOString(),
        tags: tags
      }
    });

    console.log('[SMS Service] SMS sent via n8n webhook:', { phone, tags, webhook: n8nWebhookUrl });
    return { success: true, message: 'SMS sent via n8n' };
  } catch (error) {
    console.error('[SMS Service] Error sending via n8n webhook:', error.message);
    throw new Error('Failed to send SMS via n8n');
  }
}

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMSVerification = async (phoneNumber, code) => {
  // Format phone number
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Build message
  const message = `Your Power100 verification code is: ${code}. This code expires in 10 minutes.`;

  // Build tags for GHL contact tagging
  const tags = buildTags({
    category: 'verification',
    type: 'phone',
    recipient: 'contractor',
    channel: 'sms',
    status: 'sent'
  });

  // In development mode, log but still send via n8n
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS Verification Code for ${formattedPhone}: ${code}`);
  }

  // Send via n8n webhook (routes to GHL)
  return sendViaWebhook(formattedPhone, message, tags);
};

const sendSMSNotification = async (phoneNumber, message, tags = []) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // In development mode, log but still send via n8n
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS Notification to ${formattedPhone}: ${message}`);
  }

  // If no tags provided, use default notification tags
  const finalTags = tags.length > 0 ? tags : buildTags({
    category: 'notification',
    type: 'general',
    recipient: 'contractor',
    channel: 'sms',
    status: 'sent'
  });

  // Send via n8n webhook (routes to GHL)
  return sendViaWebhook(formattedPhone, message, finalTags);
};

const formatPhoneNumber = (phone) => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present (assuming US numbers)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Return as is if already formatted
  return phone.startsWith('+') ? phone : `+${cleaned}`;
};

const sendDemoReminder = async (contractor, partner, booking) => {
  const message = `Reminder: Your demo with ${partner.company_name} is scheduled for ${new Date(booking.scheduled_date).toLocaleString()}. They'll reach out with meeting details soon!`;

  // Build tags for demo reminder
  const tags = buildTags({
    category: 'booking',
    type: 'demo-reminder',
    recipient: 'contractor',
    channel: 'sms',
    status: 'sent',
    entityId: partner.id
  });

  return sendSMSNotification(contractor.phone, message, tags);
};

const sendWeeklyCoachingMessage = async (contractor) => {
  const messages = [
    "Hey {name}! How's your experience with {partner} going? Reply with FEEDBACK to share your thoughts.",
    "Hi {name}! Quick check-in: Have you scheduled your demo yet? Need any help?",
    "{name}, your Power100 coach here! Any challenges this week we can help with?",
    "Happy Friday {name}! How can we support your growth goals this week?"
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const personalizedMessage = randomMessage
    .replace('{name}', contractor.name.split(' ')[0])
    .replace('{partner}', contractor.matched_partner_name || 'your partner');

  // Build tags for weekly coaching
  const tags = buildTags({
    category: 'coaching',
    type: 'weekly-checkin',
    recipient: 'contractor',
    channel: 'sms',
    status: 'sent'
  });

  return sendSMSNotification(contractor.phone, personalizedMessage, tags);
};

module.exports = {
  generateVerificationCode,
  sendSMSVerification,
  sendSMSNotification,
  sendDemoReminder,
  sendWeeklyCoachingMessage,
  formatPhoneNumber
};