/**
 * Event Agenda Controller
 *
 * Manages event agendas separately from event creation
 * ALL FIELD NAMES MATCH DATABASE EXACTLY (see EVENT-AGENDA-DATABASE-SCHEMA.md)
 */

const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Get agenda items for an event
 */
const getEventAgenda = async (req, res, next) => {
  const { event_id } = req.params;

  try {
    // Get all agenda items with optional speaker info
    const result = await query(`
      SELECT
        ai.*,
        es.name as speaker_name,
        es.title as speaker_title,
        es.company as speaker_company
      FROM event_agenda_items ai
      LEFT JOIN event_speakers es ON ai.speaker_id = es.id
      WHERE ai.event_id = $1
      ORDER BY ai.start_time, ai.track
    `, [event_id]);

    // Get event details including agenda_status
    const eventResult = await query(`
      SELECT name, date, agenda_status
      FROM events
      WHERE id = $1
    `, [event_id]);

    res.json({
      event: eventResult.rows[0],
      agenda_items: result.rows.map(item => ({
        ...item,
        focus_areas: safeJsonParse(item.focus_areas, []),
        target_audience: safeJsonParse(item.target_audience, []),
        key_takeaways: safeJsonParse(item.key_takeaways, []),
        ai_keywords: safeJsonParse(item.ai_keywords, [])
      }))
    });
  } catch (error) {
    console.error('Error fetching event agenda:', error);
    next(error);
  }
};

/**
 * Create a new agenda item
 */
const createAgendaItem = async (req, res, next) => {
  const {
    event_id,
    start_time,
    end_time,
    item_type,
    title,
    synopsis,
    key_takeaways,
    speaker_id,
    sponsor_id,
    description,
    location,
    track,
    capacity,
    focus_areas,
    target_audience,
    skill_level,
    is_mandatory,
    requires_registration,
    status,
    speaker_confirmed
  } = req.body;

  // Validate required fields
  if (!event_id || !start_time || !item_type || !title) {
    return res.status(400).json({
      error: 'Missing required fields: event_id, start_time, item_type, title'
    });
  }

  try {
    const result = await query(`
      INSERT INTO event_agenda_items (
        event_id,
        start_time,
        end_time,
        item_type,
        title,
        synopsis,
        key_takeaways,
        speaker_id,
        sponsor_id,
        description,
        location,
        track,
        capacity,
        focus_areas,
        target_audience,
        skill_level,
        is_mandatory,
        requires_registration,
        status,
        speaker_confirmed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      event_id,
      start_time,
      end_time,
      item_type,
      title,
      synopsis,
      safeJsonStringify(key_takeaways),
      speaker_id || null,
      sponsor_id || null,
      description,
      location,
      track,
      capacity,
      safeJsonStringify(focus_areas),
      safeJsonStringify(target_audience),
      skill_level,
      is_mandatory || false,
      requires_registration || false,
      status || 'scheduled',
      speaker_confirmed || false
    ]);

    // Update event agenda_status if it's the first item
    await updateEventAgendaStatus(event_id);

    res.status(201).json({
      success: true,
      agenda_item: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating agenda item:', error);
    next(error);
  }
};

/**
 * Update an agenda item
 */
const updateAgendaItem = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove id from updates if present
  delete updates.id;

  // Build dynamic update query
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // Handle JSONB fields
  if (updates.key_takeaways) {
    updates.key_takeaways = safeJsonStringify(updates.key_takeaways);
  }
  if (updates.focus_areas) {
    updates.focus_areas = safeJsonStringify(updates.focus_areas);
  }
  if (updates.target_audience) {
    updates.target_audience = safeJsonStringify(updates.target_audience);
  }
  if (updates.ai_keywords) {
    updates.ai_keywords = safeJsonStringify(updates.ai_keywords);
  }

  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  const values = [id, ...fields.map(field => updates[field])];

  try {
    const result = await query(`
      UPDATE event_agenda_items
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }

    res.json({
      success: true,
      agenda_item: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating agenda item:', error);
    next(error);
  }
};

/**
 * Delete an agenda item
 */
const deleteAgendaItem = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await query(`
      DELETE FROM event_agenda_items
      WHERE id = $1
      RETURNING event_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda item not found' });
    }

    // Update event agenda_status if needed
    await updateEventAgendaStatus(result.rows[0].event_id);

    res.json({
      success: true,
      message: 'Agenda item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agenda item:', error);
    next(error);
  }
};

/**
 * Bulk create agenda items (for importing)
 */
const bulkCreateAgendaItems = async (req, res, next) => {
  const { event_id, agenda_items } = req.body;

  if (!event_id || !Array.isArray(agenda_items) || agenda_items.length === 0) {
    return res.status(400).json({
      error: 'Invalid request: event_id and agenda_items array required'
    });
  }

  try {
    const createdItems = [];

    for (const item of agenda_items) {
      // Ensure required fields
      if (!item.start_time || !item.item_type || !item.title) {
        continue; // Skip invalid items
      }

      const result = await query(`
        INSERT INTO event_agenda_items (
          event_id,
          start_time,
          end_time,
          item_type,
          title,
          synopsis,
          location,
          speaker_id,
          focus_areas,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        event_id,
        item.start_time,
        item.end_time,
        item.item_type,
        item.title,
        item.synopsis,
        item.location,
        item.speaker_id || null,
        safeJsonStringify(item.focus_areas),
        item.status || 'tentative'
      ]);

      createdItems.push(result.rows[0]);
    }

    // Update event status
    await updateEventAgendaStatus(event_id);

    res.status(201).json({
      success: true,
      created_count: createdItems.length,
      agenda_items: createdItems
    });
  } catch (error) {
    console.error('Error bulk creating agenda items:', error);
    next(error);
  }
};

