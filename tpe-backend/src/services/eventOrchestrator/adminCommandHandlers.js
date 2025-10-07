// DATABASE-CHECKED: events, admin_users, event_messages columns verified on 2025-10-06
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Handle admin SMS commands
 * When CEO/admin sends SMS command to control event
 *
 * Supported Commands:
 * - DELAY [minutes] [event_code]
 * - MSG [ALL|CHECKEDIN|PENDING] [event_code]: [message]
 * - STATUS [event_code]
 * - CHECKIN [contractor_name] [event_code]
 * - CANCEL [message_type] [event_code]
 * - HELP
 */
async function handleAdminCommand(smsData, classification) {
  try {
    console.log('[AdminCommandHandler] Processing admin command:', smsData.messageText);

    // Parse the command using AI
    const parsedCommand = await parseAdminCommand(smsData.messageText);

    console.log('[AdminCommandHandler] Parsed command:', parsedCommand);

    // Verify this is from an authorized admin
    const isAuthorized = await verifyAdminAuthorization(smsData.phone);
    if (!isAuthorized) {
      return {
        success: false,
        action: 'send_message',
        messages: ['❌ Unauthorized. Contact admin@power100.io for SMS admin access.'],
        phone: smsData.phone,
        message_type: 'admin_unauthorized',
        response_sent: true
      };
    }

    // Route based on command type
    switch (parsedCommand.command_type) {
      case 'delay':
        return await handleDelayCommand(smsData, parsedCommand);

      case 'message':
        return await handleMessageCommand(smsData, parsedCommand);

      case 'status':
        return await handleStatusCommand(smsData, parsedCommand);

      case 'checkin':
        return await handleCheckinCommand(smsData, parsedCommand);

      case 'cancel':
        return await handleCancelCommand(smsData, parsedCommand);

      case 'help':
        return await handleHelpCommand(smsData, parsedCommand);

      default:
        return await handleUnknownCommand(smsData, parsedCommand);
    }

  } catch (error) {
    console.error('[AdminCommandHandler] Error handling admin command:', error);
    return {
      success: false,
      action: 'send_message',
      messages: [`❌ Error: ${error.message}. Reply HELP for command list.`],
      phone: smsData.phone,
      message_type: 'admin_command_error',
      response_sent: true,
      error: error.message
    };
  }
}

/**
 * Parse admin command using AI
 */
async function parseAdminCommand(messageText) {
  const prompt = `Parse this admin SMS command:

Message: "${messageText}"

Admin commands follow this pattern:
- DELAY [minutes] [event_code] - Delay all messages
- MSG [ALL|CHECKEDIN|PENDING] [event_code]: [message text] - Send custom message
- STATUS [event_code] - Get event status
- CHECKIN [contractor_name] [event_code] - Manual check-in
- CANCEL [message_type|ALL] [event_code] - Cancel messages
- HELP [optional_command] - Get help

Event codes are uppercase (e.g., OLS2025, TPE2025)

Respond in JSON:
{
  "command_type": "delay|message|status|checkin|cancel|help|unknown",
  "event_code": "extracted event code or null",
  "params": {
    // For DELAY: { "minutes": number }
    // For MSG: { "audience": "all|checkedin|pending", "message_content": "text" }
    // For STATUS: {}
    // For CHECKIN: { "contractor_name": "name" }
    // For CANCEL: { "message_type": "speaker_alert|sponsor_recommendation|all" }
    // For HELP: { "specific_command": "command or null" }
  },
  "confidence": 0-100
}`;

  try {
    // Use AI to parse command
    const aiResponse = await aiConciergeController.generateAIResponse(
      prompt,
      { name: 'Admin User' }, // Generic contractor data
      null // No contractor ID for admin commands
    );

    const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
    return parsed;
  } catch (error) {
    console.log('[AdminCommandHandler] AI parsing failed, using fallback');
    return fallbackCommandParser(messageText);
  }
}

/**
 * Fallback command parser if AI fails
 */
