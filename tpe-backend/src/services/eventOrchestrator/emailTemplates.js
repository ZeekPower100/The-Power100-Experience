/**
 * HTML Email Templates for Event Orchestrator
 * Provides professional, well-formatted HTML emails with proper styling
 */

// Get environment-specific base URL
const getBaseUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:3002';
};

/**
 * Base email template wrapper with Power100 branding
 */
function wrapEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Power100 Experience</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f8f9fa; color: #000000;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

    <!-- Header with Power100 branding -->
    <div style="background-color: #FB0401; padding: 30px 40px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
        Power100 Experience
      </h1>
    </div>

    <!-- Main content area -->
    <div style="padding: 40px 40px 60px 40px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #dee2e6;">
      <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">
        © ${new Date().getFullYear()} Power100. All rights reserved.
      </p>
      <p style="margin: 0; color: #6c757d; font-size: 12px;">
        This email was sent to you because you're registered for a Power100 event.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Registration Confirmation Email Template
 */
function buildRegistrationConfirmationEmail(data) {
  const { firstName, eventName, eventDate, eventLocation, registrationId, registrationUrl } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      You're registered for <strong>${eventName}</strong>! Get ready for a personalized experience powered by The Power100.
    </p>

    <div style="background-color: #f8f9fa; border-left: 4px solid #FB0401; padding: 20px 25px; margin: 0 0 30px 0;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #FB0401;">
        📅 Event Details
      </h2>
      <ul style="margin: 0; padding: 0; list-style: none; font-size: 15px; line-height: 1.8;">
        <li style="margin: 0 0 10px 0;">
          <strong>Date:</strong> ${formattedDate}
        </li>
        <li style="margin: 0 0 10px 0;">
          <strong>Location:</strong> ${eventLocation}
        </li>
        <li style="margin: 0;">
          <strong>Confirmation #:</strong> ${registrationId}
        </li>
      </ul>
    </div>

    <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #000000;">
      📋 Next Steps
    </h2>
    <ol style="margin: 0 0 30px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
      <li style="margin: 0 0 10px 0;">Complete your profile for a personalized agenda</li>
      <li style="margin: 0 0 10px 0;">Review our speaker lineup</li>
      <li style="margin: 0;">Mark your calendar</li>
    </ol>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${registrationUrl || `${getBaseUrl()}/events`}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        View Event Portal
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      Looking forward to enhancing your event experience!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Profile Completion Reminder Email Template
 */
function buildProfileCompletionReminderEmail(data) {
  const { firstName, eventName, eventId } = data;

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      You're registered for <strong>${eventName}</strong>, but we noticed your profile isn't complete yet.
    </p>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px 25px; margin: 0 0 30px 0;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #856404;">
        🎯 Why complete your profile?
      </h2>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #856404;">
        <li style="margin: 0 0 10px 0;">Get personalized speaker recommendations</li>
        <li style="margin: 0 0 10px 0;">AI-matched networking opportunities</li>
        <li style="margin: 0 0 10px 0;">Customized event agenda</li>
        <li style="margin: 0;">Better ROI from the event</li>
      </ul>
    </div>

    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; text-align: center;">
      <strong>It only takes 2 minutes!</strong>
    </p>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/profile"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        Complete Your Profile
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      Looking forward to your experience at <strong>${eventName}</strong>!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Personalized Agenda Email Template
 */
function buildPersonalizedAgendaEmail(data) {
  const { firstName, eventName, eventDate, eventLocation, eventId, contractorId, recommendations } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let recommendationsHtml = '';
  if (recommendations && recommendations.length > 0) {
    const recItems = recommendations.map((rec, index) => `
      <div style="background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 6px;
                  padding: 20px; margin: 0 0 15px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #FB0401;">
          ${index + 1}. ${rec.title}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6c757d;">
          <strong>Time:</strong> ${rec.time}
        </p>
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #000000;">
          <strong>Why:</strong> ${rec.why}
        </p>
      </div>
    `).join('');

    recommendationsHtml = `
      <div style="margin: 30px 0;">
        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #000000;">
          ⭐ Your Personalized Recommendations
        </h2>
        ${recItems}
      </div>
    `;
  }

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      <strong>${eventName}</strong> is just 3 days away! Based on your focus areas,
      we've created a personalized agenda just for you.
    </p>

    <div style="background-color: #f8f9fa; border-left: 4px solid #FB0401; padding: 20px 25px; margin: 0 0 30px 0;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #FB0401;">
        📅 Event Information
      </h2>
      <ul style="margin: 0; padding: 0; list-style: none; font-size: 15px; line-height: 1.8;">
        <li style="margin: 0 0 10px 0;">
          <strong>Event:</strong> ${eventName}
        </li>
        <li style="margin: 0 0 10px 0;">
          <strong>Date:</strong> ${formattedDate}
        </li>
        <li style="margin: 0;">
          <strong>Location:</strong> ${eventLocation}
        </li>
      </ul>
    </div>

    ${recommendationsHtml}

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/agenda?contractor=${contractorId}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        View Full Agenda
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      Your personalized experience awaits!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Event Summary Email Template
 */
function buildEventSummaryEmail(data) {
  const { firstName, eventName, eventId, sessionData } = data;

  let sessionRecapHtml = '';
  if (sessionData && sessionData.attended_sessions && sessionData.attended_sessions.length > 0) {
    const sessionItems = sessionData.attended_sessions.map((session, index) => `
      <li style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.6;">
        <strong>${session.title}</strong> - ${session.speaker}
      </li>
    `).join('');

    sessionRecapHtml = `
      <div style="margin: 30px 0;">
        <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #000000;">
          📚 Sessions You Attended
        </h2>
        <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
          ${sessionItems}
        </ul>
      </div>
    `;
  }

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      How was your experience at <strong>${eventName}</strong>? We hope the personalized recommendations were valuable!
    </p>

    ${sessionRecapHtml}

    <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px 25px; margin: 30px 0;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #155724;">
        🚀 Next Steps
      </h2>
      <ol style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8; color: #155724;">
        <li style="margin: 0 0 10px 0;">Access session recordings and resources</li>
        <li style="margin: 0 0 10px 0;">Connect with speakers and attendees you met</li>
        <li style="margin: 0 0 10px 0;">Schedule demos with recommended partners</li>
        <li style="margin: 0;">Complete our quick feedback survey</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/resources"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        Access Your Resources
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      We're here to support your continued growth!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Agenda Ready Notification Email Template
 * Sent immediately after AI completes recommendations
 */
function buildAgendaReadyEmail(data) {
  const { firstName, eventName, eventId, contractorId, speakerCount, sponsorCount, peerCount } = data;

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 18px; line-height: 1.6; color: #FB0401; font-weight: bold;">
      Great news! Your personalized event agenda is ready! 🎉
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Our AI has analyzed your business profile and curated the perfect event experience for <strong>${eventName}</strong>.
    </p>

    <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px 25px; margin: 0 0 30px 0;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #28a745;">
        ✨ Your Personalized Recommendations
      </h2>
      <ul style="margin: 0; padding: 0; list-style: none; font-size: 15px; line-height: 1.8;">
        <li style="margin: 0 0 10px 0;">
          🎤 <strong>${speakerCount} Must-See Speakers</strong> - Matched to your focus areas
        </li>
        <li style="margin: 0 0 10px 0;">
          🤝 <strong>${sponsorCount} Recommended Sponsors</strong> - Solutions for your business needs
        </li>
        <li style="margin: 0;">
          👥 <strong>${peerCount} Networking Matches</strong> - Ideal peer connections
        </li>
      </ul>
    </div>

    <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 20px 25px; margin: 0 0 30px 0;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #0c5460;">
        💡 <strong>Pro Tip:</strong> Review your agenda before the event so you can plan your day and maximize your ROI!
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/agenda?contractor=${contractorId}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        View Your Personalized Agenda
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      Your personalized <strong>${eventName}</strong> experience is ready!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Check-In Reminder - Night Before Event
 * Sent 24 hours before event start
 */
function buildCheckInReminderNightBefore(data) {
  const { firstName, eventName, eventDate, eventLocation, eventId, contractorId } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const eventTime = new Date(eventDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 18px; line-height: 1.6; color: #FB0401; font-weight: bold;">
      Tomorrow's the big day! 🎉
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      <strong>${eventName}</strong> is happening tomorrow. Save time by checking in now!
    </p>

    <div style="background-color: #f8f9fa; border-left: 4px solid #FB0401; padding: 20px 25px; margin: 0 0 30px 0;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #FB0401;">
        📅 Event Details
      </h2>
      <ul style="margin: 0; padding: 0; list-style: none; font-size: 15px; line-height: 1.8;">
        <li style="margin: 0 0 10px 0;">
          <strong>When:</strong> ${formattedDate} at ${eventTime}
        </li>
        <li style="margin: 0;">
          <strong>Where:</strong> ${eventLocation}
        </li>
      </ul>
    </div>

    <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px 25px; margin: 0 0 30px 0;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #155724;">
        ⚡ <strong>Quick Tip:</strong> Check in now to skip the line tomorrow and get instant access to your personalized agenda!
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/check-in?contractor=${contractorId}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        Check In Now
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      Your personalized experience is ready!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Check-In Reminder - 1 Hour Before Event
 * Only sent if not checked in yet
 */
function buildCheckInReminder1HourBefore(data) {
  const { firstName, eventName, eventLocation, eventId, contractorId } = data;

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 18px; line-height: 1.6; color: #FB0401; font-weight: bold;">
      <strong>${eventName}</strong> starts in 1 hour! ⏰
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      We noticed you haven't checked in yet. Check in now to access your personalized agenda!
    </p>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px 25px; margin: 0 0 30px 0;">
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #856404;">
        📍 <strong>Location:</strong> ${eventLocation}
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/check-in?contractor=${contractorId}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        Check In Now
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      Get ready for your personalized experience!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Check-In Reminder - Event Start
 * Only sent if not checked in within the hour
 */
function buildCheckInReminderEventStart(data) {
  const { firstName, eventName, eventId, contractorId } = data;

  const content = `
    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 25px 0; font-size: 18px; line-height: 1.6; color: #FB0401; font-weight: bold;">
      <strong>${eventName}</strong> is starting now! 🚀
    </p>

    <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
      Check in to unlock your personalized event experience!
    </p>

    <div style="text-align: center; margin: 40px 0 0 0;">
      <a href="${getBaseUrl()}/events/${eventId}/check-in?contractor=${contractorId}"
         style="display: inline-block; background-color: #28a745; color: #ffffff;
                padding: 15px 40px; text-decoration: none; border-radius: 6px;
                font-weight: bold; font-size: 16px;">
        Check In Now
      </a>
    </div>

    <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #000000;">
      We're excited to have you here!<br>
      <strong>Power100 Team</strong>
    </p>
  `;

  return wrapEmailTemplate(content);
}

module.exports = {
  buildRegistrationConfirmationEmail,
  buildProfileCompletionReminderEmail,
  buildPersonalizedAgendaEmail,
  buildAgendaReadyEmail,
  buildEventSummaryEmail,
  buildCheckInReminderNightBefore,
  buildCheckInReminder1HourBefore,
  buildCheckInReminderEventStart
};
