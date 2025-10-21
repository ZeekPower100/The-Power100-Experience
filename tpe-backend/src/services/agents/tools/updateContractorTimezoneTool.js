const { query } = require('../../../config/database');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

/**
 * Update Contractor Timezone Tool
 * Allows AI to update a contractor's timezone when they confirm or correct it
 */

const updateContractorTimezoneTool = new DynamicStructuredTool({
  name: 'update_contractor_timezone',
  description: 'Update a contractor\'s timezone when they confirm or correct it. Use this after asking for timezone confirmation and receiving their response. ONLY call this if contractor explicitly confirms or corrects their timezone.',
  schema: z.object({
    contractor_id: z.number().describe('The ID of the contractor'),
    timezone: z.enum([
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles'
    ]).describe('The IANA timezone identifier. Options: America/New_York (Eastern), America/Chicago (Central), America/Denver (Mountain), America/Los_Angeles (Pacific)'),
    contractor_confirmation: z.string().describe('What the contractor said to confirm/correct (e.g., "Yes that\'s correct" or "Actually I\'m in Pacific Time")')
  }),
  func: async ({ contractor_id, timezone, contractor_confirmation }) => {
    try {
      console.log(`[UpdateTimezoneTool] Updating timezone for contractor ${contractor_id} to ${timezone}`);
      console.log(`[UpdateTimezoneTool] Contractor said: "${contractor_confirmation}"`);

      // Update contractor timezone
      const result = await query(
        'UPDATE contractors SET timezone = $1, updated_at = NOW() WHERE id = $2 RETURNING id, timezone',
        [timezone, contractor_id]
      );

      if (result.rows.length === 0) {
        return JSON.stringify({
          success: false,
          error: 'Contractor not found'
        });
      }

      const updated = result.rows[0];

      // Map timezone to friendly name
      const timezoneNames = {
        'America/New_York': 'Eastern Time',
        'America/Chicago': 'Central Time',
        'America/Denver': 'Mountain Time',
        'America/Los_Angeles': 'Pacific Time'
      };

      const friendlyName = timezoneNames[timezone] || timezone;

      console.log(`[UpdateTimezoneTool] ✅ Successfully updated contractor ${contractor_id} to ${friendlyName}`);

      return JSON.stringify({
        success: true,
        contractor_id: updated.id,
        timezone: updated.timezone,
        timezone_friendly: friendlyName,
        message: `Timezone updated to ${friendlyName}`
      });

    } catch (error) {
      console.error('[UpdateTimezoneTool] Error updating timezone:', error);
      return JSON.stringify({
        success: false,
        error: error.message
      });
    }
  }
});

module.exports = {
  updateContractorTimezoneTool
};
