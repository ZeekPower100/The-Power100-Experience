// DATABASE-CHECKED: power_moves, inner_circle_members columns verified on 2026-02-16
// ================================================================
// Manage PowerMove Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Create, update, complete, and abandon PowerMoves
// Uses: Direct database queries with member_id scoping
// Context: Inner Circle agent — PowerMoves are 60-day fiscal milestones
//          created by the member, coached by the AI
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');

const ManagePowerMoveSchema = z.object({
  memberId: z.number().int().positive().describe('The Inner Circle member ID'),
  action: z.enum(['create', 'update', 'complete', 'abandon']).describe('Action to perform'),
  // For create
  title: z.string().optional().describe('PowerMove title (required for create)'),
  description: z.string().optional().describe('PowerMove description'),
  pillar: z.enum(['growth', 'culture', 'community', 'innovation']).optional()
    .describe('Which of the Four Pillars this PowerMove aligns to (required for create)'),
  fiscalTarget: z.string().optional().describe('The fiscal milestone statement'),
  fiscalMetric: z.string().optional().describe('What metric is being measured'),
  startingValue: z.string().optional().describe('Where they are now'),
  targetValue: z.string().optional().describe('Where they want to be'),
  actionSteps: z.array(z.object({
    week: z.number(),
    action: z.string(),
    status: z.string().default('pending')
  })).optional().describe('8-week action plan steps'),
  // For update
  powerMoveId: z.number().int().positive().optional()
    .describe('PowerMove ID (required for update/complete/abandon)'),
  currentValue: z.string().optional().describe('Updated metric value'),
  memberNotes: z.string().optional().describe('Member notes/reflections'),
  aiCoachingNotes: z.string().optional().describe('Concierge coaching observation to append'),
  aiSuggestedResources: z.array(z.object({
    type: z.string(),
    title: z.string(),
    id: z.number().optional()
  })).optional().describe('Content/partner suggestions to append'),
  // For complete
  completionEvidence: z.string().optional().describe('Proof or summary of completion'),
  completionReflection: z.string().optional().describe('Member reflection on the journey'),
  aiCompletionSummary: z.string().optional().describe('AI-generated journey summary (required for complete)'),
  // For abandon
  reason: z.string().optional().describe('Why they are stepping back')
});