/**
 * Update event agenda status
 */
const updateEventAgendaStatus = async (event_id) => {
  try {
    // Check if there are any agenda items
    const count = await query(`
      SELECT COUNT(*) as count
      FROM event_agenda_items
      WHERE event_id = $1
    `, [event_id]);

    let newStatus = 'not_started';
    if (count.rows[0].count > 0) {
      // Check if any are confirmed
      const confirmed = await query(`
        SELECT COUNT(*) as count
        FROM event_agenda_items
        WHERE event_id = $1 AND status = 'confirmed'
      `, [event_id]);

      if (confirmed.rows[0].count === count.rows[0].count) {
        newStatus = 'confirmed';
      } else if (confirmed.rows[0].count > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'tentative';
      }
    }

    await query(`
      UPDATE events
      SET agenda_status = $1
      WHERE id = $2
    `, [newStatus, event_id]);

  } catch (error) {
    console.error('Error updating event agenda status:', error);
  }
};

/**
 * Confirm entire agenda (2 days before event)
 */
const confirmAgenda = async (req, res, next) => {
  const { event_id } = req.params;

  try {
    // Update all agenda items to confirmed
    await query(`
      UPDATE event_agenda_items
      SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1
    `, [event_id]);

    // Update event agenda_status
    await query(`
      UPDATE events
      SET agenda_status = 'confirmed'
      WHERE id = $1
    `, [event_id]);

    res.json({
      success: true,
      message: 'Agenda confirmed successfully'
    });
  } catch (error) {
    console.error('Error confirming agenda:', error);
    next(error);
  }
};

/**
 * Clone agenda from another event (template)
 */
const cloneAgenda = async (req, res, next) => {
  const { source_event_id, target_event_id, adjust_days } = req.body;

  if (!source_event_id || !target_event_id) {
    return res.status(400).json({
      error: 'Both source_event_id and target_event_id required'
    });
  }

  try {
    // Get source agenda
    const sourceItems = await query(`
      SELECT * FROM event_agenda_items
      WHERE event_id = $1
      ORDER BY start_time
    `, [source_event_id]);

    if (sourceItems.rows.length === 0) {
      return res.status(404).json({
        error: 'No agenda items found in source event'
      });
    }

    // Get target event date
    const targetEvent = await query(`
      SELECT date FROM events WHERE id = $1
    `, [target_event_id]);

    const targetDate = new Date(targetEvent.rows[0].date);
    const clonedItems = [];

    for (const item of sourceItems.rows) {
      // Adjust times if needed
      let newStartTime = item.start_time;
      let newEndTime = item.end_time;

      if (adjust_days && item.start_time) {
        const sourceTime = new Date(item.start_time);
        const timeOfDay = sourceTime.toTimeString().split(' ')[0];
        newStartTime = `${targetDate.toISOString().split('T')[0]}T${timeOfDay}`;

        if (item.end_time) {
          const endSourceTime = new Date(item.end_time);
          const endTimeOfDay = endSourceTime.toTimeString().split(' ')[0];
          newEndTime = `${targetDate.toISOString().split('T')[0]}T${endTimeOfDay}`;
        }
      }

      // Insert cloned item (without speaker assignments initially)
      const result = await query(`
        INSERT INTO event_agenda_items (
          event_id,
          start_time,
          end_time,
          item_type,
          title,
          synopsis,
          key_takeaways,
          description,
          location,
          track,
          capacity,
          focus_areas,
          target_audience,
          skill_level,
          is_mandatory,
          requires_registration,
          status
        )
        SELECT
          $1,
          $2,
          $3,
          item_type,
          title,
          synopsis,
          key_takeaways,
          description,
          location,
          track,
          capacity,
          focus_areas,
          target_audience,
          skill_level,
          is_mandatory,
          requires_registration,
          'tentative'
        FROM event_agenda_items
        WHERE id = $4
        RETURNING *
      `, [target_event_id, newStartTime, newEndTime, item.id]);

      clonedItems.push(result.rows[0]);
    }

    await updateEventAgendaStatus(target_event_id);

    res.json({
      success: true,
      cloned_count: clonedItems.length,
      agenda_items: clonedItems
    });
  } catch (error) {
    console.error('Error cloning agenda:', error);
    next(error);
  }
};

module.exports = {
  getEventAgenda,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  bulkCreateAgendaItems,
  confirmAgenda,
  cloneAgenda
};