// Re-send SMS with correct phone number
require('dotenv').config({ path: './tpe-backend/.env.development' });
const axios = require('axios');
const { query } = require('./tpe-backend/src/config/database');
const { buildTags } = require('./tpe-backend/src/utils/tagBuilder');

async function resendSMS() {
  console.log('\n📱 Re-sending SMS with correct phone number...\n');

  try {
    // Get the recipient with phone
    const recipientResult = await query(`
      SELECT pr.id, pr.recipient_name, pr.recipient_email, pr.recipient_phone, pr.survey_link, pr.campaign_id
      FROM power_card_recipients pr
      WHERE pr.campaign_id = 7
    `);

    if (recipientResult.rows.length === 0) {
      throw new Error('Recipient not found');
    }

    const recipient = recipientResult.rows[0];
    const surveyUrl = `http://localhost:3002/power-cards/survey/${recipient.survey_link}`;
    const firstName = recipient.recipient_name.split(' ')[0];

    console.log('Recipient:', recipient.recipient_name);
    console.log('Phone:', recipient.recipient_phone);
    console.log('Survey URL:', surveyUrl);

    // Build SMS message
    const smsMessage = `Hi ${firstName}! FieldForce wants your feedback. Take a quick 3-min survey: ${surveyUrl}`;

    console.log('\nSMS Message:', smsMessage);

    // Send SMS via n8n webhook
    const n8nWebhookBase = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
    const smsWebhook = `${n8nWebhookBase}/webhook/backend-to-ghl-dev`;

    const smsTags = buildTags({
      category: 'powercard',
      type: 'survey-invitation',
      recipient: 'external',
      channel: 'sms',
      status: 'sent',
      entityId: recipient.campaign_id
    });

    console.log('\nSending to webhook:', smsWebhook);
    console.log('Tags:', smsTags);

    await axios.post(smsWebhook, {
      send_via_ghl: {
        phone: recipient.recipient_phone,
        message: smsMessage,
        timestamp: new Date().toISOString(),
        tags: smsTags
      }
    }, { timeout: 10000 });

    console.log('\n✅ SMS sent successfully!');
    console.log('Check your phone:', recipient.recipient_phone);

    // Update message in database
    await query(`
      UPDATE power_card_messages
      SET recipient_phone = $1, message_content = $2, status = 'sent', sent_at = NOW()
      WHERE id = 2
    `, [recipient.recipient_phone, smsMessage]);

    console.log('✅ Database updated\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

resendSMS();
