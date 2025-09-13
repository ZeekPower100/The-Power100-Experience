const ContractorEngagementEvents = require('../models/contractorEngagementEvents');

// Create new event
exports.create = async (req, res) => {
  try {
    const event = await ContractorEngagementEvents.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Batch create events
exports.batchCreate = async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, error: 'Events array required' });
    }
    const created = await ContractorEngagementEvents.createBatch(events);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error batch creating events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all events for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const events = await ContractorEngagementEvents.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get events by type
exports.getByEventType = async (req, res) => {
  try {
    const events = await ContractorEngagementEvents.findByEventType(
      req.params.contractorId,
      req.params.eventType
    );
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events by type:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get events by session
exports.getBySessionId = async (req, res) => {
  try {
    const events = await ContractorEngagementEvents.findBySessionId(req.params.sessionId);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching session events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single event
exports.getById = async (req, res) => {
  try {
    const event = await ContractorEngagementEvents.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get recent events
exports.getRecent = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await ContractorEngagementEvents.findRecent(req.params.contractorId, limit);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get event counts
exports.getEventCounts = async (req, res) => {
  try {
    const counts = await ContractorEngagementEvents.getEventCounts(req.params.contractorId);
    res.json({ success: true, data: counts });
  } catch (error) {
    console.error('Error fetching event counts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get engagement patterns
exports.getEngagementPatterns = async (req, res) => {
  try {
    const patterns = await ContractorEngagementEvents.getEngagementPatterns(req.params.contractorId);
    res.json({ success: true, data: patterns });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};