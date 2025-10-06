// DATABASE-CHECKED: contractors, event_messages, routing_logs columns verified on 2025-10-04
// SMS Campaign and Subscription Management Controller
const { query } = require('../config/database');
const aiRouter = require('../services/aiRouter');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// Get SMS subscriptions
const getSmsSubscriptions = async (req, res) => {
  try {
    const { contractorId, optedIn, phone } = req.query;
    
    let queryStr = `
      SELECT ss.*, c.name as contractor_name, c.email as contractor_email
      FROM sms_subscriptions ss
      JOIN contractors c ON ss.contractor_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (contractorId) {
      params.push(contractorId);
      queryStr += ` AND ss.contractor_id = $${++paramCount}`;
    }
    
    if (optedIn !== undefined) {
      params.push(optedIn === 'true');
      queryStr += ` AND ss.opted_in = $${++paramCount}`;
    }
    
    if (phone) {
      params.push(`%${phone}%`);
      queryStr += ` AND ss.phone_number ILIKE $${++paramCount}`;
    }
    
    queryStr += ' ORDER BY ss.created_at DESC';
    
    const result = await query(queryStr, params);
    
    // Get subscription statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN opted_in = true THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN opted_in = false THEN 1 END) as opted_out_subscriptions,
        COUNT(CASE WHEN created_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_subscriptions
      FROM sms_subscriptions
    `);
    
    res.json({
      success: true,
      subscriptions: result.rows,
      statistics: statsResult.rows[0],
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching SMS subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS subscriptions',
      error: error.message
    });
  }
};

// Create or update SMS subscription
const createSmsSubscription = async (req, res) => {
  try {
    const { contractorId, phoneNumber, optedIn = true, subscriptionSource = 'admin' } = req.body;

    // Validate required fields
    if (!contractorId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Contractor ID and phone number are required'
      });
    }

    // Check if subscription already exists
    const existingResult = await query(`
      SELECT * FROM sms_subscriptions 
      WHERE contractor_id = $1 AND phone_number = $2
    `, [contractorId, phoneNumber]);

    if (existingResult.rows.length > 0) {
      // Update existing subscription
      const result = await query(`
        UPDATE sms_subscriptions 
        SET opted_in = $1, 
            opted_in_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE opted_in_at END,
            opted_out_at = CASE WHEN $1 = false THEN CURRENT_TIMESTAMP ELSE NULL END,
            subscription_source = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE contractor_id = $3 AND phone_number = $4
        RETURNING *
      `, [optedIn, subscriptionSource, contractorId, phoneNumber]);

      res.json({
        success: true,
        subscription: result.rows[0],
        message: 'SMS subscription updated successfully'
      });
    } else {
      // Create new subscription
      const result = await query(`
        INSERT INTO sms_subscriptions (
          contractor_id, phone_number, opted_in, subscription_source,
          opted_in_at, opted_out_at
        ) VALUES ($1, $2, $3, $4, 
          CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
          CASE WHEN $3 = false THEN CURRENT_TIMESTAMP ELSE NULL END
        )
        RETURNING *
      `, [contractorId, phoneNumber, optedIn, subscriptionSource]);

      res.status(201).json({
        success: true,
        subscription: result.rows[0],
        message: 'SMS subscription created successfully'
      });
    }
  } catch (error) {
    console.error('Error creating SMS subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SMS subscription',
      error: error.message
    });
  }
};

// Handle SMS opt-out
const handleSmsOptOut = async (req, res) => {
  try {
    const { phoneNumber, contractorId } = req.body;

    if (!phoneNumber && !contractorId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or contractor ID is required'
      });
    }

    let queryStr, params;
    if (contractorId) {
      queryStr = `
        UPDATE sms_subscriptions 
        SET opted_in = false, opted_out_at = CURRENT_TIMESTAMP
        WHERE contractor_id = $1
        RETURNING *
      `;
      params = [contractorId];
    } else {
      queryStr = `
        UPDATE sms_subscriptions 
        SET opted_in = false, opted_out_at = CURRENT_TIMESTAMP
        WHERE phone_number = $1
        RETURNING *
      `;
      params = [phoneNumber];
    }

    const result = await query(queryStr, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'SMS subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Successfully opted out of SMS notifications',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Error handling SMS opt-out:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process opt-out request',
      error: error.message
    });
  }
};

