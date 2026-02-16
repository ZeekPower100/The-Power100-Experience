// DATABASE-CHECKED: power_move_checkins, power_moves columns verified on 2026-02-16
// ================================================================
// PowerMove Check-in Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Record weekly check-ins on active PowerMoves
// Uses: Direct database queries with member_id scoping
// Context: Inner Circle agent — tracks progress against 8-week plan
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');

const PowerMoveCheckinSchema = z.object({
  powerMoveId: z.number().int().positive().describe('PowerMove ID'),
  memberId: z.number().int().positive().describe('The Inner Circle member ID'),
  progressUpdate: z.string().describe('What the member shared about their progress'),
  currentValue: z.string().optional().describe('Updated metric value at check-in time'),
  blockers: z.string().optional().describe('Any obstacles the member mentioned'),
  wins: z.string().optional().describe('Successes or milestones hit'),
  aiCoachingResponse: z.string().describe('What you said/did in response to their update'),
  aiActionsTaken: z.array(z.object({
    type: z.string(),
    detail: z.string()
  })).optional().describe('Actions taken: emails sent, content recommended, etc.'),
  aiSentiment: z.enum(['on_track', 'falling_behind', 'ahead', 'needs_support'])
    .describe('Assessment of their progress this week'),
  checkinSource: z.enum(['concierge', 'member_initiated', 'heartbeat']).default('concierge')
    .describe('How this check-in was triggered')
});

async function powerMoveCheckinFunction({
  powerMoveId, memberId, progressUpdate, currentValue, blockers, wins,
  aiCoachingResponse, aiActionsTaken, aiSentiment, checkinSource
}) {
  console.log(`[PowerMove Check-in Tool] Recording check-in for PowerMove ${powerMoveId}, member ${memberId}`);

  try {
    // Verify PowerMove belongs to member and get start_date
    const pmResult = await query(
      'SELECT id, start_date, total_checkins, last_checkin_date, streak_weeks, action_steps FROM power_moves WHERE id = $1 AND member_id = $2 AND status IN (\'active\', \'in_progress\')',
      [powerMoveId, memberId]
    );

    if (pmResult.rows.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Active PowerMove not found or access denied'
      });
    }

    const pm = pmResult.rows[0];

    // Calculate week number (Week 0 = creation day)
    const startDate = new Date(pm.start_date);
    const now = new Date();
    const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceStart / 7);

    // Calculate streak: if last check-in was within 14 days, continue streak
    let newStreak = pm.streak_weeks || 0;
    if (pm.last_checkin_date) {
      const daysSinceLastCheckin = Math.floor((now - new Date(pm.last_checkin_date)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastCheckin <= 14) {
        newStreak += 1;
      } else {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1; // First check-in
    }

    // Insert check-in record
    const checkinResult = await query(`
      INSERT INTO power_move_checkins (
        power_move_id, member_id, week_number, checkin_source,
        progress_update, current_value, blockers, wins,
        ai_coaching_response, ai_actions_taken, ai_sentiment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, week_number, checkin_date
    `, [
      powerMoveId, memberId, weekNumber, checkinSource || 'concierge',
      progressUpdate, currentValue || null, blockers || null, wins || null,
      aiCoachingResponse, JSON.stringify(aiActionsTaken || []), aiSentiment
    ]);

    // Update power_moves tracking fields
    const updateFields = [
      'total_checkins = COALESCE(total_checkins, 0) + 1',
      'last_checkin_date = NOW()',
      `streak_weeks = ${newStreak}`
    ];

    if (currentValue) {
      updateFields.push(`current_value = '${currentValue.replace(/'/g, "''")}'`);
    }

    // If this is the first check-in (Week 0+), set status to in_progress
    if (pm.total_checkins === 0 || pm.total_checkins === null) {
      updateFields.push("status = 'in_progress'");
    }

    await query(
      `UPDATE power_moves SET ${updateFields.join(', ')} WHERE id = $1 AND member_id = $2`,
      [powerMoveId, memberId]
    );

    // Compare progress against action_steps for current week
    const actionSteps = pm.action_steps || [];
    const currentWeekAction = actionSteps.find(s => s.week === weekNumber);
    let planComparison = null;
    if (currentWeekAction) {
      planComparison = {
        weekNumber,
        plannedAction: currentWeekAction.action,
        plannedStatus: currentWeekAction.status,
        sentiment: aiSentiment
      };
    }

    const checkin = checkinResult.rows[0];
    console.log(`[PowerMove Check-in Tool] Recorded Week ${weekNumber} check-in (ID: ${checkin.id})`);

    return JSON.stringify({
      success: true,
      checkin: {
        id: checkin.id,
        weekNumber: checkin.week_number,
        date: checkin.checkin_date,
        sentiment: aiSentiment
      },
      powerMoveUpdate: {
        totalCheckins: (pm.total_checkins || 0) + 1,
        streakWeeks: newStreak,
        currentValue: currentValue || pm.current_value
      },
      planComparison,
      message: `Week ${weekNumber} check-in recorded. Streak: ${newStreak} week${newStreak !== 1 ? 's' : ''}.`
    });
  } catch (error) {
    console.error('[PowerMove Check-in Tool] Error:', error.message);
    return JSON.stringify({ success: false, error: error.message });
  }
}

const powerMoveCheckinTool = tool(
  powerMoveCheckinFunction,
  {
    name: 'power_move_checkin',
    description: `Record a weekly check-in on a member's active PowerMove.

Use this during weekly progress conversations to track what's happening,
capture wins, identify blockers, and record coaching actions taken.

The tool automatically:
- Calculates the week number from the PowerMove start date (Week 0 = creation day)
- Updates the check-in streak (consecutive weeks with a check-in)
- Compares progress against the 8-week action plan for the current week
- Updates the PowerMove's tracking fields (total_checkins, last_checkin_date, etc.)
- Sets PowerMove status to 'in_progress' on first check-in

IMPORTANT:
- Always provide aiCoachingResponse (what you told the member)
- Always provide aiSentiment (your assessment of their progress)
- All operations are member-scoped — cross-member access is impossible.`,
    schema: PowerMoveCheckinSchema
  }
);

module.exports = powerMoveCheckinTool;
