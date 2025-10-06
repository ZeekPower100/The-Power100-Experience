// Message Handler Registry for Event Orchestration
// Registers all SMS route handlers with the AI Router

const aiRouter = require('../aiRouter');

/**
 * Register all event orchestration handlers
 */
function registerAllHandlers() {
  console.log('[HandlerRegistry] Registering all message handlers...');

  // Import handlers
  const speakerHandlers = require('./speakerHandlers');

  // Register speaker handlers
  aiRouter.registerHandler('speaker_details', speakerHandlers.handleSpeakerDetails);
  aiRouter.registerHandler('speaker_feedback', speakerHandlers.handleSpeakerFeedback);

  // TODO: Register sponsor handlers
  // aiRouter.registerHandler('sponsor_details', sponsorHandlers.handleSponsorDetails);

  // TODO: Register PCR handlers
  // aiRouter.registerHandler('pcr_response', pcrHandlers.handlePCRResponse);

  // TODO: Register peer matching handlers
  // aiRouter.registerHandler('peer_match_response', peerMatchingHandlers.handleResponse);

  // TODO: Register check-in handlers
  // aiRouter.registerHandler('event_checkin', checkInHandlers.handleCheckIn);

  // Register fallback handlers
  aiRouter.registerHandler('clarification_needed', handleClarificationRequest);
  aiRouter.registerHandler('error_handler', handleError);

  console.log('[HandlerRegistry] All handlers registered successfully');
}

/**
 * Clarification request handler
 * Sends a message asking the user to clarify their intent
 */
async function handleClarificationRequest(smsData, classification) {
  console.log('[Handler] Clarification needed for message:', smsData.messageText);

  const message = `Hi ${smsData.contractor.name.split(' ')[0]}! I didn't quite understand your message. Could you clarify what you're looking for? You can ask about speakers, sponsors, or event details.`;

  // Send clarification message via outbound endpoint
  return {
    success: true,
    action: 'send_message',
    message,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'clarification_request',
    response_sent: true
  };
}

/**
 * Error handler
 * Sends a generic error message
 */
async function handleError(smsData, classification) {
  console.error('[Handler] Error in routing:', classification.ai_reasoning);

  const message = `Hi ${smsData.contractor.name.split(' ')[0]}! Sorry, we're experiencing a technical issue. Please try again in a moment or contact support if this persists.`;

  return {
    success: false,
    action: 'send_message',
    message,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'error_response',
    response_sent: true,
    error: classification.ai_reasoning
  };
}

module.exports = {
  registerAllHandlers
};