function fallbackCommandParser(text) {
  const upperText = text.toUpperCase().trim();
  const parts = upperText.split(' ');
  const command = parts[0];

  // Extract event code (uppercase letters + 4 digits)
  const eventCodeMatch = text.match(/\b([A-Z]{3}\d{4})\b/);
  const eventCode = eventCodeMatch ? eventCodeMatch[1] : null;

  if (command === 'DELAY') {
    return {
      command_type: 'delay',
      event_code: eventCode,
      params: { minutes: parseInt(parts[1]) || 15 },
      confidence: 80
    };
  } else if (command === 'MSG') {
    const audience = parts[1]; // ALL, CHECKEDIN, PENDING
    const colonIndex = text.indexOf(':');
    const messageContent = colonIndex > -1 ? text.substring(colonIndex + 1).trim() : '';

    return {
      command_type: 'message',
      event_code: eventCode,
      params: {
        audience: audience.toLowerCase(),
        message_content: messageContent
      },
      confidence: 80
    };
  } else if (command === 'STATUS') {
    return {
      command_type: 'status',
      event_code: eventCode,
      params: {},
      confidence: 90
    };
  } else if (command === 'CHECKIN') {
    const nameEndIndex = eventCode ? text.lastIndexOf(eventCode) : text.length;
    const name = text.substring('CHECKIN '.length, nameEndIndex).trim();

    return {
      command_type: 'checkin',
      event_code: eventCode,
      params: { contractor_name: name },
      confidence: 70
    };
  } else if (command === 'CANCEL') {
    return {
      command_type: 'cancel',
      event_code: eventCode,
      params: { message_type: parts[1] ? parts[1].toLowerCase() : 'all' },
      confidence: 80
    };
  } else if (command === 'HELP') {
    return {
      command_type: 'help',
      event_code: null,
      params: { specific_command: parts[1] ? parts[1].toLowerCase() : null },
      confidence: 100
    };
  }

  return {
    command_type: 'unknown',
    event_code: eventCode,
    params: {},
    confidence: 50
  };
}

/**
 * Verify admin authorization by phone number
 */
