// DATABASE-CHECKED: Tags verified on 2025-10-04
/**
 * GHL Tagging Service
 * Generates appropriate GHL tags based on message type and context
 */

/**
 * Get GHL tags for event messaging based on message type
 * @param {string} messageType - Type of message being sent
 * @param {object} context - Additional context (event, contractor info, etc.)
 * @returns {Array<string>} Array of tags to apply in GHL
 */
function getTagsForMessageType(messageType, context = {}) {
  // Base tags for all TPE contractors
  const baseTags = ['tpe-contractor', 'event-attendee'];

  // Message type specific tags
  const messageTypeTags = {
    // Event check-in and welcome
    'event_checkin': ['event-checked-in', 'active-attendee'],
    'event_welcome': ['event-welcome-sent', 'active-attendee'],

    // Speaker recommendations and responses
    'speaker_recommendation': ['speaker-rec-sent', 'engagement-speaker'],
    'speaker_details_response': ['speaker-interested', 'engagement-speaker'],
    'speaker_feedback_confirmation': ['speaker-feedback-given', 'engagement-speaker'],

    // Sponsor recommendations and responses
    'sponsor_recommendation': ['sponsor-rec-sent', 'engagement-sponsor'],
    'sponsor_details': ['sponsor-interested', 'engagement-sponsor'],
    'sponsor_talking_points': ['sponsor-engaged', 'engagement-sponsor'],

    // Peer matching
    'peer_matching_introduction': ['peer-match-sent', 'engagement-networking'],
    'peer_match_acceptance': ['peer-match-accepted', 'engagement-networking'],

    // PCR (Personal Connection Rating)
    'pcr_request': ['pcr-request-sent', 'feedback-requested'],
    'pcr_response': ['pcr-completed', 'feedback-given'],

    // General messaging
    'general': ['sms-engaged'],
    'clarification_needed': ['needs-clarification'],
    'error_handler': ['message-error']
  };

  // Get tags for this message type
  const typeTags = messageTypeTags[messageType] || [];

  // Add event-specific tags if event info provided
  const eventTags = [];
  if (context.event_id) {
    eventTags.push(`event-${context.event_id}`);
  }
  if (context.event_name) {
    const eventSlug = context.event_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    eventTags.push(`event-${eventSlug}`);
  }

  // Add stage tags if provided
  const stageTags = [];
  if (context.current_stage) {
    stageTags.push(`stage-${context.current_stage}`);
  }

  // Combine all tags
  return [...baseTags, ...typeTags, ...eventTags, ...stageTags];
}

/**
 * Get tags for contractor based on their profile
 * Used for initial upsert/sync operations
 */
function getTagsForContractor(contractor) {
  const tags = ['tpe-contractor', 'customer'];

  // Add stage tag
  if (contractor.current_stage) {
    tags.push(`stage-${contractor.current_stage}`);
  }

  // Add verification status
  if (contractor.verification_status === 'verified') {
    tags.push('verified');
  }

  // Add revenue tier if available
  if (contractor.revenue_tier) {
    tags.push(`revenue-${contractor.revenue_tier.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  }

  return tags;
}

/**
 * Get tags for partner based on their profile
 */
function getTagsForPartner(partner) {
  const tags = ['tpe-partner', 'strategic-partner', 'ceo'];

  // Add company tag
  if (partner.company_name) {
    const companySlug = partner.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    tags.push(`partner-${companySlug}`);
  }

  // Add service categories
  if (partner.service_categories && Array.isArray(partner.service_categories)) {
    partner.service_categories.forEach(category => {
      const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      tags.push(`service-${categorySlug}`);
    });
  }

  // Add approval status
  if (partner.approval_status === 'approved') {
    tags.push('approved-partner');
  }

  return tags;
}

module.exports = {
  getTagsForMessageType,
  getTagsForContractor,
  getTagsForPartner
};
