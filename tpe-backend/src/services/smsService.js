const twilio = require('twilio');

// Initialize Twilio client only if credentials are provided
let twilioClient = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMSVerification = async (phoneNumber, code) => {
  // Format phone number
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // In development mode, just log the code
  if (process.env.NODE_ENV === 'development' && !twilioClient) {
    console.log(`📱 SMS Verification Code for ${formattedPhone}: ${code}`);
    return { success: true, message: 'SMS logged (dev mode)' };
  }

  // Send actual SMS in production
  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body: `Your Power100 verification code is: ${code}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('Twilio error:', error);
      throw new Error('Failed to send SMS verification');
    }
  }

  throw new Error('SMS service not configured');
};

const sendSMSNotification = async (phoneNumber, message) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  if (process.env.NODE_ENV === 'development' && !twilioClient) {
    console.log(`📱 SMS Notification to ${formattedPhone}: ${message}`);
    return { success: true, message: 'SMS logged (dev mode)' };
  }

  if (twilioClient) {
    try {
      const sms = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      return { success: true, messageId: sms.sid };
    } catch (error) {
      console.error('Twilio error:', error);
      throw new Error('Failed to send SMS notification');
    }
  }

  throw new Error('SMS service not configured');
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
  
  return sendSMSNotification(contractor.phone, message);
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

  return sendSMSNotification(contractor.phone, personalizedMessage);
};

module.exports = {
  generateVerificationCode,
  sendSMSVerification,
  sendSMSNotification,
  sendDemoReminder,
  sendWeeklyCoachingMessage,
  formatPhoneNumber
};