const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const crypto = require('crypto');
const eventOrchestratorAutomation = require('../services/eventOrchestratorAutomation');
const { triggerCheckInSMS, triggerMassSMS } = require('./n8nEventWebhookController');
const { sendPersonalizedAgenda } = require('../services/eventOrchestrator/emailScheduler');

/**
 * Event Check-In Controller
 * Handles attendee registration, check-in, and profile completion
 * Database fields must match EXACTLY as defined in EVENT-DATABASE-SCHEMA.md
 */

// Generate unique QR code for attendee
const generateQRCode = (eventId, contractorId) => {
  const data = `${eventId}-${contractorId}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
};

// Register attendee for an event
const registerAttendee = async (req, res, next) => {
  const { event_id, contractor_id, pre_filled_data } = req.body;

  try {
    // Check if already registered
    const existing = await query(
      'SELECT id FROM event_attendees WHERE event_id = $1 AND contractor_id = $2',
      [event_id, contractor_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Attendee already registered for this event'
      });
    }

    // Generate QR code
    const qr_code_data = generateQRCode(event_id, contractor_id);

    // Insert new attendee
    const result = await query(`
      INSERT INTO event_attendees (
        event_id,
        contractor_id,
        registration_date,
        profile_completion_status,
        pre_filled_data,
        qr_code_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, 'pending', $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [event_id, contractor_id, safeJsonStringify(pre_filled_data || {}), qr_code_data]);

    res.status(201).json({
      success: true,
      attendee: result.rows[0],
      qr_code: qr_code_data
    });
  } catch (error) {
    next(error);
  }
};

// Check in attendee (via QR code, manual, or mass trigger)
const checkInAttendee = async (req, res, next) => {
  const { event_id, contractor_id, check_in_method, qr_code_data } = req.body;

  try {
    let whereClause = 'event_id = $1';
    let params = [event_id];

    // Determine how to find the attendee
    if (qr_code_data) {
      whereClause += ' AND qr_code_data = $2';
      params.push(qr_code_data);
    } else if (contractor_id) {
      whereClause += ' AND contractor_id = $2';
      params.push(contractor_id);
    } else {
      throw new AppError('Either qr_code_data or contractor_id required', 400);
    }

    // Update check-in status
    const result = await query(`
      UPDATE event_attendees
      SET
        check_in_time = CURRENT_TIMESTAMP,
        check_in_method = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause} AND check_in_time IS NULL
      RETURNING *
    `, [...params, check_in_method || 'manual']);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attendee not found or already checked in'
      });
    }

    // Get contractor details for SMS trigger
    const contractor = await query(
      'SELECT CONCAT(first_name, \' \', last_name) as name, phone, email, company_name FROM contractors WHERE id = $1',
      [result.rows[0].contractor_id]
    );

    // Trigger n8n webhook for check-in SMS
    const attendeeData = result.rows[0];
    const contractorData = contractor.rows[0];
    await triggerCheckInSMS(attendeeData, contractorData);

    // 🤖 TRIGGER AI ORCHESTRATION - This is where the magic happens!
    try {
      console.log(`🎯 Triggering AI Orchestration for contractor ${attendeeData.contractor_id} at event ${attendeeData.event_id}`);

      // Run AI orchestration in background (don't block response)
      eventOrchestratorAutomation.orchestrateEventExperience(
        attendeeData.contractor_id,
        attendeeData.event_id
      ).then(recommendations => {
        console.log(`✅ AI Orchestration completed for contractor ${attendeeData.contractor_id}:`, {
          speakers: recommendations.speakers.length,
          sponsors: recommendations.sponsors.length,
          peers: recommendations.peers.length
        });
      }).catch(error => {
        console.error(`❌ AI Orchestration failed for contractor ${attendeeData.contractor_id}:`, error);
      });
    } catch (orchError) {
      console.error('Failed to trigger AI orchestration:', orchError);
      // Don't fail the check-in if orchestration fails
    }

    res.json({
      success: true,
      attendee: attendeeData,
      contractor: contractorData,
      trigger_sms: true, // Flag for SMS system
      ai_orchestration: 'triggered' // New flag to show AI is working
    });
  } catch (error) {
    next(error);
  }
};

