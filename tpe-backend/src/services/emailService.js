const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create nodemailer transporter for development
const devTransporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  ignoreTLS: true
});

const sendPartnerIntroEmail = async (contractor, partner) => {
  const emailData = {
    to: partner.contact_email,
    from: process.env.SENDGRID_FROM_EMAIL || 'concierge@power100.io',
    subject: `New Power100 Match: ${contractor.company_name} - ${contractor.primary_focus_area?.replace(/_/g, ' ')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; padding: 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">Power100 Partner Introduction</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333;">New Contractor Match!</h2>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #FB0401; margin-top: 0;">Contractor Details</h3>
            <p><strong>Name:</strong> ${contractor.name}</p>
            <p><strong>Company:</strong> ${contractor.company_name}</p>
            <p><strong>Email:</strong> ${contractor.email}</p>
            <p><strong>Phone:</strong> ${contractor.phone}</p>
            <p><strong>Service Area:</strong> ${contractor.service_area}</p>
            <p><strong>Annual Revenue:</strong> ${contractor.annual_revenue?.replace(/_/g, ' ')}</p>
            <p><strong>Team Size:</strong> ${contractor.team_size} employees</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #FB0401; margin-top: 0;">Focus Areas</h3>
            <p><strong>Primary:</strong> ${contractor.primary_focus_area?.replace(/_/g, ' ')}</p>
            <p><strong>All Areas:</strong> ${contractor.focus_areas?.map(a => a.replace(/_/g, ' ')).join(', ')}</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #FB0401; margin-top: 0;">Growth Indicators</h3>
            <ul style="list-style: none; padding: 0;">
              <li>✓ Increased Tools Investment: ${contractor.increased_tools ? 'Yes' : 'No'}</li>
              <li>✓ Increased Headcount: ${contractor.increased_people ? 'Yes' : 'No'}</li>
              <li>✓ Increased Marketing Activity: ${contractor.increased_activity ? 'Yes' : 'No'}</li>
            </ul>
          </div>
          
          <div style="background-color: #28a745; color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin-top: 0;">Next Steps</h3>
            <p>Please reach out to ${contractor.name} within 24 hours to schedule a demo.</p>
            <p>They've opted in for coaching and are expecting your call!</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
            <p>This introduction was facilitated by Power100 Experience</p>
            <p>Questions? Contact us at concierge@power100.io</p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailData);
};

const sendContractorWelcomeEmail = async (contractor, partner) => {
  const emailData = {
    to: contractor.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'concierge@power100.io',
    subject: `Welcome to Power100! Meet Your Perfect Partner: ${partner.company_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; padding: 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">Welcome to Power100 Experience!</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333;">Congratulations, ${contractor.name}! 🎉</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            We've found your perfect strategic partner based on your business goals and growth indicators.
          </p>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #FB0401;">
            <h3 style="color: #FB0401; margin-top: 0;">Your Matched Partner</h3>
            <h4 style="margin: 10px 0;">${partner.company_name}</h4>
            <p>${partner.description}</p>
            <p><strong>PowerConfidence Score:</strong> ${partner.power_confidence_score}/100</p>
            <p><strong>Website:</strong> <a href="${partner.website}" style="color: #FB0401;">${partner.website}</a></p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What Happens Next?</h3>
            <ol style="line-height: 1.8;">
              <li>${partner.company_name} will contact you within 24 hours</li>
              <li>They'll schedule a personalized demo based on your needs</li>
              <li>You'll receive weekly coaching check-ins via SMS</li>
              <li>We'll follow up after your demo to ensure success</li>
            </ol>
          </div>
          
          <div style="background-color: #28a745; color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Success is Our Mission</h3>
            <p>We're here to support your growth journey every step of the way!</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
            <p>Need help? Reply to this email or text HELP to your coaching number</p>
            <p>Power100 Experience | concierge@power100.io</p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailData);
};

const sendDemoReminderEmail = async (contractor, partner, booking) => {
  const emailData = {
    to: contractor.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'concierge@power100.io',
    subject: `Reminder: Your demo with ${partner.company_name} is tomorrow!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; padding: 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">Demo Reminder</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333;">Hi ${contractor.name}!</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Just a friendly reminder about your upcoming demo:
          </p>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #FB0401;">
            <h3 style="color: #FB0401; margin-top: 0;">Demo Details</h3>
            <p><strong>Partner:</strong> ${partner.company_name}</p>
            <p><strong>Date & Time:</strong> ${new Date(booking.scheduled_date).toLocaleString()}</p>
            ${booking.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${booking.meeting_link}" style="color: #FB0401;">Join Demo</a></p>` : ''}
          </div>
          
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Prepare for Success</h3>
            <ul style="line-height: 1.8;">
              <li>Have your business goals ready to discuss</li>
              <li>Prepare questions about implementation timeline</li>
              <li>Think about your team's specific needs</li>
              <li>Be ready to discuss your budget range</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
            <p>Need to reschedule? Contact ${partner.contact_email}</p>
            <p>Power100 Experience | concierge@power100.io</p>
          </div>
        </div>
      </div>
    `
  };

  return sendEmail(emailData);
};

const sendEmail = async (emailData) => {
  // In development, log emails
  if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
    console.log('📧 Email (dev mode):', {
      to: emailData.to,
      subject: emailData.subject,
      preview: emailData.html.substring(0, 200) + '...'
    });
    return { success: true, message: 'Email logged (dev mode)' };
  }

  // Send via SendGrid in production
  if (process.env.SENDGRID_API_KEY) {
    try {
      const result = await sgMail.send(emailData);
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('SendGrid error:', error);
      throw new Error('Failed to send email');
    }
  }

  // Send via nodemailer in development with maildev
  try {
    const result = await devTransporter.sendMail(emailData);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email error:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = {
  sendPartnerIntroEmail,
  sendContractorWelcomeEmail,
  sendDemoReminderEmail,
  sendEmail
};