async function verifyAdminAuthorization(phone) {
  try {
    // Check if phone number belongs to an authorized admin
    const result = await query(`
      SELECT id, email, sms_admin_access
      FROM admin_users
      WHERE admin_phone = $1 AND sms_admin_access = true
    `, [phone]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('[AdminCommandHandler] Error verifying admin:', error);
    return false;
  }
}

/**
 * DELAY command - Delay all pending messages
 */
async function handleDelayCommand(smsData, parsedCommand) {
  const { event_code, params } = parsedCommand;
  const delayMinutes = params.minutes;

  if (!event_code) {
    return {
      success: false,
      action: 'send_message',
      messages: ['❌ Event code required. Format: DELAY [minutes] [EVENT_CODE]'],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  // Get event by SMS code
  const eventResult = await query(`
    SELECT id, event_name FROM events WHERE sms_event_code = $1
  `, [event_code]);

  if (eventResult.rows.length === 0) {
    return {
      success: false,
      action: 'send_message',
      messages: [`❌ Event ${event_code} not found. Reply STATUS to see active events.`],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  const event = eventResult.rows[0];

  // Update all pending messages
  const updateResult = await query(`
    UPDATE event_messages
    SET scheduled_time = scheduled_time + INTERVAL '${delayMinutes} minutes',
        delay_minutes = COALESCE(delay_minutes, 0) + $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE event_id = $2
      AND status = 'pending'
      AND scheduled_time > CURRENT_TIMESTAMP
    RETURNING id
  `, [delayMinutes, event.id]);

  const messagesDelayed = updateResult.rows.length;

  // Get next message time
  const nextMessageResult = await query(`
    SELECT scheduled_time, message_type
    FROM event_messages
    WHERE event_id = $1 AND status = 'pending'
    ORDER BY scheduled_time ASC LIMIT 1
  `, [event.id]);

  const nextMessage = nextMessageResult.rows.length > 0
    ? `⏰ Next: ${nextMessageResult.rows[0].message_type} at ${new Date(nextMessageResult.rows[0].scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : '⏰ No pending messages';

  const replyMessage = `✅ ${event_code}: All messages delayed by ${delayMinutes} min\n📊 ${messagesDelayed} messages updated\n${nextMessage}`;

  // Log admin command
  await logAdminCommand({
    phone: smsData.phone,
    event_id: event.id,
    event_code: event_code,
    command_type: 'delay',
    command_text: smsData.messageText,
    parsed_command: parsedCommand,
    success: true,
    response_message: replyMessage
  });

  return {
    success: true,
    action: 'send_message',
    messages: [replyMessage],
    phone: smsData.phone,
    message_type: 'admin_delay_success',
    response_sent: true,
    messages_delayed: messagesDelayed
  };
}

/**
 * MSG command - Send custom message to attendees
 */
async function handleMessageCommand(smsData, parsedCommand) {
  const { event_code, params } = parsedCommand;
  const { audience, message_content } = params;

  if (!event_code || !message_content) {
    return {
      success: false,
      action: 'send_message',
      messages: ['❌ Format: MSG [ALL|CHECKEDIN|PENDING] [EVENT_CODE]: [your message]'],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  // Get event
  const eventResult = await query(`
    SELECT id, event_name FROM events WHERE sms_event_code = $1
  `, [event_code]);

  if (eventResult.rows.length === 0) {
    return {
      success: false,
      action: 'send_message',
      messages: [`❌ Event ${event_code} not found`],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  const event = eventResult.rows[0];

  // Get target attendees based on audience
  let attendeesQuery = `
    SELECT ea.contractor_id, c.phone
    FROM event_attendees ea
    JOIN contractors c ON ea.contractor_id = c.id
    WHERE ea.event_id = $1
  `;

  if (audience === 'checkedin') {
    attendeesQuery += ' AND ea.check_in_time IS NOT NULL';
  } else if (audience === 'pending') {
    attendeesQuery += ' AND ea.check_in_time IS NULL';
  }

  const attendeesResult = await query(attendeesQuery, [event.id]);
  const attendeeCount = attendeesResult.rows.length;

  // Create message records for each attendee
  for (const attendee of attendeesResult.rows) {
    await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction,
        message_content, scheduled_time, status, created_at
      ) VALUES ($1, $2, 'admin_custom', 'outbound', $3, CURRENT_TIMESTAMP, 'pending', CURRENT_TIMESTAMP)
    `, [attendee.contractor_id, event.id, message_content]);
  }

  const replyMessage = `✅ ${event_code}: Message sent\n👥 ${attendeeCount} attendees notified\n📱 SMS delivery in progress`;

  await logAdminCommand({
    phone: smsData.phone,
    event_id: event.id,
    event_code: event_code,
    command_type: 'message',
    command_text: smsData.messageText,
    parsed_command: parsedCommand,
    success: true,
    response_message: replyMessage
  });

  return {
    success: true,
    action: 'send_message',
    messages: [replyMessage],
    phone: smsData.phone,
    message_type: 'admin_message_success',
    response_sent: true,
    attendees_notified: attendeeCount
  };
}

/**
 * STATUS command - Get event status
 */
async function handleStatusCommand(smsData, parsedCommand) {
  const { event_code } = parsedCommand;

  if (!event_code) {
    // Show all active events if no code provided
    const eventsResult = await query(`
      SELECT sms_event_code, event_name
      FROM events
      WHERE event_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY event_date ASC
      LIMIT 5
    `);

    const eventsList = eventsResult.rows.map(e => `• ${e.sms_event_code} - ${e.event_name}`).join('\n');
    const replyMessage = `📊 ACTIVE EVENTS:\n${eventsList}\n\nReply STATUS [CODE] for details`;

    return {
      success: true,
      action: 'send_message',
      messages: [replyMessage],
      phone: smsData.phone,
      message_type: 'admin_status_list'
    };
  }

  // Get specific event status
  const eventResult = await query(`
    SELECT id, event_name FROM events WHERE sms_event_code = $1
  `, [event_code]);

  if (eventResult.rows.length === 0) {
    return {
      success: false,
      action: 'send_message',
      messages: [`❌ Event ${event_code} not found`],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  const event = eventResult.rows[0];

  // Get attendee stats
  const attendeeStats = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(check_in_time) as checked_in,
      COUNT(*) - COUNT(check_in_time) as pending
    FROM event_attendees
    WHERE event_id = $1
  `, [event.id]);

  const stats = attendeeStats.rows[0];
  const checkinPercent = stats.total > 0 ? Math.round((stats.checked_in / stats.total) * 100) : 0;

  // Get message stats
  const messageStats = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM event_messages
    WHERE event_id = $1
  `, [event.id]);

  const msgStats = messageStats.rows[0];

  // Get next message
  const nextMsg = await query(`
    SELECT message_type, scheduled_time
    FROM event_messages
    WHERE event_id = $1 AND status = 'pending'
    ORDER BY scheduled_time ASC LIMIT 1
  `, [event.id]);

  const nextMessage = nextMsg.rows.length > 0
    ? `⏰ Next: ${nextMsg.rows[0].message_type} in ${getMinutesUntil(nextMsg.rows[0].scheduled_time)} min`
    : '⏰ No pending messages';

  const replyMessage = `📊 ${event_code} STATUS
👥 ${stats.checked_in}/${stats.total} checked in (${checkinPercent}%)
📨 ${msgStats.pending} pending messages
${nextMessage}`;

  await logAdminCommand({
    phone: smsData.phone,
    event_id: event.id,
    event_code: event_code,
    command_type: 'status',
    command_text: smsData.messageText,
    parsed_command: parsedCommand,
    success: true,
    response_message: replyMessage
  });

  return {
    success: true,
    action: 'send_message',
    messages: [replyMessage],
    phone: smsData.phone,
    message_type: 'admin_status_success'
  };
}

/**
 * CHECKIN command - Manual check-in
 */
async function handleCheckinCommand(smsData, parsedCommand) {
  const { event_code, params } = parsedCommand;
  const contractorName = params.contractor_name;

  if (!event_code || !contractorName) {
    return {
      success: false,
      action: 'send_message',
      messages: ['❌ Format: CHECKIN [contractor name] [EVENT_CODE]'],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  const message = `✅ Manual check-in command received for "${contractorName}" at ${event_code}. This feature will trigger the full check-in workflow in next phase.`;

  return {
    success: true,
    action: 'send_message',
    messages: [message],
    phone: smsData.phone,
    message_type: 'admin_checkin_pending'
  };
}

/**
 * CANCEL command - Cancel messages
 */
async function handleCancelCommand(smsData, parsedCommand) {
  const { event_code, params } = parsedCommand;
  const messageType = params.message_type;

  if (!event_code) {
    return {
      success: false,
      action: 'send_message',
      messages: ['❌ Format: CANCEL [message_type|ALL] [EVENT_CODE]'],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  const eventResult = await query(`
    SELECT id FROM events WHERE sms_event_code = $1
  `, [event_code]);

  if (eventResult.rows.length === 0) {
    return {
      success: false,
      action: 'send_message',
      messages: [`❌ Event ${event_code} not found`],
      phone: smsData.phone,
      message_type: 'admin_command_error'
    };
  }

  const event = eventResult.rows[0];

  let cancelQuery = `
    UPDATE event_messages
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE event_id = $1 AND status = 'pending'
  `;

  const queryParams = [event.id];

  if (messageType !== 'all') {
    cancelQuery += ' AND message_type = $2';
    queryParams.push(messageType);
  }

  cancelQuery += ' RETURNING id';

  const cancelResult = await query(cancelQuery, queryParams);
  const messagesCancelled = cancelResult.rows.length;

  const replyMessage = `✅ ${event_code}: ${messageType === 'all' ? 'All' : messageType} messages cancelled\n📊 ${messagesCancelled} messages cancelled`;

  await logAdminCommand({
    phone: smsData.phone,
    event_id: event.id,
    event_code: event_code,
    command_type: 'cancel',
    command_text: smsData.messageText,
    parsed_command: parsedCommand,
    success: true,
    response_message: replyMessage
  });

  return {
    success: true,
    action: 'send_message',
    messages: [replyMessage],
    phone: smsData.phone,
    message_type: 'admin_cancel_success',
    messages_cancelled: messagesCancelled
  };
}

/**
 * HELP command
 */
async function handleHelpCommand(smsData, parsedCommand) {
  const helpMessage = `📱 ADMIN COMMANDS:

DELAY [min] [code] - Delay messages
MSG [ALL|CHECKEDIN] [code]: [text] - Send message
STATUS [code] - Event status
CHECKIN [name] [code] - Manual check-in
CANCEL [type] [code] - Cancel messages

Reply HELP [command] for details`;

  return {
    success: true,
    action: 'send_message',
    messages: [helpMessage],
    phone: smsData.phone,
    message_type: 'admin_help'
  };
}

/**
 * Unknown command handler
 */
async function handleUnknownCommand(smsData, parsedCommand) {
  return {
    success: false,
    action: 'send_message',
    messages: [`❌ Unknown command. Reply HELP for command list.`],
    phone: smsData.phone,
    message_type: 'admin_unknown_command'
  };
}

/**
 * Log admin command
 */
async function logAdminCommand(commandData) {
  try {
    await query(`
      INSERT INTO admin_sms_commands (
        admin_phone, event_id, event_code, command_type,
        command_text, parsed_command, executed, success,
        response_message, executed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      commandData.phone,
      commandData.event_id,
      commandData.event_code,
      commandData.command_type,
      commandData.command_text,
      safeJsonStringify(commandData.parsed_command),
      commandData.success,
      commandData.response_message
    ]);

    console.log('[AdminCommandHandler] Admin command logged');
  } catch (error) {
    console.error('[AdminCommandHandler] Error logging admin command:', error);
  }
}

/**
 * Get minutes until timestamp
 */
function getMinutesUntil(timestamp) {
  const now = new Date();
  const target = new Date(timestamp);
  const diffMs = target - now;
  return Math.max(0, Math.round(diffMs / 60000));
}

module.exports = {
  handleAdminCommand
};