async function managePowerMoveFunction({
  memberId, action, title, description, pillar, fiscalTarget, fiscalMetric,
  startingValue, targetValue, actionSteps, powerMoveId, currentValue,
  memberNotes, aiCoachingNotes, aiSuggestedResources,
  completionEvidence, completionReflection, aiCompletionSummary, reason
}) {
  console.log(`[Manage PowerMove Tool] ${action} for member ${memberId}`);

  try {
    if (action === 'create') {
      if (!title || !pillar) {
        return JSON.stringify({ success: false, error: 'title and pillar are required for create' });
      }

      // Calculate target_date (60 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 60);

      const result = await query(`
        INSERT INTO power_moves (
          member_id, title, description, pillar,
          fiscal_target, fiscal_metric, starting_value, target_value,
          action_steps, target_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
        RETURNING *
      `, [
        memberId, title, description || null, pillar,
        fiscalTarget || null, fiscalMetric || null,
        startingValue || null, targetValue || null,
        JSON.stringify(actionSteps || []),
        targetDate
      ]);

      const pm = result.rows[0];

      // Update member: append to power_moves_active
      await query(`
        UPDATE inner_circle_members
        SET power_moves_active = COALESCE(power_moves_active, '[]'::jsonb) || $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify([{ id: pm.id, title: pm.title, pillar: pm.pillar }]), memberId]);

      // Auto-unlock partner recommendations on first PowerMove
      const memberResult = await query(
        'SELECT partner_recommendation_unlocked FROM inner_circle_members WHERE id = $1',
        [memberId]
      );
      if (memberResult.rows[0] && !memberResult.rows[0].partner_recommendation_unlocked) {
        await query(
          'UPDATE inner_circle_members SET partner_recommendation_unlocked = true, updated_at = NOW() WHERE id = $1',
          [memberId]
        );
        console.log(`[Manage PowerMove Tool] Auto-unlocked partner recommendations for member ${memberId}`);
      }

      console.log(`[Manage PowerMove Tool] Created PowerMove ${pm.id} for member ${memberId}`);
      return JSON.stringify({
        success: true,
        action: 'create',
        powerMove: {
          id: pm.id,
          title: pm.title,
          pillar: pm.pillar,
          targetDate: pm.target_date,
          status: pm.status,
          actionSteps: pm.action_steps
        },
        partnerUnlocked: true,
        message: `PowerMove "${pm.title}" created! Target date: ${targetDate.toLocaleDateString()}`
      });
    }

    if (action === 'update') {
      if (!powerMoveId) {
        return JSON.stringify({ success: false, error: 'powerMoveId is required for update' });
      }

      // Verify ownership
      const check = await query(
        'SELECT id, ai_coaching_notes, ai_suggested_resources FROM power_moves WHERE id = $1 AND member_id = $2',
        [powerMoveId, memberId]
      );
      if (check.rows.length === 0) {
        return JSON.stringify({ success: false, error: 'PowerMove not found or access denied' });
      }

      const updates = [];
      const values = [];
      let paramIdx = 1;

      if (currentValue !== undefined) {
        updates.push(`current_value = $${paramIdx++}`);
        values.push(currentValue);
      }
      if (memberNotes !== undefined) {
        updates.push(`member_notes = $${paramIdx++}`);
        values.push(memberNotes);
      }
      if (actionSteps !== undefined) {
        updates.push(`action_steps = $${paramIdx++}`);
        values.push(JSON.stringify(actionSteps));
      }
      if (aiCoachingNotes !== undefined) {
        // Append to existing array
        const existing = check.rows[0].ai_coaching_notes || [];
        existing.push({ note: aiCoachingNotes, date: new Date().toISOString() });
        updates.push(`ai_coaching_notes = $${paramIdx++}`);
        values.push(JSON.stringify(existing));
      }
      if (aiSuggestedResources !== undefined) {
        const existing = check.rows[0].ai_suggested_resources || [];
        existing.push(...aiSuggestedResources.map(r => ({ ...r, suggestedAt: new Date().toISOString() })));
        updates.push(`ai_suggested_resources = $${paramIdx++}`);
        values.push(JSON.stringify(existing));
      }

      if (updates.length === 0) {
        return JSON.stringify({ success: false, error: 'No fields to update' });
      }

      values.push(powerMoveId, memberId);
      const result = await query(
        `UPDATE power_moves SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND member_id = $${paramIdx++} RETURNING id, title, current_value, status`,
        values
      );

      return JSON.stringify({
        success: true,
        action: 'update',
        powerMove: result.rows[0],
        message: 'PowerMove updated'
      });
    }

    if (action === 'complete') {
      if (!powerMoveId) {
        return JSON.stringify({ success: false, error: 'powerMoveId is required for complete' });
      }

      // Update power_moves status
      const result = await query(`
        UPDATE power_moves SET
          status = 'completed',
          completed_date = NOW(),
          completion_evidence = $3,
          completion_reflection = $4,
          ai_completion_summary = $5
        WHERE id = $1 AND member_id = $2
        RETURNING id, title, pillar
      `, [powerMoveId, memberId, completionEvidence || null, completionReflection || null, aiCompletionSummary || null]);

      if (result.rows.length === 0) {
        return JSON.stringify({ success: false, error: 'PowerMove not found or access denied' });
      }

      const pm = result.rows[0];

      // Increment power_moves_completed on member profile
      await query(`
        UPDATE inner_circle_members SET
          power_moves_completed = COALESCE(power_moves_completed, 0) + 1,
          power_moves_active = COALESCE(power_moves_active, '[]'::jsonb) - $1::text,
          power_moves_history = COALESCE(power_moves_history, '[]'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE id = $3
      `, [
        String(powerMoveId),
        JSON.stringify([{ id: pm.id, title: pm.title, pillar: pm.pillar, completedAt: new Date().toISOString() }]),
        memberId
      ]);

      console.log(`[Manage PowerMove Tool] Completed PowerMove ${pm.id} for member ${memberId}`);
      return JSON.stringify({
        success: true,
        action: 'complete',
        powerMove: pm,
        message: `PowerMove "${pm.title}" completed! Congratulations!`
      });
    }

    if (action === 'abandon') {
      if (!powerMoveId) {
        return JSON.stringify({ success: false, error: 'powerMoveId is required for abandon' });
      }

      const result = await query(`
        UPDATE power_moves SET
          status = 'abandoned',
          member_notes = COALESCE(member_notes, '') || $3
        WHERE id = $1 AND member_id = $2
        RETURNING id, title
      `, [powerMoveId, memberId, reason ? `\n[Abandoned] ${reason}` : '']);

      if (result.rows.length === 0) {
        return JSON.stringify({ success: false, error: 'PowerMove not found or access denied' });
      }

      // Remove from power_moves_active on member profile
      await query(`
        UPDATE inner_circle_members SET
          power_moves_active = COALESCE(power_moves_active, '[]'::jsonb) - $1::text,
          updated_at = NOW()
        WHERE id = $2
      `, [String(powerMoveId), memberId]);

      return JSON.stringify({
        success: true,
        action: 'abandon',
        powerMove: result.rows[0],
        message: 'PowerMove paused. Life happens — when you\'re ready, we\'ll set a new one.'
      });
    }

    return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('[Manage PowerMove Tool] Error:', error.message);
    return JSON.stringify({ success: false, error: error.message });
  }
}

const managePowerMoveTool = tool(
  managePowerMoveFunction,
  {
    name: 'manage_power_move',
    description: `Create, update, complete, or abandon a PowerMove for an Inner Circle member.

PowerMoves are 60-day fiscal milestones that the member creates. Use this when:
- Member wants to set a new goal (action: 'create')
- Member shares progress on a goal (action: 'update')
- Member has achieved their goal (action: 'complete')
- Member needs to step back from a goal (action: 'abandon')

On CREATE:
- Generates a 60-day target date automatically
- Auto-unlocks partner recommendations (first PowerMove triggers unlock)
- Appends to member's power_moves_active list
- Pass actionSteps with the 8-week action plan you generate

On COMPLETE:
- Increments power_moves_completed count on member profile
- Moves from active to history on member profile
- Records completion evidence and AI summary

IMPORTANT: All operations are member-scoped — cross-member access is impossible.`,
    schema: ManagePowerMoveSchema
  }
);

module.exports = managePowerMoveTool;
