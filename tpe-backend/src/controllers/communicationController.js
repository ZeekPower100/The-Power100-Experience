const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// Communication Controller - Handles webhooks from n8n/GHL for SMS/Email tracking
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Webhook endpoint to receive communication data from n8n/GHL
const receiveCommunication = async (req, res) => {
  try {
    console.log('📧 Received communication webhook:', safeJsonStringify(req.body, null, 2));
    
    const {
      // GHL fields
      contactId,
      conversationId,
      messageId,
      type = 'sms', // sms, email, whatsapp
      direction, // inbound, outbound
      body,
      message_body, // Accept both body and message_body
      subject,
      from,
      to,
      status,
      attachments,
      
      // TPE-specific fields
      contractorId,
      partnerId,
      campaignId,
      flowType,
      flowStep,
      
      // Metadata
      metadata = {}
    } = req.body;

    // Generate thread ID if not provided
    const threadId = conversationId || uuidv4();
    
    // Determine participant types and IDs
    let fromType = 'system';
    let fromId = null;
    let toType = 'contractor';
    let toId = contractorId;
    
    if (direction === 'inbound') {
      fromType = 'contractor';
      fromId = contractorId;
      toType = 'system';
      toId = null;
    }
    
    // Insert into communication_logs
    const insertQuery = `
      INSERT INTO communication_logs (
        thread_id,
        message_id,
        communication_type,
        direction,
        status,
        from_type,
        from_id,
        from_email,
        from_phone,
        from_name,
        to_type,
        to_id,
        to_email,
        to_phone,
        to_name,
        subject,
        message_body,
        attachments,
        campaign_id,
        flow_type,
        flow_step,
        ghl_contact_id,
        ghl_conversation_id,
        ghl_message_id,
        external_provider,
        metadata,
        sent_at,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    const values = [
      threadId,
      messageId || uuidv4(),
      type,
      direction,
      status || 'delivered',
      fromType,
      fromId,
      from?.email || null,
      from?.phone || null,
      from?.name || null,
      toType,
      toId,
      to?.email || null,
      to?.phone || null,
      to?.name || null,
      subject,
      message_body || body, // Use message_body if provided, fallback to body
      safeJsonStringify(attachments || []),
      campaignId || null,
      flowType || null,
      flowStep || null,
      contactId || null,
      conversationId || null,
      messageId || null,
      'ghl',
      safeJsonStringify(metadata)
    ];
    
    await query(insertQuery, values);
    
    console.log('✅ Communication logged successfully');
    
    // Send success response
    res.status(200).json({
      success: true,
      message: 'Communication logged successfully',
      threadId: threadId
    });
    
  } catch (error) {
    console.error('❌ Error logging communication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log communication',
      details: error.message
    });
  }
};

// Get communication thread for a contractor
const getContractorCommunications = async (req, res) => {
  try {
    const { contractorId } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;
    
    let queryText = `
      SELECT * FROM communication_logs 
      WHERE (from_id = $1 AND from_type = 'contractor') 
         OR (to_id = $2 AND to_type = 'contractor')
    `;
    
    const params = [contractorId, contractorId];
    
    if (type) {
      queryText += ' AND communication_type = $' + (params.length + 1);
      params.push(type);
    }
    
    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(queryText, params);
    
    // Group by thread
    const threads = {};
    result.rows.forEach(msg => {
      if (!threads[msg.thread_id]) {
        threads[msg.thread_id] = {
          threadId: msg.thread_id,
          type: msg.communication_type,
          messages: []
        };
      }
      threads[msg.thread_id].messages.push(msg);
    });
    
    res.json({
      success: true,
      threads: Object.values(threads),
      totalMessages: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch communications'
    });
  }
};

// Update message status (for delivery/read receipts)
const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, timestamp } = req.body;
    
    let updateQuery = 'UPDATE communication_logs SET status = $1, updated_at = CURRENT_TIMESTAMP';
    const params = [status];
    
    // Add timestamp for specific statuses
    if (status === 'delivered') {
      updateQuery += ', delivered_at = $' + (params.length + 1);
      params.push(timestamp || new Date().toISOString());
    } else if (status === 'read') {
      updateQuery += ', read_at = $' + (params.length + 1);
      params.push(timestamp || new Date().toISOString());
    } else if (status === 'failed') {
      updateQuery += ', failed_at = $' + (params.length + 1) + ', error_message = $' + (params.length + 2);
      params.push(timestamp || new Date().toISOString());
      params.push(req.body.errorMessage || 'Delivery failed');
    }
    
    updateQuery += ' WHERE message_id = $' + (params.length + 1) + ' OR ghl_message_id = $' + (params.length + 2);
    params.push(messageId, messageId);
    
    await query(updateQuery, params);
    
    res.json({
      success: true,
      message: 'Message status updated'
    });
    
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message status'
    });
  }
};

module.exports = {
  receiveCommunication,
  getContractorCommunications,
  updateMessageStatus
};