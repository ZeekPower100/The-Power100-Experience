// DATABASE-CHECKED: expert_contributors columns verified on 2026-03-20
// DATABASE-CHECKED: companies, communications, account_notes, account_tasks, users, user_pillar_assignments verified on 2026-03-20
// ================================================================
// EC-DRC Integration Service
// ================================================================
// Purpose: Connects Expert Contributor events to the Rankings CRM (DRC)
// Creates tasks, notes, and communications for the assigned VP
// All operations are non-blocking — contributor flow is never affected
// ================================================================

const { query } = require('../config/database');
const rankingsDbService = require('./rankingsDbService');

const DEFAULT_REP_ID = 2; // Greg — fallback when no rep can be determined

// Full EC pipeline funnel (in order)
// Pre-signup stages (outreach → ec_pitch) are tracked in Rankings DB as comms/tasks on the company
// Post-signup stages (signup → active) are tracked here on the expert_contributors row
const PIPELINE_STAGES = [
  'outreach',           // VP reached out to CEO
  'production_call',    // Production call scheduled/completed
  'powerchat',          // PowerChat episode recorded
  'campaign',           // PowerChat episode campaign running
  'ec_pitch',           // EC program pitched to CEO
  'signup',             // CEO signed up (EC record created — DB default)
  'delegation_sent',    // Profile completion delegated to team
  'profile_complete',   // All profile info submitted
  'page_live',          // WordPress contributor page is live
  'active'              // Fully onboarded and active EC
];

/**
 * Helper: calculate a due date N days from now
 */
function dueInDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Helper: update EC pipeline fields in tpedb
 */
