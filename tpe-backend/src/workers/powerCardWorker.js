/**
 * PowerCard Worker
 * Processes quarterly PowerCard campaign generation and notification jobs
 */

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');

// Load environment variables (production-aware)
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', '..', envFile) });

const { query } = require('../config/database');
const powerCardService = require('../services/powerCardService');

// Redis connection for worker
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

/**
 * Get current quarter and year
 * @returns {Object} {quarter: 'Q1', year: 2025}
 */
function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  let quarter;
  if (month >= 0 && month <= 2) quarter = 'Q1';
  else if (month >= 3 && month <= 5) quarter = 'Q2';
  else if (month >= 6 && month <= 8) quarter = 'Q3';
  else quarter = 'Q4';

  return { quarter, year };
}

/**
 * Generate quarterly PowerCard campaigns for all active partners
 */
async function generateQuarterlyCampaigns(job) {
  const { manual_trigger, triggered_at } = job.data;

  console.log('[PowerCardWorker] 🚀 Starting quarterly campaign generation...');
  if (manual_trigger) {
    console.log(`[PowerCardWorker] Manual trigger at ${triggered_at}`);
  }

  try {
    // Get all active partners
    const partnersResult = await query(`
      SELECT id, company_name, is_active
      FROM strategic_partners
      WHERE is_active = true
      ORDER BY id
    `);

    const partners = partnersResult.rows;
    console.log(`[PowerCardWorker] Found ${partners.length} active partners`);

    if (partners.length === 0) {
      console.log('[PowerCardWorker] ⚠️  No active partners found');
      return {
        success: true,
        campaigns_created: 0,
        message: 'No active partners'
      };
    }

    const { quarter, year } = getCurrentQuarter();
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Process each partner
    for (const partner of partners) {
      try {
        console.log(`[PowerCardWorker] Processing ${partner.company_name} (ID: ${partner.id})...`);

        // Check if quarterly campaign already exists for this partner + quarter
        const existingResult = await query(`
          SELECT c.id, c.campaign_name
          FROM power_card_campaigns c
          JOIN power_card_recipients r ON r.campaign_id = c.id
          JOIN power_card_templates t ON t.id = r.template_id
          WHERE t.partner_id = $1
            AND c.quarter = $2
            AND c.year = $3
            AND c.campaign_name NOT LIKE '%Pre-Onboarding%'
          LIMIT 1
        `, [partner.id, quarter, year]);

        if (existingResult.rows.length > 0) {
          console.log(`[PowerCardWorker] ⚠️  Campaign already exists for ${partner.company_name} ${quarter} ${year}`);
          results.skipped.push({
            partner_id: partner.id,
            partner_name: partner.company_name,
            reason: 'Campaign already exists',
            existing_campaign: existingResult.rows[0].campaign_name
          });
          continue;
        }

        // Get or create template for partner
        let templateResult = await query(`
          SELECT id FROM power_card_templates
          WHERE partner_id = $1 AND partner_type = 'strategic_partner'
          ORDER BY id DESC
          LIMIT 1
        `, [partner.id]);

        let templateId;
        if (templateResult.rows.length === 0) {
          // Create standard quarterly template
          console.log(`[PowerCardWorker] Creating template for ${partner.company_name}...`);

          const templateData = {
            partner_id: partner.id,
            partner_type: 'strategic_partner',
            metric_1_name: 'Communication Quality',
            metric_1_question: 'How would you rate the quality and responsiveness of communication?',
            metric_1_type: 'rating',
            metric_2_name: 'Service Delivery',
            metric_2_question: 'How satisfied are you with the service delivery and execution?',
            metric_2_type: 'rating',
            metric_3_name: 'Value for Investment',
            metric_3_question: 'How would you rate the value you received for your investment?',
            metric_3_type: 'rating',
            include_satisfaction_score: true,
            include_recommendation_score: true,
            include_culture_questions: false
          };

          const template = await powerCardService.createTemplate(templateData);
          templateId = template.id;
        } else {
          templateId = templateResult.rows[0].id;
        }

        // Create quarterly campaign
        const now = new Date();
        const campaignData = {
          campaign_name: `${partner.company_name} Quarterly ${quarter} ${year}`,
          quarter,
          year,
          start_date: now,
          end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
          reminder_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
          status: 'active'
        };

        const campaign = await powerCardService.createCampaign(campaignData);
        console.log(`[PowerCardWorker] ✅ Campaign created: ${campaign.campaign_name} (ID: ${campaign.id})`);

        // Get partner's clients/customers for recipients
        // Note: This would be populated from partner data or CRM integration
        // For now, we'll skip adding recipients automatically
        // Admins can add recipients manually or via API

        console.log(`[PowerCardWorker] ℹ️  Campaign ${campaign.id} created without recipients (add via admin dashboard)`);

        results.successful.push({
          partner_id: partner.id,
          partner_name: partner.company_name,
          campaign_id: campaign.id,
          campaign_name: campaign.campaign_name
        });

      } catch (partnerError) {
        console.error(`[PowerCardWorker] ❌ Failed for ${partner.company_name}:`, partnerError.message);
        results.failed.push({
          partner_id: partner.id,
          partner_name: partner.company_name,
          error: partnerError.message
        });
      }
    }

    console.log('[PowerCardWorker] ✅ Quarterly campaign generation complete!');
    console.log(`[PowerCardWorker] Summary: ${results.successful.length} created, ${results.skipped.length} skipped, ${results.failed.length} failed`);

    return {
      success: true,
      quarter,
      year,
      campaigns_created: results.successful.length,
      campaigns_skipped: results.skipped.length,
      campaigns_failed: results.failed.length,
      results
    };

  } catch (error) {
    console.error('[PowerCardWorker] ❌ Quarterly campaign generation failed:', error);
    throw error;
  }
}

