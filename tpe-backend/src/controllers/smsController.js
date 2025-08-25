// SMS Campaign and Subscription Management Controller  
const { query } = require('../config/database.sqlite');

// Get SMS subscriptions
const getSmsSubscriptions = async (req, res) => {
  try {
    const { contractorId, optedIn, phone } = req.query;
    
    let query = `
      SELECT ss.*, c.name as contractor_name, c.email as contractor_email
      FROM sms_subscriptions ss
      JOIN contractors c ON ss.contractor_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (contractorId) {
      params.push(contractorId);
      query += ` AND ss.contractor_id = $${++paramCount}`;
    }
    
    if (optedIn !== undefined) {
      params.push(optedIn === 'true');
      query += ` AND ss.opted_in = $${++paramCount}`;
    }
    
    if (phone) {
      params.push(`%${phone}%`);
      query += ` AND ss.phone_number ILIKE $${++paramCount}`;
    }
    
    query += ' ORDER BY ss.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Get subscription statistics
    const statsResult = await pool.query(`
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
    const existingResult = await pool.query(`
      SELECT * FROM sms_subscriptions 
      WHERE contractor_id = $1 AND phone_number = $2
    `, [contractorId, phoneNumber]);

    if (existingResult.rows.length > 0) {
      // Update existing subscription
      const result = await pool.query(`
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
      const result = await pool.query(`
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

    let query, params;
    if (contractorId) {
      query = `
        UPDATE sms_subscriptions 
        SET opted_in = false, opted_out_at = CURRENT_TIMESTAMP
        WHERE contractor_id = $1
        RETURNING *
      `;
      params = [contractorId];
    } else {
      query = `
        UPDATE sms_subscriptions 
        SET opted_in = false, opted_out_at = CURRENT_TIMESTAMP
        WHERE phone_number = $1
        RETURNING *
      `;
      params = [phoneNumber];
    }

    const result = await pool.query(query, params);

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
    
    let query = `
      SELECT sc.*, 
             p.company_name as partner_name,
             au.full_name as created_by_name
      FROM sms_campaigns sc
      LEFT JOIN partners p ON sc.partner_id = p.id
      LEFT JOIN admin_users au ON sc.created_by = au.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      params.push(status);
      query += ` AND sc.status = $${++paramCount}`;
    }
    
    if (partnerId) {
      params.push(partnerId);
      query += ` AND sc.partner_id = $${++paramCount}`;
    }
    
    query += ' ORDER BY sc.created_at DESC';
    
    const result = await pool.query(query, params);
    
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
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM sms_subscriptions ss
        JOIN contractors c ON ss.contractor_id = c.id
        WHERE ss.opted_in = true
      `);
      recipientCount = parseInt(countResult.rows[0].count);
    } else if (partnerId) {
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM sms_subscriptions ss
        JOIN contractors c ON ss.contractor_id = c.id
        JOIN demo_bookings db ON c.id = db.contractor_id
        WHERE ss.opted_in = true AND db.partner_id = $1
      `, [partnerId]);
      recipientCount = parseInt(countResult.rows[0].count);
    }

    const result = await pool.query(`
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
    const campaignResult = await pool.query(`
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
    let queryParams = [];

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

    const recipientsResult = await pool.query(recipientsQuery, queryParams);
    const recipients = recipientsResult.rows;

    // Create feedback surveys for each recipient (for feedback collection campaigns)
    if (campaign.campaign_name.toLowerCase().includes('feedback') || 
        campaign.campaign_name.toLowerCase().includes('survey')) {
      
      const currentQuarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
      
      for (const recipient of recipients) {
        // Create survey for this contractor-partner combination
        const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/feedback/survey?contractor=${recipient.contractor_id}&partner=${campaign.partner_id}`;
        
        await pool.query(`
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
    await pool.query(`
      UPDATE sms_campaigns 
      SET status = 'sent', 
          sent_at = CURRENT_TIMESTAMP,
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
    const campaignPerformanceResult = await pool.query(`
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
    const subscriptionTrendsResult = await pool.query(`
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
    const subscriptionStatsResult = await pool.query(`
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

module.exports = {
  getSmsSubscriptions,
  createSmsSubscription,
  handleSmsOptOut,
  getSmsCampaigns,
  createSmsCampaign,
  launchSmsCampaign,
  getSmsAnalytics
};