// Get SMS campaigns
const getSmsCampaigns = async (req, res) => {
  try {
    const { status, partnerId } = req.query;
    
    let queryStr = `
      SELECT sc.*, 
             p.company_name as partner_name,
             au.full_name as created_by_name
      FROM sms_campaigns sc
      LEFT JOIN strategic_partners p ON sc.partner_id = p.id
      LEFT JOIN admin_users au ON sc.created_by = au.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      params.push(status);
      queryStr += ` AND sc.status = $${++paramCount}`;
    }
    
    if (partnerId) {
      params.push(partnerId);
      queryStr += ` AND sc.partner_id = $${++paramCount}`;
    }
    
    queryStr += ' ORDER BY sc.created_at DESC';
    
    const result = await query(queryStr, params);
    
    res.json({
      success: true,
      campaigns: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching SMS campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS campaigns',
      error: error.message
    });
  }
};

// Create SMS campaign
const createSmsCampaign = async (req, res) => {
  try {
    const {
      campaignName,
      messageTemplate,
      partnerId,
      targetAudience = 'all_partners',
      scheduledAt
    } = req.body;

    // Validate required fields
    if (!campaignName || !messageTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name and message template are required'
      });
    }

    // Calculate target recipients based on audience
    let recipientCount = 0;
    if (targetAudience === 'all_partners') {
      const countResult = await query(`
        SELECT COUNT(*) FROM sms_subscriptions ss
        JOIN contractors c ON ss.contractor_id = c.id
        WHERE ss.opted_in = true
      `);
      recipientCount = parseInt(countResult.rows[0].count);
    } else if (partnerId) {
      const countResult = await query(`
        SELECT COUNT(*) FROM sms_subscriptions ss
        JOIN contractors c ON ss.contractor_id = c.id
        JOIN demo_bookings db ON c.id = db.contractor_id
        WHERE ss.opted_in = true AND db.partner_id = $1
      `, [partnerId]);
      recipientCount = parseInt(countResult.rows[0].count);
    }

    const result = await query(`
      INSERT INTO sms_campaigns (
        campaign_name, message_template, partner_id, target_audience,
        scheduled_at, total_recipients, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      campaignName, messageTemplate, partnerId, targetAudience,
      scheduledAt, recipientCount, req.adminUser?.id
    ]);

    res.status(201).json({
      success: true,
      campaign: result.rows[0],
      estimatedRecipients: recipientCount
    });
  } catch (error) {
    console.error('Error creating SMS campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SMS campaign',
      error: error.message
    });
  }
};