/**
 * Send campaign notifications (Email + SMS)
 */
async function sendCampaignNotifications(job) {
  const { campaign_id, partner_id, scheduled_time } = job.data;

  console.log(`[PowerCardWorker] 🚀 Sending notifications for campaign ${campaign_id}...`);
  if (scheduled_time) {
    console.log(`[PowerCardWorker] Scheduled: ${scheduled_time}, Actual: ${new Date().toISOString()}`);
  }

  try {
    const result = await powerCardService.sendCampaignNotifications(campaign_id, partner_id);

    console.log(`[PowerCardWorker] ✅ Notifications sent:`, {
      campaign_id,
      emails_sent: result.emailsSent,
      sms_sent: result.smsSent,
      total_recipients: result.totalRecipients
    });

    return {
      success: true,
      campaign_id,
      emails_sent: result.emailsSent,
      sms_sent: result.smsSent,
      total_recipients: result.totalRecipients,
      errors: result.communicationErrors
    };

  } catch (error) {
    console.error(`[PowerCardWorker] ❌ Failed to send notifications:`, error);
    throw error;
  }
}

/**
 * Process PowerCard job
 */
async function processPowerCardJob(job) {
  console.log(`[PowerCardWorker] 🚀 Processing ${job.name}`);

  try {
    let result;

    if (job.name === 'generate-quarterly-campaigns') {
      result = await generateQuarterlyCampaigns(job);
    } else if (job.name === 'send-campaign-notifications') {
      result = await sendCampaignNotifications(job);
    } else {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    console.log(`[PowerCardWorker] ✅ Job ${job.name} completed successfully`);
    return result;

  } catch (error) {
    console.error(`[PowerCardWorker] ❌ Job ${job.name} failed:`, error.message);
    throw error;
  }
}

// Create the worker
const powerCardWorker = new Worker('power-card', processPowerCardJob, {
  connection,
  concurrency: 2, // Process up to 2 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000 // Per second
  }
});

// Worker event listeners
powerCardWorker.on('completed', (job, result) => {
  console.log(`[PowerCardWorker] ✅ Job ${job.id} completed:`, result);
});

powerCardWorker.on('failed', (job, err) => {
  console.error(`[PowerCardWorker] ❌ Job ${job.id} failed:`, err.message);
});

powerCardWorker.on('error', (err) => {
  console.error('[PowerCardWorker] Worker error:', err);
});

console.log('[PowerCardWorker] 🚀 PowerCard Worker started and ready to process jobs');

module.exports = powerCardWorker;
