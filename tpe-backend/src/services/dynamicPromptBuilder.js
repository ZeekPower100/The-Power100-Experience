/**
 * Dynamic Prompt Builder
 * Automatically formats ANY AI fields for OpenAI consumption
 */

const { safeJsonParse } = require('../utils/jsonHelpers');

class DynamicPromptBuilder {
  /**
   * Automatically build context from any entity with AI fields
   */
  buildEntityContext(entityName, data, metadata = {}) {
    if (!data || data.length === 0) return '';

    let context = `\n\n=== ${entityName.toUpperCase()} (${data.length} total) ===\n`;

    // Get AI fields from metadata if available
    const aiFields = metadata.aiFields || this.detectAIFields(data[0]);

    data.forEach((item, index) => {
      // Start with basic identification
      const title = item.title || item.name || item.company_name || `${entityName} #${item.id}`;
      context += `\n${index + 1}. **${title}**`;

      // Add author/host/owner if exists
      if (item.author) context += ` by ${item.author}`;
      if (item.host) context += ` hosted by ${item.host}`;

      // Automatically process ALL ai_ fields
      aiFields.forEach(field => {
        const value = item[field];
        if (!value) return;

        const fieldLabel = this.formatFieldName(field);

        // Handle different data types automatically based on actual field names
        if (field === 'ai_summary') {
          // AI summaries - show first 200 chars
          context += `\n   ${fieldLabel}: ${value.substring(0, 200)}...`;
        }
        else if (field === 'ai_insights' || field === 'key_differentiators' || field === 'ai_generated_differentiators') {
          // Arrays of insights/differentiators (JSONB in database)
          const items = Array.isArray(value) ? value : safeJsonParse(value, []);
          if (items.length > 0) {
            context += `\n   ${fieldLabel}:`;
            items.forEach(insight => {
              context += `\n   • ${insight}`;
            });
          }
        }
        else if (field === 'ai_tags') {
          // Tags (JSONB array in database)
          const tags = Array.isArray(value) ? value : safeJsonParse(value, []);
          if (tags.length > 0) {
            context += `\n   ${fieldLabel}: ${tags.join(', ')}`;
          }
        }
        else if (field === 'ai_confidence_score' || field === 'ai_quality_score') {
          // Numeric scores
          context += `\n   ${fieldLabel}: ${value}`;
        }
        else if (field === 'ai_processing_status') {
          // Skip internal status fields
          return;
        }
        else if (typeof value === 'object') {
          // Complex objects - stringify
          context += `\n   ${fieldLabel}: ${safeJsonParse(value, 'N/A')}`;
        }
        else {
          // Default - show as is
          context += `\n   ${fieldLabel}: ${value}`;
        }
      });

      // Add any non-AI important fields
      context = this.addImportantFields(item, entityName, context);

      context += '\n';
    });

    context += `=== END OF ${entityName.toUpperCase()} ===\n`;
    return context;
  }

  /**
   * Detect AI fields automatically
   */
  detectAIFields(sample) {
    if (!sample) return [];
    return Object.keys(sample).filter(key =>
      key.startsWith('ai_') ||
      key === 'key_differentiators' || // Partners: key_differentiators
      key === 'ai_generated_differentiators' // Partners: ai_generated_differentiators
    );
  }