// Launch SMS campaign (simulate sending)
const launchSmsCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Get campaign details
    const campaignResult = await query(`
      SELECT * FROM sms_campaigns WHERE id = $1
    `, [campaignId]);

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Campaign has already been launched or is not in pending status'
      });
    }

    // Get target recipients
    let recipientsQuery;
    let queryStrParams = [];

    if (campaign.target_audience === 'all_partners') {
      recipientsQuery = `
        SELECT DISTINCT ss.contractor_id, ss.phone_number, c.name as contractor_name
        FROM sms_subscriptions ss
        JOIN contractors c ON ss.contractor_id = c.id
        WHERE ss.opted_in = true
      `;
    } else if (campaign.partner_id) {
      recipientsQuery = `
        SELECT DISTINCT ss.contractor_id, ss.phone_number, c.name as contractor_name
        FROM sms_subscriptions ss
        JOIN contractors c ON ss.contractor_id = c.id
        JOIN demo_bookings db ON c.id = db.contractor_id
        WHERE ss.opted_in = true AND db.partner_id = $1
      `;
      queryParams = [campaign.partner_id];
    }

    const recipientsResult = await query(recipientsQuery, queryParams);
    const recipients = recipientsResult.rows;

    // Create feedback surveys for each recipient (for feedback collection campaigns)
    if (campaign.campaign_name.toLowerCase().includes('feedback') || 
        campaign.campaign_name.toLowerCase().includes('survey')) {
      
      const currentQuarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
      
      for (const recipient of recipients) {
        // Create survey for this contractor-partner combination
        const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/feedback/survey?contractor=${recipient.contractor_id}&partner=${campaign.partner_id}`;
        
        await query(`
          INSERT INTO feedback_surveys (
            partner_id, contractor_id, survey_type, quarter,
            survey_url, expires_at, sms_campaign_id, status
          ) VALUES ($1, $2, 'quarterly', $3, $4, $5, $6, 'sent')
          ON CONFLICT DO NOTHING
        `, [
          campaign.partner_id,
          recipient.contractor_id,
          currentQuarter,
          surveyUrl,
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Expires in 14 days
          campaignId
        ]);
      }
    }

    // Update campaign status (simulate sending)
    await query(`
      UPDATE sms_campaigns 
      SET status = 'sent', 
          actual_send_time = CURRENT_TIMESTAMP,
          total_delivered = $1
      WHERE id = $2
    `, [recipients.length, campaignId]);

    res.json({
      success: true,
      message: `Campaign launched successfully to ${recipients.length} recipients`,
      campaignId,
      recipientCount: recipients.length,
      // In production, this would integrate with Twilio or another SMS service
      note: 'SMS integration with Twilio will be implemented in production deployment'
    });
  } catch (error) {
    console.error('Error launching SMS campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to launch SMS campaign',
      error: error.message
    });
  }
};

// Get SMS analytics and performance
const getSmsAnalytics = async (req, res) => {
  try {
    const { timeframe = '30days' } = req.query;
    
    const days = timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : 90;

    // Get campaign performance
    const campaignPerformanceResult = await query(`
      SELECT 
        COUNT(*) as total_campaigns,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as completed_campaigns,
        SUM(total_recipients) as total_messages_sent,
        SUM(total_delivered) as total_delivered,
        SUM(total_responses) as total_responses,
        AVG(CASE WHEN total_recipients > 0 THEN (total_delivered::float / total_recipients) * 100 END) as avg_delivery_rate,
        AVG(CASE WHEN total_delivered > 0 THEN (total_responses::float / total_delivered) * 100 END) as avg_response_rate
      FROM sms_campaigns
      WHERE created_at > CURRENT_DATE - INTERVAL '${days} days'
    `);

    // Get subscription trends
    const subscriptionTrendsResult = await query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as new_subscriptions,
        COUNT(CASE WHEN opted_in = true THEN 1 END) as opt_ins,
        COUNT(CASE WHEN opted_in = false THEN 1 END) as opt_outs
      FROM sms_subscriptions
      WHERE created_at > CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `);

    // Get overall subscription stats
    const subscriptionStatsResult = await query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN opted_in = true THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN opted_out_at > CURRENT_DATE - INTERVAL '${days} days' THEN 1 END) as recent_opt_outs
      FROM sms_subscriptions
    `);

    res.json({
      success: true,
      campaignPerformance: campaignPerformanceResult.rows[0],
      subscriptionTrends: subscriptionTrendsResult.rows,
      subscriptionStats: subscriptionStatsResult.rows[0],
      timeframe: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching SMS analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS analytics',
      error: error.message
    });
  }
};

/**
 * Handle inbound SMS from GHL webhook
 * This is the single entry point for ALL inbound SMS
 */
const handleInbound = async (req, res, next) => {
  try {
    console.log('[SMS] Inbound message received:', req.body);

    // Parse n8n formatted payload (using DATABASE field names for perfect alignment)
    const {
      phone,
      message_content,
      ghl_contact_id,
      ghl_location_id,
      ghl_conversation_id,
      ghl_message_id,
      timestamp
    } = req.body;

    // message_content is already extracted by n8n from GHL's nested message.body
    const messageText = message_content;

    if (!phone || !messageText) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }

    // Step 1: Lookup contractor by phone
    const contractorResult = await query(`
      SELECT
        id,
        CONCAT(first_name, ' ', last_name) as name,
        company_name,
        email,
        phone
      FROM contractors
      WHERE phone = $1
      LIMIT 1
    `, [phone]);

    if (contractorResult.rows.length === 0) {
      console.log('[SMS] Contractor not found for phone:', phone);
      return res.json({
        success: false,
        message: 'Contractor not found',
        ignored: true
      });
    }

    const contractor = contractorResult.rows[0];
    console.log('[SMS] Contractor found:', contractor.id, contractor.name);

    // Step 2: Get current event context (if any)
    const eventResult = await query(`
      SELECT e.id, e.name as event_name, e.date as event_date
      FROM events e
      JOIN event_attendees ea ON e.id = ea.event_id
      WHERE ea.contractor_id = $1
        AND e.date >= CURRENT_DATE - INTERVAL '1 day'
        AND e.date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY e.date ASC
      LIMIT 1
    `, [contractor.id]);

    const eventContext = eventResult.rows.length > 0 ? eventResult.rows[0] : null;

    // Step 3: Classify intent using AI Router
    const classification = await aiRouter.classifyIntent(
      messageText,
      contractor,
      eventContext
    );

    console.log('[SMS] Classification result:', classification);

    // Step 4: Log routing decision
    await aiRouter.logRoutingDecision(
      classification,
      contractor.id,
      eventContext?.id || null,
      phone,
      ghl_contact_id,
      ghl_location_id,
      messageText
    );

    // Step 5: Route to appropriate handler
    const handlerResult = await aiRouter.route(classification, {
      contractor,
      eventContext,
      phone,
      messageText,
      ghl_contact_id,
      ghl_location_id,
      timestamp
    });

    // Step 6: Send SMS if handler returned message(s)
    if (handlerResult.action === 'send_message') {
      // Support both single message (legacy) and multiple messages (new)
      const messages = handlerResult.messages || (handlerResult.message ? [handlerResult.message] : []);

      if (messages.length > 0) {
        console.log(`[SMS] Handler requested ${messages.length} message(s) send, triggering outbound SMS`);

        // Trigger outbound n8n workflow
        const n8nWebhookUrl = process.env.NODE_ENV === 'production'
          ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
          : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

        const basePayload = {
          contractor_id: handlerResult.contractor_id || contractor.id,
          phone: handlerResult.phone || phone,
          ghl_contact_id,
          ghl_location_id,
          message_type: handlerResult.message_type || 'response',
          event_id: eventContext?.id,
          event_name: eventContext?.event_name,
          contractor_name: contractor.name,
          email: contractor.email
        };

        // Send each message with a small delay between multi-SMS
        let allSent = true;
        for (let i = 0; i < messages.length; i++) {
          const outboundPayload = {
            send_via_ghl: {
              ...basePayload,
              message: messages[i],
              is_multi_sms: messages.length > 1,
              message_index: i + 1,
              total_messages: messages.length
            }
          };

          try {
            const outboundResponse = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(outboundPayload)
            });

            if (outboundResponse.ok) {
              console.log(`[SMS] Outbound SMS ${i + 1}/${messages.length} triggered successfully`);

              // Save message to database immediately after successful send
              try {
                await query(`
                  INSERT INTO event_messages (
                    contractor_id,
                    event_id,
                    message_type,
                    direction,
                    message_content,
                    personalization_data,
                    ghl_contact_id,
                    ghl_location_id,
                    phone,
                    actual_send_time
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                `, [
                  basePayload.contractor_id,
                  basePayload.event_id || null,
                  basePayload.message_type,
                  'outbound',
                  messages[i], // SAVE ACTUAL MESSAGE CONTENT
                  safeJsonStringify(handlerResult.personalization_data || {}),
                  basePayload.ghl_contact_id,
                  basePayload.ghl_location_id,
                  basePayload.phone
                ]);
                console.log(`[SMS] Message ${i + 1}/${messages.length} saved to database`);
              } catch (dbError) {
                console.error(`[SMS] Error saving message ${i + 1}/${messages.length} to database:`, dbError);
                // Don't fail the whole flow if DB save fails
              }
            } else {
              console.error(`[SMS] Failed to trigger outbound SMS ${i + 1}/${messages.length}:`, await outboundResponse.text());
              allSent = false;
            }

            // Small delay between messages (500ms) to ensure proper order
            if (i < messages.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (smsError) {
            console.error(`[SMS] Error triggering outbound SMS ${i + 1}/${messages.length}:`, smsError);
            allSent = false;
          }
        }

        handlerResult.sms_sent = allSent;
        handlerResult.sms_count = messages.length;
      }
    }

    // Step 7: Return result
    res.json({
      success: true,
      message: 'Message routed successfully',
      route: classification.route_to,
      confidence: classification.confidence,
      routing_method: classification.routing_method,
      handler_result: handlerResult
    });

  } catch (error) {
    console.error('[SMS] Error handling inbound message:', error);
    next(error);
  }
};

/**
 * Send outbound SMS via GHL
 * Called by handlers to send responses
 */
const sendOutbound = async (req, res, next) => {
  try {
    console.log('[SMS] Outbound request:', req.body);

    const {
      contractor_id,
      phone,
      message,
      message_type,
      personalization_data,
      event_id,
      ghl_contact_id,
      ghl_location_id
    } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }

    // Get contractor info for tagging
    let contractor_name = null;
    let contractor_email = null;
    let event_name = null;

    if (contractor_id) {
      const contractorResult = await query(`
        SELECT CONCAT(first_name, ' ', last_name) as name, email
        FROM contractors
        WHERE id = $1
      `, [contractor_id]);

      if (contractorResult.rows.length > 0) {
        contractor_name = contractorResult.rows[0].name;
        contractor_email = contractorResult.rows[0].email;
      }
    }

    if (event_id) {
      const eventResult = await query(`
        SELECT name FROM events WHERE id = $1
      `, [event_id]);

      if (eventResult.rows.length > 0) {
        event_name = eventResult.rows[0].name;
      }
    }

    // Save to event_messages table
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        message_content,
        personalization_data,
        ghl_contact_id,
        ghl_location_id,
        phone,
        actual_send_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      contractor_id,
      event_id || null,
      message_type || 'general',
      'outbound',
      message,
      safeJsonStringify(personalization_data || {}),
      ghl_contact_id,
      ghl_location_id,
      phone
    ]);

    console.log('[SMS] Message saved to database, ID:', messageResult.rows[0].id);

    // Return payload for n8n to send via GHL
    res.json({
      success: true,
      message_id: messageResult.rows[0].id,
      send_via_ghl: {
        contractor_id,
        phone,
        message,
        message_type: message_type || 'general',
        ghl_contact_id,
        ghl_location_id: ghl_location_id || 'Jlq8gw3IEjAQu39n4c0s',
        contractor_name,
        email: contractor_email,
        event_id,
        event_name,
        personalization_data: personalization_data || {}
      }
    });

  } catch (error) {
    console.error('[SMS] Error sending outbound message:', error);
    next(error);
  }
};

module.exports = {
  getSmsSubscriptions,
  createSmsSubscription,
  handleSmsOptOut,
  getSmsCampaigns,
  createSmsCampaign,
  launchSmsCampaign,
  getSmsAnalytics,
  handleInbound,
  sendOutbound
};