// Mass check-in for stage coordination
const massCheckIn = async (req, res, next) => {
  const { event_id } = req.body;

  try {
    // Check in all registered attendees at once
    const result = await query(`
      UPDATE event_attendees
      SET
        check_in_time = CURRENT_TIMESTAMP,
        check_in_method = 'mass_trigger',
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1 AND check_in_time IS NULL
      RETURNING contractor_id
    `, [event_id]);

    // Get all contractor phone numbers for mass SMS
    const contractorIds = result.rows.map(r => r.contractor_id);
    const contractors = await query(
      'SELECT id, CONCAT(first_name, \' \', last_name) as name, phone, company_name FROM contractors WHERE id = ANY($1::int[])',
      [contractorIds]
    );

    // Trigger n8n webhook for mass SMS
    const messageTemplate = `Welcome to The Power100 Experience! 🎉 You're all checked in. Reply 'SAVE' to save our number for personalized event updates.`;
    // await triggerMassSMS(event_id, contractors.rows, messageTemplate, 'mass_check_in');

    // 🤖 TRIGGER AI ORCHESTRATION FOR ALL CHECKED-IN ATTENDEES
    console.log(`🎯 Mass AI Orchestration triggered for ${contractorIds.length} contractors at event ${event_id}`);

    // Process each contractor through AI orchestration (in background)
    contractorIds.forEach((contractor_id, index) => {
      // Stagger the processing slightly to avoid overwhelming the system
      setTimeout(() => {
        eventOrchestratorAutomation.orchestrateEventExperience(contractor_id, event_id)
          .then(recommendations => {
            console.log(`✅ AI Orchestration ${index + 1}/${contractorIds.length} completed for contractor ${contractor_id}`);
          })
          .catch(error => {
            console.error(`❌ AI Orchestration failed for contractor ${contractor_id}:`, error);
          });
      }, index * 100); // 100ms delay between each
    });

    res.json({
      success: true,
      checked_in_count: result.rows.length,
      contractors: contractors.rows,
      trigger_mass_sms: true,
      ai_orchestration: 'triggered_for_all' // New flag showing AI is processing all attendees
    });
  } catch (error) {
    next(error);
  }
};

// Complete event profile with real contact info
const completeProfile = async (req, res, next) => {
  const { eventId, contractorId, real_email, real_phone, custom_responses, sms_opt_in } = req.body;

  try {
    const result = await query(`
      UPDATE event_attendees
      SET
        profile_completion_status = 'completed',
        profile_completion_time = CURRENT_TIMESTAMP,
        real_email = $3,
        real_phone = $4,
        custom_responses = $5,
        sms_opt_in = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1 AND contractor_id = $2
      RETURNING *
    `, [
      eventId,
      contractorId,
      real_email || null,
      real_phone || null,
      safeJsonStringify(custom_responses || {}),
      sms_opt_in || false
    ]);

    if (result.rows.length === 0) {
      throw new AppError('Attendee not found', 404);
    }

    // 🎯 TRIGGER: Send personalized agenda after profile completion
    // Uses emailScheduler with HTML template - sends EMAIL with speaker/sponsor recommendations
    try {
      console.log(`[ProfileCompletion] Sending personalized agenda to contractor ${contractorId}`);

      // Send personalized agenda (non-blocking - don't wait for it)
      // emailScheduler.sendPersonalizedAgenda fetches speakers/sponsors and sends HTML email
      sendPersonalizedAgenda(eventId, contractorId, null)
        .then(() => {
          console.log(`[ProfileCompletion] ✅ Personalized agenda sent successfully to contractor ${contractorId}`);
        })
        .catch((err) => {
          console.error(`[ProfileCompletion] ❌ Error sending personalized agenda to contractor ${contractorId}:`, err);
        });
    } catch (agendaError) {
      // Don't fail the profile completion if agenda send fails
      console.error('[ProfileCompletion] Error sending personalized agenda (non-fatal):', agendaError);
    }

    res.json({
      success: true,
      profile: result.rows[0],
      unlock_features: true, // Enable personalized experience
      personalized_agenda_sent: true // Indicate agenda was triggered
    });
  } catch (error) {
    next(error);
  }
};

// Get specific attendee info
const getAttendeeInfo = async (req, res, next) => {
  const { eventId, contractorId } = req.query;

  try {
    if (!eventId || !contractorId) {
      throw new AppError('eventId and contractorId are required', 400);
    }

    const result = await query(`
      SELECT * FROM event_attendees
      WHERE event_id = $1 AND contractor_id = $2
    `, [eventId, contractorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attendee not found'
      });
    }

    res.json({
      success: true,
      attendee: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get all attendees for an event
const getEventAttendees = async (req, res, next) => {
  const { eventId } = req.params;
  const { checked_in_only } = req.query;

  try {
    let whereClause = 'ea.event_id = $1';
    if (checked_in_only === 'true') {
      whereClause += ' AND ea.check_in_time IS NOT NULL';
    }

    const result = await query(`
      SELECT
        ea.*,
        c.name as contractor_name,
        c.company_name,
        c.email as contractor_email,
        c.phone as contractor_phone
      FROM event_attendees ea
      JOIN contractors c ON ea.contractor_id = c.id
      WHERE ${whereClause}
      ORDER BY ea.check_in_time DESC NULLS LAST
    `, [eventId]);

    res.json({
      success: true,
      attendees: result.rows,
      total: result.rows.length,
      checked_in: result.rows.filter(a => a.check_in_time).length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAttendee,
  checkInAttendee,
  massCheckIn,
  completeProfile,
  getEventAttendees,
  getAttendeeInfo
};