  /**
   * Convert field names to readable labels
   */
  formatFieldName(field) {
    return field
      .replace(/^ai_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Add important non-AI fields based on entity type
   */
  addImportantFields(item, entityName, context) {
    // Add focus areas if present (different field names per entity)
    const focusField = item.focus_areas_covered || item.focus_areas_served;
    if (focusField) {
      const parsed = Array.isArray(focusField) ? focusField : safeJsonParse(focusField, []);
      if (parsed.length > 0) {
        const label = entityName === 'strategic_partners' ? 'Focus Areas Served' : 'Focus Areas';
        context = context + `\n   ${label}: ${parsed.join(', ')}`;
      }
    }

    // Add key takeaways for books
    if (entityName === 'books' && item.key_takeaways) {
      const takeaways = safeJsonParse(item.key_takeaways, item.key_takeaways);
      if (typeof takeaways === 'string') {
        context = context + `\n   Key Takeaways: ${takeaways.substring(0, 150)}`;
      } else if (Array.isArray(takeaways)) {
        context = context + `\n   Key Takeaways: ${takeaways.slice(0, 3).join(', ')}`;
      }
    }

    // Add PowerConfidence score for partners
    if (entityName === 'strategic_partners' && item.powerconfidence_score) {
      context = context + `\n   PowerConfidence Score: ${item.powerconfidence_score}`;
    }

    // Add event details (speakers and sponsors) for events with details
    if ((entityName === 'events' || entityName === 'eventsWithDetails') && (item.speakers || item.sponsor_details || item.registered_attendees)) {
      // Add speakers
      if (item.speakers && item.speakers.length > 0) {
        context = context + '\n   **Speakers:**';
        item.speakers.forEach(speaker => {
          context = context + `\n   • ${speaker.name}${speaker.title ? ` - ${speaker.title}` : ''}${speaker.company ? ` at ${speaker.company}` : ''}`;
          if (speaker.session_title) {
            context = context + `\n     Session: "${speaker.session_title}"`;
          }
        });
      }

      // Add sponsors
      if (item.sponsor_details && item.sponsor_details.length > 0) {
        context = context + '\n   **Sponsors:**';
        item.sponsor_details.forEach(sponsor => {
          context = context + `\n   • ${sponsor.sponsor_name}${sponsor.sponsor_tier ? ` (${sponsor.sponsor_tier} sponsor)` : ''}`;
          if (sponsor.booth_location) {
            context = context + ` - Booth ${sponsor.booth_location}`;
          }
        });
      }

      // Add attendee information
      if (item.registered_attendees > 0 || item.checked_in_attendees > 0) {
        context = context + '\n   **Registration Status:**';
        if (item.registered_attendees > 0) {
          context = context + `\n   • Registered: ${item.registered_attendees} attendees`;
        }
        if (item.checked_in_attendees > 0) {
          context = context + `\n   • Checked in: ${item.checked_in_attendees} attendees`;
        }
      }

      // Add notable attendees
      if (item.notable_attendees && item.notable_attendees.length > 0) {
        context = context + '\n   **Notable Registered Attendees:**';
        item.notable_attendees.forEach(attendee => {
          context = context + `\n   • ${attendee.name}${attendee.company ? ` from ${attendee.company}` : ''}`;
          if (attendee.checked_in) {
            context = context + ' (checked in)';
          }
        });
      }

      // Add date and location for events
      if (item.date) {
        context = context + `\n   Date: ${new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
      }
      if (item.location) {
        context = context + `\n   Location: ${item.location}`;
      }
    }

    return context;
  }

  /**
   * Build complete knowledge context from entire knowledge base
   */
  buildCompleteContext(knowledgeBase) {
    let fullContext = '';

    // Process each entity type in the knowledge base
    for (const [entityName, entityData] of Object.entries(knowledgeBase)) {
      // Skip metadata and non-entity fields
      if (entityName.startsWith('_') || !entityData?.data) continue;

      // Build context for this entity type
      const entityContext = this.buildEntityContext(
        entityName,
        entityData.data,
        entityData
      );

      fullContext += entityContext;
    }

    return fullContext;
  }

  /**
   * Generate AI instructions based on available entities
   */
  generateInstructions(knowledgeBase) {
    const entities = Object.keys(knowledgeBase).filter(k =>
      !k.startsWith('_') && knowledgeBase[k]?.data?.length > 0
    );

    let instructions = '\n\nWhen answering questions:\n';

    entities.forEach(entity => {
      const formatted = entity.replace(/_/g, ' ');
      instructions += `\n- For ${formatted}: Use the AI-analyzed fields provided above`;
      instructions += `\n  ALWAYS cite specific AI insights, summaries, and tags when available`;
      instructions += `\n  DO NOT make up generic information if AI analysis is provided`;
    });

    instructions += `\n\nThe data above includes our AI analysis. When users ask about any item listed above, `;
    instructions += `you MUST use the specific AI-generated insights, summaries, and other AI fields provided.`;

    return instructions;
  }
}

module.exports = new DynamicPromptBuilder();