async function updateEcPipeline(contributorId, fields) {
  const sets = [];
  const params = [];
  let idx = 1;

  if (fields.rankings_company_id !== undefined) {
    sets.push(`rankings_company_id = $${idx++}`);
    params.push(fields.rankings_company_id);
  }
  if (fields.assigned_rep_id !== undefined) {
    sets.push(`assigned_rep_id = $${idx++}`);
    params.push(fields.assigned_rep_id);
  }
  if (fields.pipeline_stage !== undefined) {
    sets.push(`pipeline_stage = $${idx++}`);
    params.push(fields.pipeline_stage);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = NOW()`);
  params.push(contributorId);

  await query(
    `UPDATE expert_contributors SET ${sets.join(', ')} WHERE id = $${idx}`,
    params
  );
}

const ecDrcIntegration = {

  /**
   * Handle new EC signup — match company, assign rep, create DRC records
   * Called after createExpertContributor succeeds
   * @param {object} contributor - The newly created expert_contributors row
   */
  async handleSignup(contributor) {
    const label = `[EC-DRC Signup] ${contributor.first_name} ${contributor.last_name}`;
    console.log(`${label} Starting integration...`);

    // 1. Match company in rankings DB
    let companyId = null;
    let pillarId = null;
    const matches = await rankingsDbService.searchCompaniesByName(contributor.company);
    if (matches.length > 0) {
      companyId = matches[0].id;
      pillarId = matches[0].pillar_id;
      console.log(`${label} Company matched: "${matches[0].company_name}" (id:${companyId}, tier:${matches[0].match_tier})`);
    } else {
      console.log(`${label} No company match found for "${contributor.company}"`);
    }

    // 2. Assign rep (3-tier fallback)
    let repId = null;
    if (companyId) {
      repId = await rankingsDbService.getLastRepForCompany(companyId);
      if (repId) {
        console.log(`${label} Rep assigned from last activity: user_id=${repId}`);
      }
    }
    if (!repId && pillarId) {
      repId = await rankingsDbService.getRepByPillar(pillarId);
      if (repId) {
        console.log(`${label} Rep assigned from pillar: user_id=${repId}`);
      }
    }
    if (!repId) {
      repId = DEFAULT_REP_ID;
      console.log(`${label} Default rep assigned: user_id=${DEFAULT_REP_ID}`);
    }

    // 3. Determine pipeline stage
    const hasDelegation = contributor.delegated_to_email || contributor.onboarding_contact_email;
    const pipelineStage = hasDelegation ? 'delegation_sent' : 'signup';

    // 4. Store in tpedb
    await updateEcPipeline(contributor.id, {
      rankings_company_id: companyId,
      assigned_rep_id: repId,
      pipeline_stage: pipelineStage
    });

    // 5. Fire DRC actions if company matched (each action independent — one failure doesn't stop others)
    if (companyId) {
      const planLabel = (contributor.plan || 'individual').replace(/_/g, ' ');
      const fullName = `${contributor.first_name} ${contributor.last_name}`.trim();
      let drcCount = 0;

      // Communication log
      try {
        await rankingsDbService.logCommunication({
          company_id: companyId,
          user_id: repId,
          comm_type: 'note',
          direction: 'inbound',
          subject: `EC Signup: ${fullName}`,
          content: `Expert Contributor signup received. Plan: ${planLabel}. Company: ${contributor.company}. Email: ${contributor.email}. Source: ${contributor.source || 'presentation_page'}.`,
          status: 'completed',
          ai_generated: true,
          ai_summary: `New EC signup for ${fullName} (${planLabel})`
        });
        drcCount++;
      } catch (e) { console.error(`${label} Communication log failed:`, e.message); }

      // Account note
      try {
        await rankingsDbService.createAccountNote({
          company_id: companyId,
          user_id: repId,
          note_type: 'system',
          content: `EC Signup: ${fullName} (${planLabel}) — ${contributor.company}. ${hasDelegation ? 'Profile delegated to team.' : 'Awaiting profile completion.'}`,
          is_pinned: false
        });
        drcCount++;
      } catch (e) { console.error(`${label} Account note failed:`, e.message); }

      // Task Day 1: Welcome call
      try {
        await rankingsDbService.createAccountTask({
          company_id: companyId,
          user_id: repId,
          task_type: 'follow_up',
          title: `EC Welcome Call: ${fullName}`,
          description: `New Expert Contributor signed up (${planLabel}). Reach out to welcome them and confirm expectations. Email: ${contributor.email}. Phone: ${contributor.phone || 'N/A'}.`,
          priority: 'high',
          due_date: dueInDays(1),
          ai_generated: true,
          ai_reasoning: 'Auto-generated by EC-DRC integration on signup'
        });
        drcCount++;
      } catch (e) { console.error(`${label} Task Day 1 failed:`, e.message); }

      // Task Day 3: Check-in
      try {
        await rankingsDbService.createAccountTask({
          company_id: companyId,
          user_id: repId,
          task_type: 'follow_up',
          title: `EC Check-in: ${fullName}`,
          description: `Follow up on EC onboarding progress for ${fullName}. Ensure ${hasDelegation ? 'delegate has completed profile' : 'profile is being built'}.`,
          priority: 'medium',
          due_date: dueInDays(3),
          ai_generated: true,
          ai_reasoning: 'Auto-generated by EC-DRC integration on signup'
        });
        drcCount++;
      } catch (e) { console.error(`${label} Task Day 3 failed:`, e.message); }

      console.log(`${label} DRC actions: ${drcCount}/4 succeeded`);
    }
  },

  /**
   * Handle delegate profile completion
   * Called after completeDelegateProfile succeeds
   * @param {object} contributor - The updated expert_contributors row
   */
  async handleProfileComplete(contributor) {
    const label = `[EC-DRC ProfileComplete] ${contributor.first_name} ${contributor.last_name}`;
    console.log(`${label} Starting integration...`);

    // Guard: skip if already past this stage
    if (['profile_complete', 'page_live', 'active'].includes(contributor.pipeline_stage)) {
      console.log(`${label} Already at stage "${contributor.pipeline_stage}", skipping`);
      return;
    }

    const companyId = contributor.rankings_company_id;
    const repId = contributor.assigned_rep_id || DEFAULT_REP_ID;

    // Update pipeline stage
    await updateEcPipeline(contributor.id, { pipeline_stage: 'profile_complete' });

    if (!companyId) {
      console.log(`${label} No company linked, skipping DRC actions`);
      return;
    }

    const fullName = `${contributor.first_name} ${contributor.last_name}`.trim();
    let drcCount = 0;

    // Communication log
    try {
      await rankingsDbService.logCommunication({
        company_id: companyId,
        user_id: repId,
        comm_type: 'note',
        direction: 'inbound',
        subject: `EC Profile Complete: ${fullName}`,
        content: `Expert Contributor profile has been completed for ${fullName}. Ready for page build.`,
        status: 'completed',
        ai_generated: true,
        ai_summary: `EC profile completed for ${fullName}`
      });
      drcCount++;
    } catch (e) { console.error(`${label} Communication log failed:`, e.message); }

    // Account note
    try {
      await rankingsDbService.createAccountNote({
        company_id: companyId,
        user_id: repId,
        note_type: 'system',
        content: `Profile completed for ${fullName}. Ready for page build.`,
        is_pinned: false
      });
      drcCount++;
    } catch (e) { console.error(`${label} Account note failed:`, e.message); }

    // Task Day 1: Review profile
    try {
      await rankingsDbService.createAccountTask({
        company_id: companyId,
        user_id: repId,
        task_type: 'follow_up',
        title: `Review completed EC profile: ${fullName}`,
        description: `${fullName}'s EC profile is complete. Review the submitted content and confirm page build can proceed.`,
        priority: 'medium',
        due_date: dueInDays(1),
        ai_generated: true,
        ai_reasoning: 'Auto-generated by EC-DRC integration on profile completion'
      });
      drcCount++;
    } catch (e) { console.error(`${label} Task Day 1 failed:`, e.message); }

    // Task Day 7: Page status update
    try {
      await rankingsDbService.createAccountTask({
        company_id: companyId,
        user_id: repId,
        task_type: 'follow_up',
        title: `EC page status update: ${fullName}`,
        description: `Check on page build progress for ${fullName}. Provide status update to contributor if needed.`,
        priority: 'low',
        due_date: dueInDays(7),
        ai_generated: true,
        ai_reasoning: 'Auto-generated by EC-DRC integration on profile completion'
      });
      drcCount++;
    } catch (e) { console.error(`${label} Task Day 7 failed:`, e.message); }

    console.log(`${label} DRC actions: ${drcCount}/4 succeeded`);
  },

  /**
   * Handle EC page going live
   * Called from the page-live endpoint
   * @param {object} contributor - The expert_contributors row
   * @param {string} wpPageUrl - The live page URL
   */
  async handlePageLive(contributor, wpPageUrl) {
    const label = `[EC-DRC PageLive] ${contributor.first_name} ${contributor.last_name}`;
    console.log(`${label} Starting integration...`);

    const companyId = contributor.rankings_company_id;
    const repId = contributor.assigned_rep_id || DEFAULT_REP_ID;

    // Update pipeline stage and page URL
    await updateEcPipeline(contributor.id, { pipeline_stage: 'page_live' });

    if (!companyId) {
      console.log(`${label} No company linked, skipping DRC actions`);
      return;
    }

    const fullName = `${contributor.first_name} ${contributor.last_name}`.trim();
    let drcCount = 0;

    // Communication log
    try {
      await rankingsDbService.logCommunication({
        company_id: companyId,
        user_id: repId,
        comm_type: 'note',
        direction: 'outbound',
        subject: `EC Page Live: ${fullName}`,
        content: `Expert Contributor page is now live for ${fullName}. URL: ${wpPageUrl || 'pending'}`,
        status: 'completed',
        ai_generated: true,
        ai_summary: `EC page live for ${fullName}`
      });
      drcCount++;
    } catch (e) { console.error(`${label} Communication log failed:`, e.message); }

    // Account note
    try {
      await rankingsDbService.createAccountNote({
        company_id: companyId,
        user_id: repId,
        note_type: 'system',
        content: `EC page live at ${wpPageUrl || 'URL pending'}`,
        is_pinned: false
      });
      drcCount++;
    } catch (e) { console.error(`${label} Account note failed:`, e.message); }

    // Task Day 1: Notify contributor
    try {
      await rankingsDbService.createAccountTask({
        company_id: companyId,
        user_id: repId,
        task_type: 'follow_up',
        title: `Notify ${fullName} their EC page is live`,
        description: `The EC page for ${fullName} is now live at ${wpPageUrl || 'URL pending'}. Send a personal congratulations and share the link.`,
        priority: 'high',
        due_date: dueInDays(1),
        ai_generated: true,
        ai_reasoning: 'Auto-generated by EC-DRC integration on page go-live'
      });
      drcCount++;
    } catch (e) { console.error(`${label} Task Day 1 failed:`, e.message); }

    // Task Day 3: Final check-in
    try {
      await rankingsDbService.createAccountTask({
        company_id: companyId,
        user_id: repId,
        task_type: 'follow_up',
        title: `Final EC check-in: ${fullName}`,
        description: `Follow up with ${fullName} after page launch. Ensure they are happy with the page and discuss next steps (content, social sharing, etc).`,
        priority: 'medium',
        due_date: dueInDays(3),
        ai_generated: true,
        ai_reasoning: 'Auto-generated by EC-DRC integration on page go-live'
      });
      drcCount++;
    } catch (e) { console.error(`${label} Task Day 3 failed:`, e.message); }

    console.log(`${label} DRC actions: ${drcCount}/4 succeeded`);
  }
};

module.exports = ecDrcIntegration;
