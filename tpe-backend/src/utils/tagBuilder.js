/**
 * GHL Tag Builder Utility
 * Centralized tag generation for all communication types
 *
 * See: docs/systems/TAGGING-STRATEGY.md for complete tagging strategy
 *
 * Architecture: Backend generates ALL business tags, n8n adds routing tags only
 */

/**
 * Build tags array for GHL contact tagging
 *
 * @param {Object} options - Tag configuration
 * @param {string} options.category - 'report', 'powercard', 'event'
 * @param {string} options.type - 'executive', 'contractor', 'invite', 'registration', etc.
 * @param {string} options.recipient - 'partner', 'contractor', 'admin'
 * @param {string} options.channel - 'email', 'sms'
 * @param {string} options.quarter - 'Q1', 'Q2', 'Q3', 'Q4' (optional for events)
 * @param {number} options.year - 2025 (optional for events)
 * @param {string} options.status - 'sent', 'confirmed', 'completed'
 * @param {number} options.entityId - event ID, partner ID, etc. (optional)
 * @returns {Array} Tags array for n8nPayload
 *
 * @example
 * // Report tags
 * buildTags({
 *   category: 'report',
 *   type: 'executive',
 *   recipient: 'partner',
 *   channel: 'email',
 *   quarter: 'Q1',
 *   year: 2025,
 *   status: 'sent'
 * })
 * // Returns: ['report:executive', 'recipient:partner', 'status:sent', 'email', 'Q1-2025']
 *
 * @example
 * // Event tags
 * buildTags({
 *   category: 'event',
 *   type: 'registration',
 *   recipient: 'contractor',
 *   channel: 'email',
 *   status: 'confirmed',
 *   entityId: 123
 * })
 * // Returns: ['event:registration', 'recipient:contractor', 'status:confirmed', 'email', 'event:123']
 */
function buildTags(options) {
  const {
    category,        // 'report', 'powercard', 'event'
    type,            // 'executive', 'contractor', 'invite', 'registration', etc.
    recipient,       // 'partner', 'contractor', 'admin'
    channel,         // 'email', 'sms'
    quarter,         // 'Q1', 'Q2', 'Q3', 'Q4' (optional)
    year,            // 2025 (optional)
    status,          // 'sent', 'confirmed', 'completed'
    entityId         // event ID, partner ID, etc. (optional)
  } = options;

  const tags = [];

  // Core tags (always include)
  if (category && type) tags.push(`${category}:${type}`);
  if (recipient) tags.push(`recipient:${recipient}`);
  if (status) tags.push(`status:${status}`);

  // Channel tag
  if (channel) tags.push(channel);

  // Time period tag (for reports and PowerCard)
  if (quarter && year) tags.push(`${quarter}-${year}`);

  // Entity reference tags
  if (entityId && category === 'event') tags.push(`event:${entityId}`);
  if (entityId && category === 'powercard') tags.push(`partner:${entityId}`);

  return tags;
}

module.exports = {
  buildTags
};
