// DATABASE-CHECKED: inner_circle_members columns verified on 2026-02-16
// ================================================================
// Update Member Profile Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Allow Inner Circle agent to update member profile fields
// Uses: memberScopedQuery service for data isolation
// Context: Inner Circle agent only — updates onboarding data,
//          coaching preferences, partner unlock status, etc.
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { updateMemberField, ALLOWED_PROFILE_FIELDS } = require('../../memberScopedQuery');

// Zod schema for input validation
const UpdateMemberProfileSchema = z.object({
  memberId: z.number().int().positive().describe('The Inner Circle member ID'),
  fieldName: z.string().describe(`Profile field to update. Allowed fields: ${ALLOWED_PROFILE_FIELDS.join(', ')}`),
  fieldValue: z.any().describe('New value for the field (string, number, boolean, or JSON object/array)')
});

/**
 * Update Member Profile Tool Function
 * Called by LangGraph agent to persist member data changes
 */
const updateMemberProfileFunction = async ({ memberId, fieldName, fieldValue }) => {
  console.log(`[Update Member Profile Tool] Updating ${fieldName} for member ${memberId}`);

  try {
    // memberScopedQuery.updateMemberField already validates against ALLOWED_PROFILE_FIELDS
    // and enforces member_id scoping
    const updatedRow = await updateMemberField(memberId, fieldName, fieldValue);

    if (!updatedRow) {
      return JSON.stringify({
        success: false,
        error: 'Member not found',
        memberId,
        fieldName
      });
    }

    console.log(`[Update Member Profile Tool] Successfully updated ${fieldName} for member ${memberId}`);

    return JSON.stringify({
      success: true,
      memberId,
      fieldName,
      message: `Updated ${fieldName} successfully`,
      updatedValue: updatedRow[fieldName]
    });
  } catch (error) {
    console.error('[Update Member Profile Tool] Error:', error.message);

    return JSON.stringify({
      success: false,
      error: error.message,
      memberId,
      fieldName
    });
  }
};

// Create the LangChain tool
const updateMemberProfileTool = tool(
  updateMemberProfileFunction,
  {
    name: 'update_member_profile',
    description: `Update an Inner Circle member's profile field.

Use this tool when:
- Member completes onboarding and you need to save their answers
- Member shares business info (revenue tier, team size, focus areas)
- Member creates a PowerMove (update power_moves_active count)
- Member should have partner recommendations unlocked (set partner_recommendation_unlocked = true)
- Member confirms coaching preferences
- You need to track engagement scores or session counts

Allowed fields: ${ALLOWED_PROFILE_FIELDS.join(', ')}

IMPORTANT:
- For JSON fields (onboarding_data, coaching_preferences, content_interactions, ai_tags, ai_insights, power_moves_history), pass a JSON object/array as the value.
- For boolean fields (onboarding_complete, partner_recommendation_unlocked, converted_to_contractor), pass true/false.
- For numeric fields (power_moves_completed, power_moves_active, total_concierge_sessions, ai_engagement_score), pass a number.
- All updates are scoped to the specific member — cross-member access is impossible.

Returns: JSON with success status and the updated value.`,
    schema: UpdateMemberProfileSchema
  }
);

module.exports = updateMemberProfileTool;
